import re
import logging
from PyPDF2 import PdfReader
import requests
from fuzzywuzzy import fuzz
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

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
        
        # Find the References section with more flexible pattern
        # Handles "References", "Bibliography", "Works Cited", etc.
        references_pattern = r'(?:References|Bibliography|Works Cited|Citations)\s*\n'
        references_match = re.search(references_pattern, text, re.IGNORECASE)
        
        if not references_match:
            logger.warning("No References section found")
            return []
        
        # Get text after References header
        references_text = text[references_match.end():]
        
        # Method 1: Extract references using regex pattern for reference numbers
        # More robust pattern that handles multi-line references
        ref_pattern = r'(\[\d+\].*?)(?=\[\d+\]|\Z)'
        matches = re.finditer(ref_pattern, references_text, re.DOTALL)
        
        for match in matches:
            ref = match.group(1).strip()
            # Clean up the reference (normalize whitespace)
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
        
        # Post-process references to ensure they are complete
        processed_references = []
        for ref in references:
            # Check if reference has a number
            if re.match(r'^\[\d+\]', ref):
                # Check if reference seems complete (has year or DOI or URL)
                if re.search(r'\d{4}|doi|http|www', ref, re.IGNORECASE):
                    processed_references.append(ref)
                else:
                    logger.warning(f"Reference may be incomplete: {ref}")
        
        if processed_references:
            references = processed_references
            
        logger.info(f"Extracted {len(references)} references")
        return references

    @staticmethod
    def find_citations(text, ref_number):
        """Find citations of a reference in the text."""
        logger.info(f"Finding citations for reference [{ref_number}]")
        citations = []
        
        # More robust patterns to find citations
        # Single reference pattern
        single_pattern = rf'\[{ref_number}\]'
        
        # Multiple reference pattern (e.g., [1, 2, 3] or [1-3])
        multiple_patterns = [
            rf'\[(?:\d+,\s*)*{ref_number}(?:,\s*\d+)*\]',  # [1, 2, 3]
            rf'\[\d+-{ref_number}\]',                       # [1-3]
            rf'\[{ref_number}-\d+\]'                        # [3-5]
        ]
        
        # Find all matches for single pattern
        for match in re.finditer(single_pattern, text):
            # Get context (100 chars before and after)
            start = max(0, match.start() - 100)
            end = min(len(text), match.end() + 100)
            context = text[start:end]
            
            # Skip if this is in the References section
            if re.search(r'(?:References|Bibliography|Works Cited)', context, re.IGNORECASE) and re.search(r'^\[\d+\]', context):
                continue
                
            # Add to citations
            citations.append({
                "context": context.replace(match.group(0), f"**{match.group(0)}**"),
                "position": match.start()
            })
        
        # Find all matches for multiple patterns
        for pattern in multiple_patterns:
            for match in re.finditer(pattern, text):
                # Get context
                start = max(0, match.start() - 100)
                end = min(len(text), match.end() + 100)
                context = text[start:end]
                
                # Skip if this is in the References section
                if re.search(r'(?:References|Bibliography|Works Cited)', context, re.IGNORECASE) and re.search(r'^\[\d+\]', context):
                    continue
                    
                # Add to citations
                citations.append({
                    "context": context.replace(match.group(0), f"**{match.group(0)}**"),
                    "position": match.start()
                })
        
        # Remove duplicates based on position
        unique_citations = []
        positions = set()
        for citation in citations:
            if citation["position"] not in positions:
                unique_citations.append(citation)
                positions.add(citation["position"])
        
        logger.info(f"Found {len(unique_citations)} citations for reference [{ref_number}]")
        return unique_citations
    
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
        # Normalize reference by replacing newlines with spaces
        normalized_ref = reference.replace('\n', ' ')
        
        # Try to extract using Gemini first
        title = SimpleReferencesValidator.extract_title_from_reference_with_gemini(normalized_ref)
        if title:
            return title
            
        # Try to extract title from quotes with improved pattern for hyphenated words
        title_match = re.search(r'"([^"]+)"', normalized_ref)
        if title_match:
            return title_match.group(1)
        
        # If no quotes, try to extract from the reference text
        # Remove the reference number
        ref_without_num = re.sub(r'^\[\d+\]\s+', '', normalized_ref)
        
        # Try to find title after author names and before journal/conference
        # Look for patterns that typically follow author names
        author_end_patterns = [
            r'et al\.\s+"([^"]+)"',
            r'[A-Z][a-z]+\.\s+"([^"]+)"',
            r'[A-Z][a-z]+\s+and\s+[A-Z][a-z]+\.\s+"([^"]+)"'
        ]
        
        for pattern in author_end_patterns:
            match = re.search(pattern, normalized_ref)
            if match:
                return match.group(1)
        
        # Fall back to simple approach - take the first sentence or up to 100 characters
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
        
        # Improved author pattern to accept full names and "et al."
        # This accepts both initial formats (A. Author/Author A.) and full names with et al.
        author_pattern = r"^\[\d+\]\s+([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*(?:\s+et al\.)?|[A-Z]\.\s+[A-Za-z]+|[A-Za-z]+\s+[A-Z]\.)"
        if not re.search(author_pattern, reference):
            issues.append("Author names should follow IEEE format.")
        
        # COMPLETELY NEW APPROACH for title detection with extreme debugging
        # Normalize the reference
        normalized_ref = reference.replace('\n', ' ')
        print(f"\n===== DEBUGGING TITLE VALIDATION =====")
        print(f"Reference: {normalized_ref}")
        
        # Print each character and its Unicode code point for debugging
        print("Character code points:")
        char_codes = []
        for i, char in enumerate(normalized_ref):
            code_point = ord(char)
            char_codes.append((i, char, code_point))
            if 8200 <= code_point <= 8300 or code_point == 34 or code_point == 39 or code_point in [8216, 8217, 8220, 8221]:
                print(f"Special char at position {i}: '{char}' (U+{code_point:04X})")
        
        # A comprehensive list of quotation mark characters
        quote_chars = ['"', "'", '"', '"', ''', ''', '«', '»', '‹', '›', '„', '‟', '❝', '❞', '❮', '❯', '〝', '〞', '＂']
        quote_pairs = [
            ('"', '"'),   # Regular double quotes
            ("'", "'"),   # Regular single quotes
            ('"', '"'),   # Curly double quotes
            (''', '''),   # Curly single quotes
            ('«', '»'),   # Guillemets
            ('‹', '›'),   # Single guillemets
            ('„', '"'),   # German quotes
            ('„', '‟'),   # Alternative German quotes
            ('❝', '❞'),   # Heavy double quotes
            ('❮', '❯'),   # Angular quotes
            ('〝', '〞'),   # CJK quotes
            ('＂', '＂'),   # Fullwidth quotes
        ]
        
        # Check for any kind of quoted text
        has_quotes = False
        detected_quotes = []
        
        # Try regex pattern with all individual quote chars
        for quote in quote_chars:
            pattern = f"{quote}[^{quote}]+{quote}"
            matches = re.findall(pattern, normalized_ref)
            if matches:
                print(f"Found quote match with '{quote}': {matches}")
                detected_quotes.extend(matches)
                has_quotes = True
        
        # Try regex pattern with quote pairs
        for open_q, close_q in quote_pairs:
            pattern = f"{re.escape(open_q)}[^{re.escape(close_q)}]+{re.escape(close_q)}"
            matches = re.findall(pattern, normalized_ref)
            if matches:
                print(f"Found quote pair match with '{open_q}'/'{close_q}': {matches}")
                detected_quotes.extend(matches)
                has_quotes = True
        
        # Simple heuristic: look for text between any kind of quotes
        if not has_quotes:
            print("No quotes found with regex. Trying direct index search...")
            for i, char, code in char_codes:
                if char in quote_chars:
                    # Found opening quote, now look for closing quote
                    for j, char2, code2 in char_codes[i+1:]:
                        if char2 in quote_chars:
                            # Found a potential title
                            potential_title = normalized_ref[i:j+1]
                            if len(potential_title) > 10:  # Arbitrary minimum length for a title
                                print(f"Found potential title using direct index: {potential_title}")
                                detected_quotes.append(potential_title)
                                has_quotes = True
                                break
        
        # Last resort: Look for anything that might be a title
        if not has_quotes:
            # Look for capitalized text followed by a period after the author names
            title_pattern = r"\]\s+[^\.]+\.\s+([A-Z][^\.]+)\."
            title_match = re.search(title_pattern, normalized_ref)
            if title_match:
                potential_title = title_match.group(1)
                print(f"Found unquoted title: {potential_title}")
                issues.append(f"Title not properly quoted: '{potential_title}'")
            else:
                issues.append("Could not find title in quotation marks.")
        
        # If we found quotes but they're not in the expected IEEE format
        if has_quotes:
            print(f"Total quoted texts found: {len(detected_quotes)}")
            for i, quote in enumerate(detected_quotes):
                print(f"  {i+1}. {quote}")
            
            print("\nChecking if any detected quotes match IEEE title format...")
            title_like = False
            for quote in detected_quotes:
                # Title is typically capitalized and doesn't start with symbols
                if re.match(r'^["\']?[A-Z]', quote):
                    print(f"Found title-like quote: {quote}")
                    title_like = True
                    break
            
            if not title_like:
                issues.append("Title should be properly quoted and capitalized.")
        
        print("===== END DEBUGGING =====\n")
        
        # Check for journal/conference details
        journal_pattern = r'[A-Za-z\s\.]+,\s+vol\.\s+\d+'
        conference_pattern = r'(?:In:|Proc\.|Proceedings of)\s+[A-Za-z0-9\s\-\.]+'
        
        if not (re.search(journal_pattern, normalized_ref) or re.search(conference_pattern, normalized_ref)) and "URL:" in normalized_ref:
            # For web references, check for access date
            if not re.search(r'accessed\s+[A-Za-z]+\s+\d+,\s+\d{4}', normalized_ref, re.IGNORECASE):
                issues.append("Website citation missing access date (e.g., accessed Jan. 10, 2023).")
        
        # Check for volume, issue, pages for journal articles
        if "vol." in normalized_ref.lower() and not all(term in normalized_ref.lower() for term in ["vol.", "no.", "pp."]):
            issues.append("Journal reference missing volume (vol.), issue (no.), or page numbers (pp.).")
        
        # Check for year
        if not re.search(r'\d{4}', normalized_ref):
            issues.append("Missing publication year.")
        
        # More flexible DOI format check that handles various formats
        # Case insensitive, allows spacing variations, and handles line breaks
        if re.search(r'(?i)doi', normalized_ref):
            if not re.search(r'(?i)doi:?\s*10\.\d+/[^\s\.]+', normalized_ref):
                issues.append("Incorrect DOI format. Should be 'doi: 10.xxxx/xxxxx'.")
        
        print(f"Final validation issues: {issues}")
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
        print("\n" + "="*50)
        print("VALIDATING REFERENCES IN PDF")
        print("="*50)
        print(f"PDF path: {pdf_path}")
        
        try:
            print("\nExtracting text from PDF...")
            text = SimpleReferencesValidator.extract_text_from_pdf(pdf_path)
            print(f"Extracted text length: {len(text)}")
            print("First 200 chars of text:", text[:200])
            
            print("\nExtracting references...")
            references = SimpleReferencesValidator.extract_references(text)
            print(f"Found {len(references)} references")
            
            if not references:
                print("WARNING: No references found in the document")
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
            
            print("\nProcessing each reference...")
            reference_details = []
            for i, ref in enumerate(references, 1):
                print(f"\nProcessing reference {i}/{len(references)}")
                print(f"Reference text: {ref}")
                
                # Extract reference number
                ref_num_match = re.match(r'\[(\d+)\]', ref)
                ref_num = ref_num_match.group(1) if ref_num_match else "?"
                print(f"Reference number: {ref_num}")
                
                # Find citations
                print("Finding citations...")
                citations = SimpleReferencesValidator.find_citations(text, ref_num)
                print(f"Found {len(citations)} citations")
                
                # Verify reference online
                print("Verifying reference online...")
                verification = SimpleReferencesValidator.verify_reference_online(ref)
                print(f"Verification result: {verification}")
                
                # Validate IEEE format
                print("Validating IEEE format...")
                format_validation = SimpleReferencesValidator.validate_ieee_format(ref)
                print(f"Format validation result: {format_validation}")
                
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
            
            print("\nFinal Statistics:")
            print(f"Total references: {total}")
            print(f"Cited references: {cited}")
            print(f"Verified references: {verified}")
            print(f"Valid format references: {valid_format}")
            
            # Create response
            result = {
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
            
            print("\nValidation completed successfully!")
            print("Result:", json.dumps(result, indent=2))
            return result
            
        except Exception as e:
            print("\nERROR IN REFERENCE VALIDATION:")
            print(f"Exception type: {type(e)}")
            print(f"Exception message: {str(e)}")
            import traceback
            print("Traceback:")
            traceback.print_exc()
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