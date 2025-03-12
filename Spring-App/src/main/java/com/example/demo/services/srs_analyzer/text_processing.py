import re
# import language_tool_python  # Commented out for performance
# from spellchecker import SpellChecker  # Commented out for performance
from transformers import pipeline
import torch
from PyPDF2 import PdfReader
import logging
from concurrent.futures import ThreadPoolExecutor
import functools
import google.generativeai as genai
from business_value_evaluator import BusinessValueEvaluator

from section_parser import SectionParser

from contextlib import contextmanager
from functools import lru_cache

# Disable spell checking by default
SPELLCHECK_ENABLED = False

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
        self.logger = logging.getLogger(__name__)
        # Spell checking disabled for performance
        self.grammar_tool = None
        self.spell_checker = None

        logger.info("Initializing TextProcessor")
        if not TextProcessor._initialized:
            logger.info("Initializing TextProcessor")
            # Removed spell checking initialization
            self._initialize_model()
            TextProcessor._initialized = True
        
    def _initialize_tools(self):
        # Spell checking disabled for performance
        pass

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
            
            return segments
        except Exception as e:
            logger.error(f"Error parsing document sections: {e}")
            return []

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
        """Generate a concise scope for a section of text."""
        try:
            # Truncate text to avoid model sequence length issues
            words = text.split()
            if len(words) > 1000:
                text = ' '.join(words[:1000])
                logger.warning("Text truncated to 1000 words for scope generation")
            
            # Calculate min and max length for summary
            text_length = len(text.split())
            max_length = min(text_length, 150)  # Cap at 150 words
            min_length = min(max_length - 50, max_length - 1)  # Ensure min < max
            
            if text_length < min_length:
                logger.debug("Text too short for summarization, returning original")
                return text

            # Generate summary using model
            model = genai.GenerativeModel('gemini-1.5-pro')
            prompt = f"Summarize this text concisely, focusing on key points: {text}"
            response = model.generate_content(prompt, generation_config={
                'max_output_tokens': max_length * 4,
                'temperature': 0.3,
                'top_p': 0.8,
                'top_k': 40
            })
            
            return response.text
        except Exception as e:
            logger.error(f"Error generating section scope: {e}")
            # Fallback: return truncated version of original text
            return ' '.join(text.split()[:150]) + '...'

    @async_operation
    def check_spelling_and_grammar(self, text):
        """Check spelling and grammar in the given text."""
        logger.debug("Spelling and grammar checking disabled for performance")
        return {
            'misspelled': {},
            'grammar_suggestions': []
        }

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