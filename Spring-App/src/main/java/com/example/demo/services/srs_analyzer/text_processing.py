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

logger = logging.getLogger(__name__)

def async_operation(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with ThreadPoolExecutor() as executor:
            future = executor.submit(func, *args, **kwargs)
            return future.result()
    return wrapper


class TextProcessor:
    def __init__(self):
        logger.info("Initializing TextProcessor")
        # Commenting out spelling and grammar tools
        # self.grammar_tool = language_tool_python.LanguageTool('en-US')
        # self.spell_checker = SpellChecker()
        # self.CUSTOM_TERMS = ['qanna', 'srs']
        self.business_value_evaluator = BusinessValueEvaluator()

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

    @staticmethod
    def strip_numbering(title: str) -> str:
        """Remove numbering from a section title (e.g., '1.2 Title' -> 'Title')."""
        return re.sub(r'^\d+(\.\d+)*\s+', '', title).strip()

    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF file."""
        logger.info(f"Extracting text from PDF: {pdf_path}")
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            logger.debug(f"Extracted {len(text)} characters from PDF")
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise

    def extract_sections_with_figures(self, text):
        """
        Extract sections and associate them with figure captions.
        Returns a list of dictionaries with section title, content, and figure positions.
        """
        logger.info("Extracting sections with figure captions")
        sections = []
        figures = []
        current_section = None

        lines = text.splitlines()
        for line in lines:
            section_match = re.match(r'^\d+(\.\d+)*\s+[A-Z]', line)  # Detect section titles
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

        logger.info(f"Extracted {len(sections)} sections with {len(figures)} figures")
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

            logger.info(f"Parsed {len(segments)} sections")
            return segments
            
        except Exception as e:
            logger.error(f"Error parsing document sections: {str(e)}")
            raise

    def get_section_for_text(self, text, sections):
        """Helper function to find which section a given piece of text belongs to."""
        for section in sections:
            if text in section:
                return section.splitlines()[0]  # Return the section title
        return None

    def parse_document_sections_with_pages(self, pdf_path):
        """Parse sections and associate them with page numbers."""
        logger.info("Parsing document sections with page numbers")
        sections = []
        try:
            reader = PdfReader(pdf_path)
            last_valid_section = None

            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                has_text = bool(text.strip())  # Check if the page has meaningful text

                lines = text.splitlines() if text else []
                for line in lines:
                    if re.match(r'^\d+(\.\d+)* [A-Z]', line):  # Section/subsection pattern
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
            logger.error(f"Error evaluating business value: {str(e)}")
            raise    