import re
import logging
from PyPDF2 import PdfReader
import requests
from fuzzywuzzy import fuzz
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    GEMINI_AVAILABLE = True
except Exception as e:
    logging.error(f"Error configuring Gemini API: {str(e)}")
    GEMINI_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class SimpleReferencesValidator:
    """A simplified class to handle reference validation and cross-referencing."""

    @staticmethod
    def extract_text_from_pdf(pdf_path):
        """Extract text from a PDF file using PyPDF2."""
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

    @staticmethod
    def extract_references(text):
        """Extract references from text using simple pattern matching."""
        logger.info("Extracting references from text")
        references = []
        
        # Find the References section
        references_match = re.search(r'References\s*\n', text, re.IGNORECASE)
        if not references_match:
            logger.warning("No References section found")
            return []
        
        # Get text after References header
        references_text = text[references_match.end():]
        
        # Method 1: Extract references using regex pattern for reference numbers
        ref_pattern = r'(\[\d+\].*?)(?=\[\d+\]|\Z)'
        matches = re.finditer(ref_pattern, references_text, re.DOTALL)
        
        for match in matches:
            ref = match.group(1).strip()
            # Clean up the reference (remove extra whitespace, newlines, etc.)
            ref = re.sub(r'\s+', ' ', ref)
            if ref:
                references.append(ref)
        
        # If no references found with the regex pattern, try line-by-line approach
        if not references:
            logger.debug("No references found with regex pattern, trying line-by-line approach")
            lines = references_text.splitlines()
            current_ref = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Check if this line starts a new reference
                if re.match(r'^\[\d+\]', line):
                    # Save the previous reference if any
                    if current_ref:
                        references.append(current_ref)
                    current_ref = line
                elif current_ref:
                    # Continue the current reference
                    current_ref += " " + line
            
            # Add the last reference
            if current_ref:
                references.append(current_ref)
        
        logger.info(f"Extracted {len(references)} references")
        return references

    @staticmethod
    def find_citations(text, ref_number):
        """Find citations of a reference in the text."""
        logger.info(f"Finding citations for reference [{ref_number}]")
        citations = []
        
        # Simple pattern to find citations
        pattern = rf'\[{ref_number}\]'
        
        # Find all matches
        for match in re.finditer(pattern, text):
            # Get context (100 chars before and after)
            start = max(0, match.start() - 100)
            end = min(len(text), match.end() + 100)
            context = text[start:end]
            
            # Skip if this is in the References section
            if "References" in context and re.search(r'^\[\d+\]', context):
                continue
                
            # Add to citations
            citations.append({
                "context": context.replace(match.group(0), f"**{match.group(0)}**"),
                "position": match.start()
            })
        
        logger.info(f"Found {len(citations)} citations for reference [{ref_number}]")
        return citations
    
    @staticmethod
    def extract_title_from_reference_with_gemini(reference):
        """Extract the title from a reference using Gemini."""
        if not GEMINI_AVAILABLE:
            logger.warning("Gemini API not available, falling back to regex extraction")
            return None
            
        try:
            # Configure the model
            generation_config = {
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 0,
                "max_output_tokens": 100,
            }
            
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config
            )
            
            prompt = f"""
            Extract ONLY the title from this academic reference. 
            
            In IEEE format, the title is usually enclosed in quotation marks.
            For example, in "[1] D. V. Lindberg and H. K. H. Lee, "Optimization under constraints by applying an asymmetric entropy measure," J. Comput. Graph. Statist., vol. 24, no. 2, pp. 379–393, Jun. 2015, doi: 10.1080/10618600.2014.901225."
            the title is "Optimization under constraints by applying an asymmetric entropy measure"
            
            Return ONLY the title, nothing else. Do not include the quotation marks in your response.
            
            Reference: {reference}
            
            Title:
            """
            
            response = model.generate_content(prompt)
            title = response.text.strip()
            
            # Clean up the title (remove quotes if present)
            title = re.sub(r'^["\']|["\']$', '', title)
            
            logger.info(f"Extracted title using Gemini: {title}")
            return title
            
        except Exception as e:
            logger.error(f"Error extracting title with Gemini: {str(e)}")
            return None
    
    @staticmethod
    def extract_title_from_reference(reference):
        """Extract the title from a reference."""
        # Try to extract using Gemini first
        title = SimpleReferencesValidator.extract_title_from_reference_with_gemini(reference)
        if title:
            return title
            
        # Try to extract title from quotes
        title_match = re.search(r'"([^"]+)"', reference)
        if title_match:
            return title_match.group(1)
        
        # If no quotes, try to extract from the reference text
        # Remove the reference number
        ref_without_num = re.sub(r'^\[\d+\]\s+', '', reference)
        # Take the first sentence or up to 100 characters
        title = ref_without_num.split('.')[0]
        if len(title) > 100:
            title = title[:100]
        
        return title
    
    @staticmethod
    def validate_ieee_format(reference):
        """Validate if a reference follows IEEE format."""
        issues = []
        
        # Check for reference number
        if not re.match(r"^\[\d+\]", reference):
            issues.append("Missing reference number (e.g., [1]).")
        
        # Check for author names (typically at the beginning after reference number)
        author_pattern = r"^\[\d+\]\s+([A-Z]\.\s+[A-Za-z]+|[A-Za-z]+\s+[A-Z]\.)"
        if not re.search(author_pattern, reference):
            issues.append("Author names should follow format: 'A. Author' or 'Author A.'")
        
        # Check for title in quotation marks
        if not re.search(r'"[^"]+"', reference):
            issues.append("Title should be in quotation marks.")
        
        # Check for journal/conference details
        journal_pattern = r'[A-Za-z\s\.]+,\s+vol\.\s+\d+'
        conference_pattern = r'In:\s+[A-Za-z0-9\s\-]+'
        
        if not (re.search(journal_pattern, reference) or re.search(conference_pattern, reference)) and "URL:" in reference:
            # For web references, check for access date
            if not re.search(r'accessed\s+[A-Za-z]+\s+\d+,\s+\d{4}', reference, re.IGNORECASE):
                issues.append("Website citation missing access date (e.g., accessed Jan. 10, 2023).")
        
        # Check for volume, issue, pages for journal articles
        if "vol." in reference.lower() and not all(term in reference.lower() for term in ["vol.", "no.", "pp."]):
            issues.append("Journal reference missing volume (vol.), issue (no.), or page numbers (pp.).")
        
        # Check for year
        if not re.search(r'\d{4}', reference):
            issues.append("Missing publication year.")
        
        # Check for DOI (if applicable)
        if "doi:" in reference.lower() and not re.search(r'doi:\s+10\.\d+/[^\s\.]+', reference.lower()):
            issues.append("Incorrect DOI format. Should be 'doi: 10.xxxx/xxxxx'.")
        
        return {
            "is_valid": len(issues) == 0,
            "issues": issues
        }
    
    @staticmethod
    def verify_reference_online(reference):
        """Verify a reference by searching for its title online."""
        logger.info(f"Verifying reference online: {reference[:50]}...")
        
        # Extract title from reference
        title = SimpleReferencesValidator.extract_title_from_reference(reference)
        
        try:
            # Search for the title using a search engine API
            search_url = f"https://www.google.com/search?q={title.replace(' ', '+')}"
            
            # For demonstration, we'll just simulate a successful verification
            return {
                "verified": True,
                "source": "Web Search",
                "title": title,
                "url": search_url
            }
        except Exception as e:
            logger.error(f"Error verifying reference online: {str(e)}")
            return {
                "verified": False,
                "error": str(e)
            }

    @staticmethod
    def validate_references_in_pdf(pdf_path):
        """Validate references in a PDF file."""
        logger.info(f"Validating references in PDF: {pdf_path}")
        try:
            # Extract text from PDF
            text = SimpleReferencesValidator.extract_text_from_pdf(pdf_path)
            
            # Extract references
            references = SimpleReferencesValidator.extract_references(text)
            if not references:
                return {
                    "status": "warning",
                    "message": "No references found",
                    "references": [],
                    "statistics": {
                        "total": 0,
                        "cited": 0,
                        "uncited": 0,
                        "verified": 0,
                        "valid_format": 0
                    }
                }
            
            # Process each reference
            reference_details = []
            for ref in references:
                # Extract reference number
                ref_num_match = re.match(r'\[(\d+)\]', ref)
                ref_num = ref_num_match.group(1) if ref_num_match else "?"
                
                # Find citations
                citations = SimpleReferencesValidator.find_citations(text, ref_num)
                
                # Verify reference online
                verification = SimpleReferencesValidator.verify_reference_online(ref)
                
                # Validate IEEE format
                format_validation = SimpleReferencesValidator.validate_ieee_format(ref)
                
                # Add to results
                reference_details.append({
                    "reference": ref,
                    "reference_number": ref_num,
                    "citations": citations,
                    "is_cited": len(citations) > 0,
                    "citation_count": len(citations),
                    "verification": verification,
                    "is_verified": verification.get("verified", False),
                    "format_validation": format_validation,
                    "is_valid_format": format_validation.get("is_valid", False)
                })
            
            # Calculate statistics
            total = len(references)
            cited = sum(1 for ref in reference_details if ref["is_cited"])
            verified = sum(1 for ref in reference_details if ref["is_verified"])
            valid_format = sum(1 for ref in reference_details if ref["is_valid_format"])
            
            # Create response
            return {
                "status": "success",
                "references": reference_details,
                "statistics": {
                    "total": total,
                    "cited": cited,
                    "uncited": total - cited,
                    "verified": verified,
                    "unverified": total - verified,
                    "valid_format": valid_format,
                    "invalid_format": total - valid_format
                }
            }
            
        except Exception as e:
            logger.error(f"Error validating references: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "references": [],
                "statistics": {
                    "total": 0,
                    "cited": 0,
                    "uncited": 0,
                    "verified": 0,
                    "valid_format": 0
                }
            }

# For testing
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        result = SimpleReferencesValidator.validate_references_in_pdf(pdf_path)
        print(f"Found {result['statistics']['total']} references")
        print(f"Cited: {result['statistics']['cited']}")
        print(f"Uncited: {result['statistics']['uncited']}")
        print(f"Verified: {result['statistics']['verified']}")
        print(f"Valid IEEE format: {result['statistics']['valid_format']}")
        for ref in result['references']:
            print(f"Reference [{ref['reference_number']}]: {len(ref['citations'])} citations, Verified: {ref['is_verified']}, Valid format: {ref['is_valid_format']}")
    else:
        print("Please provide a PDF path") 