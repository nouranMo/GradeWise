import re
import logging
from image_processing import ImageProcessor
from simple_references_validator import SimpleReferencesValidator
from similarity_analyzer import SimilarityAnalyzer
from section_parser import SectionParser

logger = logging.getLogger(__name__)

class DocumentValidator:
    PREDEFINED_STRUCTURES = SectionParser.PREDEFINED_STRUCTURES

    @staticmethod
    def parse_document(text, document_type):
        """Parse document into structured format based on document type."""
        return SectionParser.parse_sections(text, document_type)

    @staticmethod
    def validate_structure(parsed_data, document_type):
        """Validate the structure of a document based on document type."""
        return SectionParser.validate_structure(parsed_data, document_type)

def process_pdf_and_validate(pdf_path, document_type):
    """Process the PDF and validate the document structure."""
    logger.info(f"Starting PDF processing and validation pipeline for {document_type}")
    
    text = SimpleReferencesValidator.extract_text_from_pdf(pdf_path)
    parsed_data = DocumentValidator.parse_document(text, document_type)
    validation_results = DocumentValidator.validate_structure(parsed_data, document_type)
    
    similarity_results = SimilarityAnalyzer.create_similarity_matrix(parsed_data)
    
    results = {
        "validation": validation_results,
        "similarity": similarity_results,
        "sections": parsed_data
    }
    
    logger.info(f"Processing and validation completed for {document_type}")
    return results