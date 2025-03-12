import re
# import language_tool_python  # Commented out for performance
# from spellchecker import SpellChecker  # Commented out for performance
from transformers import pipeline
import torch
from PyPDF2 import PdfReader
import logging
from concurrent.futures import ThreadPoolExecutor
import functools

from business_value_evaluator import BusinessValueEvaluator

from section_parser import SectionParser

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

        logger.info("Initializing TextProcessor")
        # Commenting out spelling and grammar tools
        # self.grammar_tool = language_tool_python.LanguageTool('en-US')
        # self.spell_checker = SpellChecker()
        # self.CUSTOM_TERMS = ['qanna', 'srs']

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

    def parse_document_sections(self, text):
        """Parse document into logical segments based on predefined sections."""
        logger.info("Parsing document sections")
        
        try:
            # Use SectionParser to get only the main sections
            sections_dict = SectionParser.parse_sections(text)
            
            # Convert dictionary to list format for compatibility
            segments = []
            for section_title, content in sections_dict.items():
                segment = f"{section_title}\n{content}"
                segments.append(segment)
                logger.debug(f"Added section: {section_title} with length: {len(segment)}")

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

    def generate_section_scope(self, text):
        """Generate a scope/summary for a section of text."""

        try:
            # If no summarizer available, use simple truncation
            if self.summarizer is None:
                words = text.split()
                return ' '.join(words[:100]) + '...' if len(words) > 100 else text


            # Clean and truncate text if too long
            text = text.strip()
            words = text.split()
            if len(words) > 1000:  # Truncate to avoid model sequence length issues
                text = ' '.join(words[:1000]) + '...'

            # Calculate appropriate lengths based on input
            text_length = len(text.split())
            max_length = min(100, text_length)  # Never longer than input
            min_length = min(30, max_length - 1)  # Ensure min < max

            if max_length < min_length:
                logger.warning(f"Text too short for summarization: {text_length} words")
                return text  # Return original text if too short

            summary = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                truncation=True
            )[0]['summary_text']

            return summary

        except Exception as e:
            logger.error(f"Error generating scope: {str(e)}")
            # Fallback to simple truncation
            return text[:500] + '...' if len(text) > 500 else text

    @async_operation

    def check_spelling_and_grammar(self, text):
        """Check spelling and grammar with limits."""
        logger.debug("Spelling and grammar checking disabled for performance")
        return {}, []  # Return empty results since checking is disabled

    @async_operation
    def evaluate_business_value(self, text):
        """
        Evaluate the business value of a given text.
        """
        logger.info("Evaluating business value of text...")
        try:
            return self.business_value_evaluator.evaluate_business_value(text)

        except Exception as e:
            logger.error(f"Error processing chunk: {str(e)}")
            return {}, []