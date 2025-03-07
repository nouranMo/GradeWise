import re
import language_tool_python
from spellchecker import SpellChecker
from transformers import pipeline
import torch
from PyPDF2 import PdfReader
import logging
from concurrent.futures import ThreadPoolExecutor
import functools
<<<<<<< HEAD
from business_value_evaluator import BusinessValueEvaluator
from contextlib import contextmanager
from functools import lru_cache

logger = logging.getLogger(__name__)

# Constants
CHUNK_SIZE = 5000
CACHE_SIZE = 128
MAX_WORKERS = 4

def async_operation(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future = executor.submit(func, *args, **kwargs)
            return future.result()
    return wrapper

@contextmanager
def pdf_reader(pdf_path: str):
    reader = None
    try:
        reader = PdfReader(pdf_path)
        yield reader
    finally:
        if reader:
            reader.stream.close()

class TextProcessor:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TextProcessor, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not TextProcessor._initialized:
            logger.info("Initializing TextProcessor")
            self._initialize_tools()
            self._initialize_model()
            TextProcessor._initialized = True
        
    def _initialize_tools(self):
        self.grammar_tool = language_tool_python.LanguageTool('en-US')
        self.spell_checker = SpellChecker()
        self.CUSTOM_TERMS = ['qanna', 'srs']
        self.business_value_evaluator = BusinessValueEvaluator()

    def _initialize_model(self):
        try:
            model_name = "sshleifer/distilbart-cnn-6-6"
            device = 0 if torch.cuda.is_available() else -1
            logger.info(f"Using device: {'GPU' if device == 0 else 'CPU'}")

            logger.info(f"Loading model: {model_name}")
            self.summarizer = pipeline(
                "summarization",
                model=model_name,
                device=device
            )
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.summarizer = None
            logger.warning("Using fallback text processing method")

    def __del__(self):
        try:
            if hasattr(self, 'grammar_tool'):
                self.grammar_tool.close()
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

    @staticmethod
    @lru_cache(maxsize=CACHE_SIZE)
    def strip_numbering(title: str) -> str:
        return re.sub(r'^\d+(\.\d+)*\s+', '', title).strip()

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        logger.info(f"Extracting text from PDF: {pdf_path}")
        try:
            with pdf_reader(pdf_path) as reader:
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            logger.debug(f"Extracted {len(text)} characters from PDF")
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise

    def process_text_chunk(self, chunk: str):
        """Process a single chunk of text."""
        sections, figures = [], []
        current_section = None

        lines = chunk.splitlines()
        for line in lines:
            section_match = re.match(r'^\d+(\.\d+)*\s+[A-Z]', line)
            figure_match = re.search(r'Figure\s+\d+[:.-]?', line, re.IGNORECASE)

            if section_match:
                if current_section:
                    sections.append(current_section)
                current_section = {
                    "title": self.strip_numbering(line.strip()),
                    "content": "",
                    "figures": []
                }
            elif figure_match and current_section:
                figure_caption = line.strip()
                figures.append(figure_caption)
                current_section["figures"].append(figure_caption)

            if current_section:
                current_section["content"] += line + "\n"

        if current_section:
            sections.append(current_section)

        return sections, figures

    def extract_sections_with_figures(self, text: str):
        """Process text in chunks for better memory management."""
        all_sections = []
        all_figures = []
        
        # Process text in chunks
        chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            chunk_results = list(executor.map(self.process_text_chunk, chunks))
        
        # Combine results
        for sections, figures in chunk_results:
            all_sections.extend(sections)
            all_figures.extend(figures)

        logger.info(f"Extracted {len(all_sections)} sections with {len(all_figures)} figures")
        return all_sections, all_figures

    @lru_cache(maxsize=CACHE_SIZE)
    def get_section_for_text(self, text: str, sections: tuple) -> str:
        """Cached version of section lookup."""
        for section in sections:
            if text in section:
                return section.splitlines()[0]
        return None

    def parse_document_sections(self, text: str):
        """Optimized parsing with chunk processing and section cap."""
        logger.info("Parsing document sections")
        segments = []
        MAX_SECTIONS = 40  # Add the cap here
        
        try:
            # Process in chunks
            chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
            current_segment = ""
            
            for chunk in chunks:
                lines = chunk.splitlines()
                for line in lines:
                    if re.match(r'^\d+(\.\d+)* [A-Z]', line):
                        if current_segment:
                            segments.append(current_segment.strip())
                            # Check if we've reached the maximum sections
                            if len(segments) >= MAX_SECTIONS:
                                logger.info(f"Reached maximum sections limit ({MAX_SECTIONS})")
                                return segments
                        current_segment = line + "\n"
                    else:
                        current_segment += line + "\n"

            # Add the last segment if we haven't reached the limit
            if current_segment and len(segments) < MAX_SECTIONS:
                segments.append(current_segment.strip())

            logger.info(f"Parsed {len(segments)} sections (capped at {MAX_SECTIONS})")
            return segments
        except Exception as e:
            logger.error(f"Error parsing document sections: {str(e)}")
            raise

    def parse_document_sections_with_pages(self, pdf_path: str):
        logger.info("Parsing document sections with page numbers")
        sections = []
        try:
            with pdf_reader(pdf_path) as reader:
                last_valid_section = None
                for page_num, page in enumerate(reader.pages, start=1):
                    text = page.extract_text()
                    has_text = bool(text.strip())

                    lines = text.splitlines() if text else []
                    for line in lines:
                        if re.match(r'^\d+(\.\d+)* [A-Z]', line):
                            section_title = self.strip_numbering(line.strip())
                            last_valid_section = section_title if has_text else last_valid_section
                            sections.append((section_title, page_num, has_text))

            logger.info(f"Identified {len(sections)} sections with page numbers")
            return sections
        except Exception as e:
            logger.error(f"Error parsing document sections with pages: {str(e)}")
            raise

    @async_operation
    def generate_section_scope(self, text: str):
        try:
            if self.summarizer is None:
                words = text.split()
                return ' '.join(words[:100]) + '...' if len(words) > 100 else text

            text_length = len(text.split())
            max_length = min(100, text_length)  # Cap at 100 or text length
            min_length = min(30, max_length - 1)

            summary = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )[0]['summary_text']

            return summary
        except Exception as e:
            logger.error(f"Error generating scope: {str(e)}")
            return text[:200] + '...' if len(text) > 200 else text

    @async_operation
    def check_spelling_and_grammar(self, text: str):
        try:
            # Split into chunks instead of truncating
            chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
            
            all_misspelled = {}
            all_grammar = []
            
            # Process chunks in parallel
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                chunk_futures = []
                for chunk in chunks:
                    future = executor.submit(self._process_chunk, chunk)
                    chunk_futures.append(future)
                
                # Collect results as they complete
                for future in chunk_futures:
                    misspelled, grammar = future.result()
                    all_misspelled.update(misspelled)
                    all_grammar.extend(grammar)

            logger.debug(f"Found {len(all_misspelled)} spelling issues and {len(all_grammar)} grammar issues")
            return all_misspelled, all_grammar

        except Exception as e:
            logger.error(f"Error in spelling/grammar check: {str(e)}")
            return {}, []

    def _process_chunk(self, chunk: str):
        """Process a single chunk of text"""
        try:
            # Clean text
            chunk = re.sub(r'(\w)- (\w)', r'\1\2', chunk)
            chunk = re.sub(r'(\w)-\s+(\w)', r'\1\2', chunk)
            clean_text = re.sub(r'[^\w\s\'-]', '', chunk)

            # Cache spell checking results
            @lru_cache(maxsize=1000)
            def check_word(word):
                return word.lower() in self.spell_checker.known([word.lower()])

            words = clean_text.split()
            misspelled = {
                word: self.spell_checker.correction(word)
                for word in words
                if not check_word(word)
                and word.lower() not in self.CUSTOM_TERMS 
                and not re.match(r"\w+'s$", word)
            }

            misspelled = {word: correction
                        for word, correction in misspelled.items()
                        if correction is not None and word.lower() not in self.CUSTOM_TERMS}

            # Add custom terms
            for term in self.CUSTOM_TERMS:
                if term in words:
                    misspelled[term] = term

            # Limit grammar checking to essential rules
            grammar_issues = [
                issue for issue in self.grammar_tool.check(chunk)
                if not issue.message.lower().startswith("possible spelling mistake")
                and issue.category in ['GRAMMAR', 'TYPOS', 'PUNCTUATION']
            ]

            grammar_suggestions = []
            for issue in grammar_issues[:5]:  # Limit suggestions per chunk
                grammar_suggestions.append({
                    "message": issue.message,
                    "context": issue.context[:100],  # Limit context length
                    "replacements": issue.replacements[:3]  # Limit number of replacements
                })

            return misspelled, grammar_suggestions

        except Exception as e:
            logger.error(f"Error processing chunk: {str(e)}")
            return {}, []

    @async_operation
    def evaluate_business_value(self, text: str):
        logger.info("Evaluating business value of text...")
        try:
            return self.business_value_evaluator.evaluate_business_value(text)
        except Exception as e:
            logger.error(f"Error evaluating business value: {str(e)}")
            raise