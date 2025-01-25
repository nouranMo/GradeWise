import re
import logging
import pdfplumber  # For extracting text from PDFs
import requests
from fuzzywuzzy import fuzz
from transformers import pipeline
import torch

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Adjust the level as needed


class CitationProcessor:
    """
    A class to handle citation reformatting using a Hugging Face model.
    """

    def __init__(self):
        """
        Initialize the CitationProcessor with a text generation pipeline for citation reformatting.
        """
        logger.info("Initializing CitationProcessor")

        try:
            model_name = "t5-small"  # General-purpose text-to-text model
            device = 0 if torch.cuda.is_available() else -1
            logger.info(f"Using device: {'GPU' if device == 0 else 'CPU'}")

            # Load the pipeline for reformatting citations
            self.reformatter = pipeline(
                "text2text-generation",
                model=model_name,
                device=device
            )
            logger.info("Reformatter model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading reformatter model: {str(e)}")
            self.reformatter = None

    def reformat_citation(self, citation):
        """
        Reformat a single citation using the Hugging Face model.

        Args:
            citation (str): The raw citation text.

        Returns:
            str: Reformatted citation or the original citation if reformatting fails.
        """
        if not self.reformatter:
            logger.warning("Reformatter not available, returning original citation.")
            return citation

        try:
            prompt = (
            f"Reformat the following raw citation into proper IEEE format. Ensure the citation includes:\n"
            f"1. A valid reference number (e.g., [1])\n"
            f"2. Author names\n"
            f"3. Title in quotation marks\n"
            f"4. Journal or conference details (if applicable)\n"
            f"5. Volume, issue, page numbers, and year (if applicable)\n"
            f"6. URL with an access date (if it is a web reference)\n\n"
            f"Raw Citation:\n{citation}\n\n"
            f"Reformatted IEEE Citation:"
            )

            result = self.reformatter(
                prompt,
                max_length=200,  # Allow for longer citation reformatting
                num_return_sequences=1
            )
            reformatted_citation = result[0]['generated_text']

            # Post-process the reformatted citation for IEEE compliance
            reformatted_citation = self.post_process_citation(reformatted_citation)
            return reformatted_citation
        except Exception as e:
            logger.error(f"Error reformatting citation: {str(e)}")
            return citation  # Return original citation as fallback

    def post_process_citation(self, citation):
        # Ensure citation starts with a valid reference number
        if not re.match(r"^\[\d+\]", citation):
            citation = "[X] " + citation

        # Ensure citation ends with a period
        if not citation.strip().endswith("."):
            citation += "."

        # Normalize spacing and fix minor formatting issues
        citation = re.sub(r"\s+", " ", citation)
        citation = re.sub(r"\.(?!\s|$)", ". ", citation)  # Ensure space after periods
        citation = re.sub(r",\s+", ", ", citation)

        return citation



    def reformat_citations(self, citations):
        """
        Reformat a list of citations.

        Args:
            citations (list): List of raw citation strings.

        Returns:
            list: List of reformatted citation strings.
        """
        return [self.reformat_citation(citation) for citation in citations]


class ReferencesValidator:
    """A class to handle extraction, validation, and cross-referencing of the References section."""

    @staticmethod
    def extract_text_from_pdf(pdf_path):
        """
        Extract text from a PDF file.

        Args:
            pdf_path (str): The path to the PDF file.

        Returns:
            str: The full text extracted from the PDF.
        """
        logger.info(f"Extracting text from PDF: {pdf_path}")
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
            logger.info("Text extraction complete")
            return text
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise

    @staticmethod
    def extract_references_from_text(text):
        """
        Extract the References section from the document text.

        Args:
            text (str): The full text of the document.

        Returns:
            list: A list of extracted references.
        """
        logger.info("Extracting References section from text")
        references = []
        reference_started = False

        lines = text.splitlines()

        for line in lines:
            line = line.strip()

            # Check for "References" section header
            if line.lower() == "references":
                logger.debug("References section detected")
                reference_started = True
                continue

            # Parse references
            if reference_started:
                if re.match(r"^\[\d+\]", line):  # Match IEEE reference format (e.g., [1], [2])
                    references.append(line)
                elif reference_started and not line:  # End of references section
                    logger.debug("End of References section detected")
                    break

        logger.info(f"Extracted {len(references)} references")
        return references

    @staticmethod
    def validate_ieee_references(references):
        """
        Validate references against IEEE format and provide detailed explanations for errors.

        Args:
            references (list): List of references to validate.

        Returns:
            dict: Validation results, including errors for each invalid reference.
        """
        logger.info("Validating IEEE references")

        # IEEE example patterns for common types of references
        valid_formats = {
            "journal": r"^\[\d+\]\s[A-Za-z\s]+,\s\".+\",\s[A-Za-z\s]+,\svol\.\s\d+,\sno\.\s\d+,\spp\.\s\d+-\d+,\s\d{4}\.$",
            "book": r"^\[\d+\]\s[A-Za-z\s]+,\s\*.+\*,\sPublisher,\s\d{4}\.$",
            "website": r"^\[\d+\]\s\".+\",\sAvailable:\shttp[s]?:\/\/.+,\saccessed\s[A-Za-z]+\s\d+,\s\d{4}\.$",
        }

        errors = []

        for ref in references:
            if not any(re.match(pattern, ref) for pattern in valid_formats.values()):
                issue_details = []

                if not re.match(r"^\[\d+\]", ref):
                    issue_details.append("Reference is missing a valid identifier (e.g., [1]).")

                if "URL" in ref and not re.match(valid_formats["website"], ref):
                    issue_details.append(
                        "Web references must include the format: [n] \"Title,\" Available: URL, accessed Month Day, Year."
                    )

                if not any(keyword in ref for keyword in ["vol.", "no.", "pp.", "Publisher", "Available"]):
                    issue_details.append(
                        "The reference is missing critical IEEE details (e.g., volume, issue, page numbers, or publisher)."
                    )

                if not ref.strip().endswith("."):
                    issue_details.append("References must end with a period.")

                errors.append({
                    "reference": ref,
                    "issues": issue_details or ["Reference does not match any known IEEE format."]
                })

        if errors:
            logger.error(f"Found {len(errors)} invalid references")
        else:
            logger.info("All references are valid")

        return {"status": "valid" if not errors else "invalid", "errors": errors}

    @staticmethod
    def validate_references_in_pdf(pdf_path):
        """
        Validate the References section and cross-reference with the main document text.

        Args:
            pdf_path (str): The path to the PDF file.

        Returns:
            dict: Validation results, including cross-reference checks and real reference verification.
        """
        logger.info(f"Validating References section in PDF: {pdf_path}")
        try:
            # Extract text from the PDF
            text = ReferencesValidator.extract_text_from_pdf(pdf_path)

            # Extract raw references
            raw_references = ReferencesValidator.extract_references_from_text(text)

            # Reformat citations
            processor = CitationProcessor()
            references = processor.reformat_citations(raw_references)

            # Validate references for IEEE format
            reference_validation = ReferencesValidator.validate_ieee_references(references)

            return {
                "reference_validation": reference_validation,
                "reformatted_references": references,
            }
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return {"status": "error", "details": str(e)}


if __name__ == "__main__":
    example_pdf_path = "C:/Users/Georgie/Documents/GitHub/Automated-Checking-and-Grading-Tool-For-Technical-Documentation/Spring-App/src/main/java/com/example/demo/services/srs_analyzer/test.pdf"
    results = ReferencesValidator.validate_references_in_pdf(example_pdf_path)
    print("Validation Results:", results)
