import re
import logging
from image_processing import ImageProcessor
from simple_references_validator import SimpleReferencesValidator
from similarity_analyzer import SimilarityAnalyzer
from section_parser import SectionParser

logger = logging.getLogger(__name__)

class SRSValidator:
    PREDEFINED_STRUCTURE = SectionParser.PREDEFINED_STRUCTURE

    @staticmethod
    def parse_srs(text):
        """Parse SRS document into structured format."""
        return SectionParser.parse_sections(text)

    @staticmethod
    def validate_srs_structure(parsed_data):
        """Validate the structure of an SRS document."""
        return SectionParser.validate_structure(parsed_data)

def process_pdf_and_validate(pdf_path, predefined_structure):
    """Process the PDF and validate the SRS structure."""
    logger.info("Starting PDF processing and validation pipeline")
    
    # Extract text and parse sections
    text = SimpleReferencesValidator.extract_text_from_pdf(pdf_path)
    parsed_data = SRSValidator.parse_srs(text)
    validation_results = SRSValidator.validate_srs_structure(parsed_data)
    
    # Create similarity matrix
    similarity_results = SimilarityAnalyzer.create_similarity_matrix(parsed_data)
    
    # Combine results
    results = {
        "validation": validation_results,
        "similarity": similarity_results,
        "sections": parsed_data
    }
    
    logger.info("Processing and validation completed")
    return results

