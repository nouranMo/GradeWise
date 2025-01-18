from transformers import pipeline
import language_tool_python
from spellchecker import SpellChecker
import re
from PyPDF2 import PdfReader
import logging
import torch
from concurrent.futures import ThreadPoolExecutor
import functools

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
        self.grammar_tool = language_tool_python.LanguageTool('en-US')
        self.spell_checker = SpellChecker()
        self.CUSTOM_TERMS = ['qanna', 'srs']
        
        try:
            # Use a smaller, public model
            model_name = "sshleifer/distilbart-cnn-6-6"  # Changed model
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
            # Fallback to basic text processing if model fails
            self.summarizer = None
            logger.warning("Using fallback text processing method")

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

    def parse_document_sections(self, text):
        """Parse document into logical segments based on sections."""
        logger.info("Parsing document sections")
        segments = []
        current_segment = ""
        
        try:
            lines = text.splitlines()
            for line in lines:
                if re.match(r'^\d+(\.\d+)* [A-Z]', line):  # New section/subsection
                    if current_segment:
                        segments.append(current_segment.strip())
                        logger.debug(f"Added segment of length: {len(current_segment)}")
                    current_segment = line + "\n"
                else:
                    current_segment += line + "\n"
            
            if current_segment:
                segments.append(current_segment.strip())
            
            logger.info(f"Parsed {len(segments)} sections")
            return segments
        except Exception as e:
            logger.error(f"Error parsing document sections: {str(e)}")
            raise

    @async_operation
    def generate_section_scope(self, text):
        try:
            if self.summarizer is None:
                words = text.split()
                return ' '.join(words[:100]) + '...' if len(words) > 100 else text

            max_length = min(100, len(text.split()))  # Adjust based on input length
            min_length = max(30, int(max_length * 0.5))  # Set min_length proportionally

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
    def check_spelling_and_grammar(self, text):
        """Check spelling and grammar with limits."""
        try:
            # Limit text length for performance
            MAX_LENGTH = 5000
            if len(text) > MAX_LENGTH:
                text = text[:MAX_LENGTH]

            # Join split words with a hyphen 
            text = re.sub(r'(\w)- (\w)', r'\1\2', text)  
            text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)  
            clean_text = re.sub(r'[^\w\s\'-]', '', text)
        
            words = clean_text.split()
            misspelled = self.spell_checker.unknown(words)

            misspelled = {
                word: self.spell_checker.correction(word) 
                for word in words 
                if word.lower() not in self.CUSTOM_TERMS and not re.match(r"\w+'s$", word)
                and word in self.spell_checker.unknown([word])
            }
            
            misspelled = {word: self.spell_checker.correction(word) 
                         for word in misspelled 
                         if word.lower() not in self.CUSTOM_TERMS}
            
            for term in self.CUSTOM_TERMS:
                if term in words:
                    misspelled[term] = term
            
            misspelled = {word: correction 
                         for word, correction in misspelled.items() 
                         if correction is not None}

            grammar_issues = self.grammar_tool.check(text)
            grammar_suggestions = []
            for issue in grammar_issues:
                if issue.message.lower().startswith("possible spelling mistake found"):
                    continue

                issue_text = issue.context
                related_word = next((word for word in misspelled if word in issue_text), None)
                if not related_word:
                    grammar_suggestions.append({
                        "message": issue.message,
                        "context": issue_text,
                        "replacements": issue.replacements
                    })
            
            logger.debug(f"Found {len(misspelled)} spelling issues and {len(grammar_suggestions)} grammar issues")
            return misspelled, grammar_suggestions
        
        except Exception as e:
            logger.error(f"Error in spelling/grammar check: {str(e)}")
            return {}, [] 