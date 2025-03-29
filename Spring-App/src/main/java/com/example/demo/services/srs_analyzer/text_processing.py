import re
# import language_tool_python  # Commented out for performance
from spellchecker import SpellChecker  # Re-enabled for quick spell checking
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
# Remove the import at module level to avoid circular dependency
# from image_processing import ImageProcessor

# Enable/disable spell checking
SPELLCHECK_ENABLED = True  # Now enabled by default

logger = logging.getLogger(__name__)

# Constants
CHUNK_SIZE = 5000
CACHE_SIZE = 128
MAX_WORKERS = 4

# List of figure types to extract
IMPORTANT_FIGURES = [
    "system overview", 
    "system context", 
    "use case", 
    "eerd", 
    "entity relationship", 
    "class diagram", 
    "gantt chart"
]

# Common technical words to ignore in spell checking
TECHNICAL_WORDS = {
    "api", "apis", "ui", "gui", "frontend", "backend", "http", "https", "url", "uri", 
    "json", "xml", "html", "css", "javascript", "js", "sql", "nosql", "db", "rdbms",
    "sdk", "api", "jwt", "oauth", "saml", "ssl", "tls", "smtp", "imap", "ftp", "sftp",
    "tcp", "udp", "ip", "dns", "dhcp", "lan", "wan", "vpn", "iot", "srs", "uml", "erd",
    "crud", "mvc", "mvvm", "orm", "acid", "rest", "graphql", "grpc", "websocket", "microservice",
    "kubernetes", "docker", "aws", "azure", "gcp", "ci", "cd", "devops", "saas", "paas", "iaas",
    "agile", "scrum", "kanban", "waterfall", "jira", "confluence"
}

# Initialize spell checker once with technical words
def get_spell_checker():
    spell = SpellChecker()
    # Add technical words to dictionary
    spell.word_frequency.load_words(TECHNICAL_WORDS)
    return spell

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
        """Perform a quick spelling check on the given text."""
        if not SPELLCHECK_ENABLED:
            logger.debug("Spelling and grammar checking disabled")
            return {
                'misspelled': {},
                'grammar_suggestions': []
            }
        
        logger.info("Performing quick spell check")
        try:
            # Initialize spell checker only once
            if not hasattr(self, 'spell_checker') or self.spell_checker is None:
                self.spell_checker = get_spell_checker()
            
            # Split text into words and check spelling
            words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
            
            # Limit to unique words for faster processing
            unique_words = set(words)
            
            # Only check words with length > 3 to avoid false positives on short words
            words_to_check = {word for word in unique_words if len(word) > 3}
            
            # Find misspelled words
            misspelled = self.spell_checker.unknown(words_to_check)
            
            # Get corrections
            corrections = {}
            for word in misspelled:
                corrections[word] = self.spell_checker.correction(word)
            
            logger.info(f"Quick spell check completed. Found {len(corrections)} potential misspellings")
            return {
                'misspelled': corrections,
                'grammar_suggestions': []  # No grammar check in quick mode
            }
        except Exception as e:
            logger.error(f"Error during quick spell check: {str(e)}")
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

    def _find_figures_in_sections(self, sections_dict):
        """Find all figures mentioned in the text and their location."""
        figures = {}
        
        # Regex patterns for figure captions - making this more robust
        figure_patterns = [
            r'Figure\s+\d+[\.:]?\s*([^\.]+)',  # Figure 1: Title
            r'Fig\.\s*\d+[\.:]?\s*([^\.]+)',    # Fig. 1: Title
            r'Figure\s+\d+[^a-zA-Z0-9]*([a-zA-Z].+?)\s*(?:\n|$)', # Figure 1 Title
            r'(?:FIGURE|Fig)[^a-zA-Z0-9]*\d+[^a-zA-Z0-9]*([a-zA-Z].+?)\s*(?:\n|$)', # FIGURE 1 Title
            r'\bEERD\b',   # Just "EERD" 
            r'\bEntity\s+Relationship\b',  # Entity Relationship
            r'\bUse\s+Case\b',  # Use Case
            r'\bClass\s+Diagram\b',  # Class Diagram
            r'\bGantt\s+Chart\b',  # Gantt Chart
            r'\bSystem\s+Overview\b',  # System Overview
            r'\bSystem\s+Context\b'  # System Context
        ]
        
        for section_title, content in sections_dict.items():
            # Store the section itself if it's a potential diagram section
            section_lower = section_title.lower()
            for important_term in IMPORTANT_FIGURES:
                if important_term in section_lower:
                    clean_title = self.strip_numbering(section_title)
                    if clean_title not in figures:
                        figures[clean_title] = {
                            'sections': [section_title],
                            'mentions': 1,
                            'is_section_title': True
                        }
                    break
            
            # Look for figure captions in content
            for pattern in figure_patterns:
                # Special case for single-word patterns
                if pattern.startswith(r'\b') and pattern.endswith(r'\b'):
                    term = pattern[2:-2]  # Extract the term between \b markers
                    if re.search(pattern, content, re.IGNORECASE):
                        if term not in figures:
                            figures[term] = {
                                'sections': [section_title],
                                'mentions': 1
                            }
                        else:
                            figures[term]['mentions'] += 1
                            if section_title not in figures[term]['sections']:
                                figures[term]['sections'].append(section_title)
                    continue
                
                # Regular pattern matching for multi-word patterns
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    if pattern.startswith(r'\b'):
                        # For the special case patterns that don't have capture groups
                        figure_caption = match.group(0).strip()
                    else:
                        figure_caption = match.group(1).strip() 
                    
                    if figure_caption not in figures:
                        figures[figure_caption] = {
                            'sections': [section_title],
                            'mentions': 1
                        }
                    else:
                        figures[figure_caption]['mentions'] += 1
                        if section_title not in figures[figure_caption]['sections']:
                            figures[figure_caption]['sections'].append(section_title)
        
        # Log all figures found for debugging
        logger.info(f"Found {len(figures)} potential figures in document")
        for fig_name, fig_info in figures.items():
            logger.info(f"Figure: '{fig_name}' mentioned {fig_info['mentions']} times in {len(fig_info['sections'])} sections")
        
        return figures

    def extract_figure_texts_from_sections(self, sections_dict, pdf_path):
        """
        Extract text from specific figures in the document and create scopes for similarity analysis.
        
        Args:
            sections_dict: Dictionary of sections {section_title: content}
            pdf_path: Path to the PDF file to extract images from
            
        Returns:
            Dictionary of figure scopes {figure_name: extracted_text_with_scope}
        """
        logger.info("Extracting text from important figures")
        
        # Import ImageProcessor here to avoid circular dependency
        from image_processing import ImageProcessor
        
        # Initialize image processor
        image_processor = ImageProcessor()
        figure_texts = {}
        
        # Map of standard figure names for better display
        figure_name_map = {
            "system overview": "System Overview",
            "system context": "System Context Diagram",
            "use case": "Use Case Diagram",
            "eerd": "EERD",
            "entity relationship": "Entity Relationship Diagram",
            "class diagram": "Class Diagram",
            "gantt chart": "Gantt Chart"
        }
        
        try:
            # Find all figures mentioned in the document
            all_figures = self._find_figures_in_sections(sections_dict)
            
            # Filter to only the figures we want to process - major optimization
            important_figures = {}
            for figure_name, figure_info in all_figures.items():
                figure_name_lower = figure_name.lower()
                is_important = any(
                    important_term in figure_name_lower 
                    for important_term in IMPORTANT_FIGURES
                )
                
                if is_important:
                    important_figures[figure_name] = figure_info
                    logger.info(f"Will process figure: {figure_name}")
            
            # If no important figures found, log details and try a more general approach
            if not important_figures:
                logger.warning("No important figures found with exact matching, trying broader matching")
                # Add generic figures by type
                for important_term in IMPORTANT_FIGURES:
                    important_figures[important_term] = {
                        'sections': ["Generic Section"],
                        'mentions': 1,
                        'generic': True
                    }
                    logger.info(f"Added generic figure type: {important_term}")
            
            # Extract only the images we need based on section context
            logger.info(f"Extracting images for {len(important_figures)} important diagrams")
            target_names = list(important_figures.keys())
            # Also include the important terms to ensure detection
            target_names.extend(IMPORTANT_FIGURES)
            logger.info(f"Target figure names: {target_names}")
            
            image_paths = image_processor.extract_images_from_pdf(pdf_path, 
                                                               target_figures=target_names)
            
            # Match images to figures
            for figure_name, figure_info in important_figures.items():
                logger.info(f"Processing figure: {figure_name}")
                
                # Find relevant images for this figure
                relevant_images = []
                for image_path in image_paths:
                    # Skip processing if we already have enough images for this figure
                    if len(relevant_images) >= 2:
                        break
                    
                    # Check if image belongs to a section that mentions this figure
                    is_relevant = False
                    
                    # If this is a generic figure, be more lenient in matching
                    if figure_info.get('generic', False):
                        # Check if path contains any part of the figure name
                        figure_parts = figure_name.split()
                        is_relevant = any(part.lower() in image_path.lower() for part in figure_parts)
                    else:
                        # Use stricter matching for normal figures
                        image_sections = figure_info.get('sections', [])
                        is_relevant = any(
                            section.lower() in image_path.lower() for section in image_sections
                        )
                    
                    if is_relevant:
                        relevant_images.append(image_path)
                        logger.info(f"Found relevant image for {figure_name}: {image_path}")
                
                # If no relevant images found, try a broader approach
                if not relevant_images:
                    logger.warning(f"No relevant images found for {figure_name}, using broader matching")
                    # Check for partial matches in image paths
                    figure_parts = figure_name.lower().split()
                    for image_path in image_paths:
                        for part in figure_parts:
                            if len(part) > 3 and part in image_path.lower():  # Only use parts with >3 chars
                                relevant_images.append(image_path)
                                logger.info(f"Found image with partial match for {figure_name}: {image_path}")
                                break
                        
                        if len(relevant_images) >= 2:
                            break
                
                # Only process the most relevant images for this figure
                texts = []
                for image_path in relevant_images:
                    # Extract text from image
                    image_text = image_processor.extract_text_from_image(image_path)
                    
                    if image_text.strip():
                        texts.append(image_text)
                
                # Combine all texts for this figure type
                if texts:
                    combined_text = "\n".join(texts)
                    
                    # Generate scope from combined text
                    figure_scope = self.generate_section_scope(combined_text)
                    
                    # Get a cleaner display name for this figure type
                    display_name = None
                    for key, mapped_name in figure_name_map.items():
                        if key in figure_name.lower():
                            display_name = mapped_name
                            break
                    
                    # If no specific match found, use a generic cleaned version
                    if not display_name:
                        # Use the figure name map for the IMPORTANT_FIGURES terms
                        for key, mapped_name in figure_name_map.items():
                            if key in figure_name.lower():
                                display_name = mapped_name
                                break
                        
                        # If still no match, use the figure name directly
                        if not display_name:
                            display_name = f"Figure: {figure_name}"
                    
                    # Store the scope with the display name
                    figure_texts[display_name] = figure_scope
                    logger.info(f"Added figure scope for {display_name}")
            
            return figure_texts
            
        except Exception as e:
            logger.error(f"Error extracting figure texts: {str(e)}")
            return {}