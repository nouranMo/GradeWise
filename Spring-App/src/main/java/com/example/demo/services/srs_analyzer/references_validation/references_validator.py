import logging
import pdfplumber
import re
from .citation_processor import CitationProcessor

logger = logging.getLogger(__name__)

class ReferencesValidator:
    @staticmethod
    def extract_text_from_pdf(pdf_path):
        logger.info(f"Extracting text from PDF: {pdf_path}")
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise RuntimeError(f"Error extracting text from PDF: {e}")

    @staticmethod
    def extract_references_from_text(text):
        logger.info("Extracting References section from text")
        references = []
        reference_started = False
        current_reference = ""

        for line in text.splitlines():
            line = line.strip()
            if line.lower() == "references":
                reference_started = True
                continue
            
            if reference_started and line:
                # If line starts with [n], it's a new reference
                if re.match(r'^\[\d+\]', line):
                    if current_reference:  # Save previous reference if exists
                        # Clean up the reference before saving
                        clean_ref = re.sub(r'\s+', ' ', current_reference)
                        # Preserve URLs by fixing spaces in them
                        clean_ref = re.sub(r'(https?://\S+)\s+(\S+)', r'\1\2', clean_ref)
                        references.append(clean_ref.strip())
                    current_reference = line
                else:
                    # Continue previous reference without adding extra space if it's a URL continuation
                    if current_reference and re.search(r'https?://', current_reference):
                        current_reference += line
                    else:
                        current_reference += " " + line

        # Add the last reference if exists
        if current_reference:
            clean_ref = re.sub(r'\s+', ' ', current_reference)
            clean_ref = re.sub(r'(https?://\S+)\s+(\S+)', r'\1\2', clean_ref)
            references.append(clean_ref.strip())

        return references

    @staticmethod
    def validate_ieee_references(references):
        valid_formats = {
            "journal": r"^\[\d+\]\s[A-Za-z\s]+,\s\".+\",\s[A-Za-z\s]+,\svol\.\s\d+,\sno\.\s\d+,\spp\.\s\d+-\d+,\s\d{4}\.$",
            "book": r"^\[\d+\]\s[A-Za-z\s]+,\s\*.+\*,\sPublisher,\s\d{4}\.$",
            "website": r"^\[\d+\]\s\".+\",\sAvailable:\shttp[s]?:\/\/.+,\saccessed\s[A-Za-z]+\s\d+,\s\d{4}\.$",
        }
        errors = []
        for ref in references:
            if not any(re.match(pattern, ref) for pattern in valid_formats.values()):
                errors.append(ref)
        return errors

    @staticmethod
    def validate_references_in_pdf(pdf_path):
        """Validate the References section and cross-reference with the main document text."""
        logger.info(f"Validating References section in PDF: {pdf_path}")
        try:
            # Extract text from the PDF
            text = ReferencesValidator.extract_text_from_pdf(pdf_path)

            # Extract raw references
            raw_references = ReferencesValidator.extract_references_from_text(text)

            if not raw_references:
                return {
                    "reformatted_references": [],
                    "status": "success",
                    "message": "No references found in document"
                }

            # Initialize CitationProcessor with API key
            processor = CitationProcessor("AIzaSyA6fZ3aIeZmX-QAhyhJye3kWX4C-ZGozTY")
            reformatted_references = []

            for ref in raw_references:
                try:
                    # Process each reference
                    processed_result = processor.reformat_citation(ref)
                    
                    # Extract the reformatted citation from the processor result
                    reformatted = processed_result.get('reformatted', ref)
                    format_check = processed_result.get('format_check', {
                        'valid': False,
                        'errors': ['Failed to process reference']
                    })
                    verification = processed_result.get('verification', {
                        'verified': False,
                        'source': None,
                        'details': None
                    })

                    reformatted_references.append({
                        "original": ref,
                        "reformatted": reformatted,
                        "format_check": format_check,
                        "verification": verification
                    })

                except Exception as e:
                    logger.error(f"Error processing reference: {str(e)}")
                    reformatted_references.append({
                        "original": ref,
                        "reformatted": ref,
                        "format_check": {
                            "valid": False,
                            "errors": [str(e)]
                        },
                        "verification": {
                            "verified": False,
                            "source": None,
                            "details": None
                        }
                    })

            return {
                "reformatted_references": reformatted_references,
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "reformatted_references": []
            }
