import re
# import language_tool_python  # Commented out for performance
from spellchecker import SpellChecker  # Re-enabled for quick spell checking
from transformers import pipeline
import torch
from PyPDF2 import PdfReader
import logging
from concurrent.futures import ThreadPoolExecutor
import functools
import openai
from business_value_evaluator import BusinessValueEvaluator
from section_parser import SectionParser
from contextlib import contextmanager
from functools import lru_cache
from typing import List, Dict
import fitz  # PyMuPDF for PDF processing
import io
import base64
from PIL import Image
import PyPDF2

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
            # Add more debug logging
            logger.info(f"Document length: {len(text)} characters")
            
            # Check if text is empty or too short
            if not text or len(text) < 100:
                logger.warning("Document text is too short or empty")
                return []
            
            # Use SectionParser to get only the main sections for SRS documents
            sections_dict = SectionParser.parse_sections_content_analysis(text)
            
            # Log the sections found
            logger.info(f"Found {len(sections_dict)} sections in the document")
            for section_title in sections_dict.keys():
                logger.info(f"Found section: {section_title}")
            
            # Convert dictionary to list format for compatibility
            segments = []
            for section_title, content in sections_dict.items():
                segment = f"{section_title}\n{content}"
                segments.append(segment)
                logger.debug(f"Added section: {section_title} with length: {len(segment)}")
            
            return segments
        except Exception as e:
            logger.error(f"Error parsing document sections: {e}", exc_info=True)
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

            # Generate summary using updated OpenAI API
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "user",
                        "content": f"Summarize this text concisely, focusing on key points: {text}"
                    }
                ],
                max_tokens=max_length * 4,
                temperature=0.3
            )
            
            return response.choices[0].message.content
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

    def create_system_scope(self, text: str) -> str:
        """Create a system scope from text content using OpenAI."""
        try:
            # Clean and normalize the text
            cleaned_text = self.clean_text(text)
            
            # Truncate text if too long
            if len(cleaned_text.split()) > 1000:
                cleaned_text = ' '.join(cleaned_text.split()[:1000])
            
            # Generate system scope using OpenAI
            prompt = f"""Create a concise system scope from this text that includes:
            1. Main system purpose
            2. Key components
            3. Core functionalities
            4. Important relationships
            
            Text to analyze:
            {cleaned_text}
            
            Format the response as a clear, structured system scope."""
            
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a technical document analyzer. Create clear, structured system scopes."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error creating system scope: {str(e)}")
            return text  # Return original text if processing fails

    def create_diagram_scope(self, diagram_result: dict) -> str:
        """Create a system scope from diagram analysis results."""
        try:
            scope_elements = []
            
            # Extract diagram type and components
            if 'diagram_type' in diagram_result:
                scope_elements.append(f"Diagram Type: {diagram_result['diagram_type']}")
            
            # Extract components and their relationships
            if 'components' in diagram_result:
                components = diagram_result['components']
                scope_elements.append("Components:")
                for comp in components:
                    if isinstance(comp, dict):
                        comp_text = f"- {comp.get('type', 'Unknown')}: {comp.get('label', '')}"
                        if 'attributes' in comp:
                            comp_text += f" ({', '.join(comp['attributes'])})"
                        scope_elements.append(comp_text)
            
            # Extract relationships
            if 'relationships' in diagram_result:
                relationships = diagram_result['relationships']
                scope_elements.append("Relationships:")
                for rel in relationships:
                    if isinstance(rel, dict):
                        rel_text = f"- {rel.get('type', 'Unknown')}: {rel.get('from', '')} → {rel.get('to', '')}"
                        scope_elements.append(rel_text)
            
            # Create the final scope
            diagram_scope = "\n".join(scope_elements)
            
            return diagram_scope
            
        except Exception as e:
            logger.error(f"Error creating diagram scope: {str(e)}")
            return "Error processing diagram"

    def extract_diagrams_from_pdf(self, pdf_path):
        """
        Extract and analyze diagrams from the PDF using OpenAI's vision model.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary of diagram scopes {diagram_name: system_scope}
        """
        logger.info("Extracting and analyzing diagrams from PDF")
        
        # Import ImageProcessor here to avoid circular dependency
        from image_processing import ImageProcessor
        
        # Initialize image processor
        image_processor = ImageProcessor()
        diagram_scopes = {}
        
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
            # First, find all figures mentioned in the document
            sections_dict = {}
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text.strip():
                        # Split text into sections based on headers
                        lines = text.splitlines()
                        current_section = None
                        current_content = []
                        
                        for line in lines:
                            if re.match(r'^\d+(\.\d+)*\s+[A-Z]', line):
                                if current_section and current_content:
                                    sections_dict[current_section] = '\n'.join(current_content)
                                current_section = line.strip()
                                current_content = []
                            elif current_section:
                                current_content.append(line)
                        
                        if current_section and current_content:
                            sections_dict[current_section] = '\n'.join(current_content)
            
            # Find all figures mentioned in the document
            all_figures = self._find_figures_in_sections(sections_dict)
            
            # Filter to only the figures we want to process
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
            
            # If no important figures found, try a more general approach
            if not important_figures:
                logger.warning("No important figures found with exact matching, trying broader matching")
                for important_term in IMPORTANT_FIGURES:
                    important_figures[important_term] = {
                        'sections': ["Generic Section"],
                        'mentions': 1,
                        'generic': True
                    }
                    logger.info(f"Added generic figure type: {important_term}")
            
            # Extract images based on section context
            logger.info(f"Extracting images for {len(important_figures)} important diagrams")
            target_names = list(important_figures.keys())
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
                
                # Process the most relevant images with OpenAI vision model
                for image_path in relevant_images:
                    try:
                        # Convert image to base64
                        with open(image_path, "rb") as image_file:
                            image_data = base64.b64encode(image_file.read()).decode('utf-8')
                        
                        # Create prompt for OpenAI vision model
                        prompt = """
                        Analyze this diagram and create a system scope that includes:
                        1. Main system components and their roles
                        2. Key relationships between components
                        3. System boundaries and interfaces
                        4. Critical interactions
                        
                        Format the scope as:
                        System: [Main system name/description]
                        Components: [List of main components and their roles]
                        Relationships: [List of key relationships]
                        Boundaries: [System boundaries and interfaces]
                        """
                        
                        # Call OpenAI vision model with updated API
                        client = openai.OpenAI()
                        response = client.chat.completions.create(
                            model="gpt-4-vision-preview",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": prompt},
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{image_data}"
                                            }
                                        }
                                    ]
                                }
                            ],
                            max_tokens=500
                        )
                        
                        # Get the analysis result
                        analysis = response.choices[0].message.content
                        
                        # Get a cleaner display name for this figure type
                        display_name = None
                        for key, mapped_name in figure_name_map.items():
                            if key in figure_name.lower():
                                display_name = mapped_name
                                break
                        
                        # If no specific match found, use a generic name
                        if not display_name:
                            display_name = f"Diagram_{len(diagram_scopes) + 1}"
                        
                        # Store the scope with the display name
                        diagram_scopes[display_name] = analysis
                        logger.info(f"Added diagram scope for {display_name}")
                        
                    except Exception as e:
                        logger.error(f"Error processing image {image_path}: {str(e)}")
                        continue
            
            return diagram_scopes
            
        except Exception as e:
            logger.error(f"Error extracting diagrams: {str(e)}")
            return {}

    def _extract_diagram_type(self, analysis: str) -> str:
        """Extract diagram type from analysis text."""
        try:
            # Look for common diagram types in the analysis
            diagram_types = [
                "UML", "ERD", "Flowchart", "Class Diagram", "Sequence Diagram",
                "Activity Diagram", "Use Case Diagram", "Component Diagram",
                "State Diagram", "Gantt Chart", "System Context", "System Overview"
            ]
            
            for diagram_type in diagram_types:
                if diagram_type.lower() in analysis.lower():
                    return diagram_type
            
            return "Technical Diagram"
        except Exception as e:
            logger.error(f"Error extracting diagram type: {str(e)}")
            return "Technical Diagram"

    def _extract_components(self, analysis: str) -> List[Dict]:
        """Extract components and their attributes from analysis text."""
        try:
            components = []
            # Look for component descriptions in the analysis
            # This is a simple implementation - you might want to use more sophisticated NLP
            lines = analysis.split('\n')
            for line in lines:
                if any(keyword in line.lower() for keyword in ['component', 'class', 'entity', 'node']):
                    components.append({
                        'type': self._get_component_type(line),
                        'label': line.strip(),
                        'attributes': self._extract_attributes(line)
                    })
            return components
        except Exception as e:
            logger.error(f"Error extracting components: {str(e)}")
            return []

    def _extract_relationships(self, analysis: str) -> List[Dict]:
        """Extract relationships between components from analysis text."""
        try:
            relationships = []
            # Look for relationship descriptions in the analysis
            lines = analysis.split('\n')
            for line in lines:
                if any(keyword in line.lower() for keyword in ['relationship', 'connection', 'link', 'association']):
                    relationships.append({
                        'type': self._get_relationship_type(line),
                        'from': self._extract_from_component(line),
                        'to': self._extract_to_component(line)
                    })
            return relationships
        except Exception as e:
            logger.error(f"Error extracting relationships: {str(e)}")
            return []

    def _extract_functionalities(self, analysis: str) -> List[str]:
        """Extract functionalities or processes from analysis text."""
        try:
            functionalities = []
            # Look for functionality descriptions in the analysis
            lines = analysis.split('\n')
            for line in lines:
                if any(keyword in line.lower() for keyword in ['function', 'process', 'operation', 'action']):
                    functionalities.append(line.strip())
            return functionalities
        except Exception as e:
            logger.error(f"Error extracting functionalities: {str(e)}")
            return []

    def _get_component_type(self, line: str) -> str:
        """Determine the type of component from a line of text."""
        if 'class' in line.lower():
            return 'Class'
        elif 'entity' in line.lower():
            return 'Entity'
        elif 'node' in line.lower():
            return 'Node'
        return 'Component'

    def _get_relationship_type(self, line: str) -> str:
        """Determine the type of relationship from a line of text."""
        if 'inheritance' in line.lower():
            return 'Inheritance'
        elif 'composition' in line.lower():
            return 'Composition'
        elif 'association' in line.lower():
            return 'Association'
        return 'Relationship'

    def _extract_attributes(self, line: str) -> List[str]:
        """Extract attributes from a component description."""
        try:
            # Look for attributes in parentheses or after colons
            attributes = []
            if '(' in line and ')' in line:
                attr_text = line[line.find('(')+1:line.find(')')]
                attributes = [attr.strip() for attr in attr_text.split(',')]
            elif ':' in line:
                attr_text = line[line.find(':')+1:].strip()
                attributes = [attr.strip() for attr in attr_text.split(',')]
            return attributes
        except Exception as e:
            logger.error(f"Error extracting attributes: {str(e)}")
            return []

    def _extract_from_component(self, line: str) -> str:
        """Extract the source component from a relationship description."""
        try:
            # Look for components before relationship keywords
            words = line.split()
            for i, word in enumerate(words):
                if any(keyword in word.lower() for keyword in ['relationship', 'connection', 'link', 'association']):
                    if i > 0:
                        return words[i-1]
            return "Unknown"
        except Exception as e:
            logger.error(f"Error extracting from component: {str(e)}")
            return "Unknown"

    def _extract_to_component(self, line: str) -> str:
        """Extract the target component from a relationship description."""
        try:
            # Look for components after relationship keywords
            words = line.split()
            for i, word in enumerate(words):
                if any(keyword in word.lower() for keyword in ['relationship', 'connection', 'link', 'association']):
                    if i < len(words) - 1:
                        return words[i+1]
            return "Unknown"
        except Exception as e:
            logger.error(f"Error extracting to component: {str(e)}")
            return "Unknown"