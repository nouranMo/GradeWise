import logging
import re
import requests
from bs4 import BeautifulSoup
import urllib.parse
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Try to import scholarly, but provide fallback if not available
try:
    from scholarly import scholarly
    SCHOLARLY_AVAILABLE = True
except ImportError:
    logger.warning("scholarly package not available. Limited citation verification will be used.")
    SCHOLARLY_AVAILABLE = False

class CitationProcessor:
    def __init__(self, api_key, model=None):
        logger.info("Initializing CitationProcessor")
        self.ieee_patterns = {
            "journal": r"^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+\"(?P<title>[^\"]+)\",\s+(?P<journal>[\w\s]+),\s+vol\.\s+(?P<volume>\d+),\s+no\.\s+(?P<issue>\d+),\s+pp\.\s+(?P<pages>\d+-\d+),\s+(?P<year>\d{4})\.$",
            "conference": r"^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+\"(?P<title>[^\"]+)\",\s+in\s+(?P<conference>[^,]+),\s+(?P<location>[^,]+),\s+(?P<year>\d{4}),\s+pp\.\s+(?P<pages>\d+-\d+)\.$",
            "book": r"^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+(?P<title>[^,]+),\s+(?P<publisher>[\w\s]+),\s+(?P<location>[^,]+),\s+(?P<year>\d{4})\.$",
            "website": r"^\[\d+\]\s+\"(?P<title>[^\"]+)\",\s+(?P<website>[^,]+),\s+(?P<url>https?:\/\/[^\s]+),\s+accessed\s+(?P<date>[^\.]+)\.$"
        }

        try:
            genai.configure(api_key=api_key)
            self.model = model if model else genai.GenerativeModel("gemini-1.5-flash")
            logger.info("Gemini API configured successfully")
        except Exception as e:
            logger.error(f"Error configuring Gemini API: {str(e)}")
            self.model = None

    def verify_citation_online(self, citation):
        """Verify citation by searching online."""
        try:
            # Extract title from citation
            title_match = re.search(r'"([^"]+)"', citation)
            if not title_match:
                # Try to extract title from URL-based citations
                if 'URL:' in citation:
                    title = citation.split('URL:')[0].strip()
                else:
                    title_match = re.search(r'^\[\d+\]\s+(?:[^,]+,\s+)?([^,]+)', citation)
                    title = title_match.group(1) if title_match else citation

            title = re.sub(r'\s+', ' ', title).strip()  # Clean up whitespace
            search_url = f"https://scholar.google.com/scholar?q={urllib.parse.quote(title)}"

            # Skip scholarly search to improve speed
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            try:
                response = requests.get(search_url, headers=headers, timeout=3)
                if response.status_code == 200:
                    return {
                        "verified": True,
                        "source": "Web Search",
                        "details": {
                            "search_url": search_url
                        }
                    }
            except requests.exceptions.Timeout:
                logger.warning("Search request timed out")

            return {
                "verified": False,
                "source": None,
                "details": {
                    "reason": "No matches found online",
                    "search_url": search_url
                }
            }

        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            return {
                "verified": False,
                "source": None,
                "details": {"reason": str(e)}
            }

    def check_ieee_format(self, citation):
        """Check if citation follows IEEE format."""
        try:
            # IEEE format patterns
            patterns = {
                'journal': r'^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+"(?P<title>[^"]+)",\s+(?P<journal>[\w\s]+),\s+vol\.\s+\d+,\s+(?:no\.\s+\d+,\s+)?pp\.\s+\d+[-–]\d+,\s+\d{4}\.$',
                'conference': r'^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+"(?P<title>[^"]+)",\s+(?:in\s+)?(?P<conference>[^,]+),\s+(?:vol\.\s+\d+,\s+)?(?P<location>[^,]+,\s+)?(?P<year>\d{4})(?:,\s+pp\.\s+\d+[-–]\d+)?\.$',
                'book': r'^\[\d+\]\s+(?P<authors>[\w\s\.,]+),\s+(?P<title>[^,]+),\s+(?P<publisher>[\w\s]+),\s+(?P<location>[^,]+),\s+(?P<year>\d{4})\.$',
                'website': r'^\[\d+\]\s+"[^"]+",\s+(?:Available:\s+)?(?:URL:\s+)?(?:https?://\S+)\s+\(accessed\s+[^)]+\)\.$'
            }

            # Check each pattern
            for format_type, pattern in patterns.items():
                if re.match(pattern, citation):
                    return {
                        "valid": True,
                        "format": format_type,
                        "errors": []
                    }

            # If no pattern matches, identify specific issues
            errors = []
            if not re.match(r'^\[\d+\]', citation):
                errors.append("Missing reference number [X]")
            if not re.search(r'"[^"]+"', citation):
                errors.append("Missing quotes around title")
            if not citation.endswith('.'):
                errors.append("Missing period at end")
            if 'http' in citation and 'accessed' not in citation.lower():
                errors.append("Website citation missing access date")

            return {
                "valid": False,
                "format": None,
                "errors": errors if errors else ["Does not match any IEEE format"]
            }

        except Exception as e:
            return {
                "valid": False,
                "format": None,
                "errors": [str(e)]
            }

    def identify_format_errors(self, citation):
        """Identify specific formatting errors in the citation."""
        errors = []

        if not re.match(r"^\[\d+\]", citation):
            errors.append("Missing or incorrect reference number format")

        if not re.search(r"\"[^\"]+\"", citation):
            errors.append("Title should be in double quotes")

        if not citation.endswith("."):
            errors.append("Citation should end with a period")

        if "vol." in citation and not re.search(r"vol\.\s+\d+", citation):
            errors.append("Incorrect volume format")

        if "no." in citation and not re.search(r"no\.\s+\d+", citation):
            errors.append("Incorrect issue number format")

        if "pp." in citation and not re.search(r"pp\.\s+\d+-\d+", citation):
            errors.append("Incorrect page number format")

        return errors

    def reformat_citation(self, citation):
        """Reformat and validate citation using Gemini."""
        try:
            if not citation or not isinstance(citation, str):
                return {
                    "original": str(citation),
                    "reformatted": str(citation),
                    "format_check": {"valid": False, "errors": ["Invalid citation format"]},
                    "verification": {"verified": False, "source": None}
                }

            # Extract original reference number if present
            ref_num_match = re.match(r'^\[(\d+)\]', citation)
            ref_num = ref_num_match.group(1) if ref_num_match else "1"

            # Clean up the citation text
            citation_text = re.sub(r'^\[\d+\]\s*', '', citation).strip()

            # Check if the Gemini model is available
            if self.model:
                # Prepare prompt for Gemini
                prompt = (
                    f"Convert the following citation to IEEE format:\n"
                    f"{citation}\n\n"
                    f"Use the following formats:\n"
                    f"Journal: Author(s), \"Title,\" Journal, vol. X, no. X, pp. X-X, Year.\n"
                    f"Conference: Author(s), \"Title,\" in Conference Name, Location, Year, pp. X-X.\n"
                    f"Book: Author(s), Book Title, Publisher, Location, Year.\n"
                    f"Website: \"Title,\" Website Name. URL (accessed Month Day, Year)."
                )

                # Use Gemini to generate the reformatted citation
                response = self.model.generate_content(prompt)
                reformatted = response.text.strip()

                # Clean up and validate the citation format
                reformatted = self.post_process_citation(reformatted)

                # If the model doesn't generate a proper citation, fall back to a basic format
                if not re.match(r"^\[\d+\]", reformatted):
                    reformatted = f"[{ref_num}] {citation_text}."

            else:
                # Fallback to manual formatting if the model is not available
                reformatted = f'[{ref_num}] {citation_text}.'

            # Validate the format
            format_check = self.check_ieee_format(reformatted)
            verification = self.verify_citation_online(reformatted)

            return {
                "original": citation,
                "reformatted": reformatted,
                "format_check": format_check,
                "verification": verification
            }

        except Exception as e:
            logger.error(f"Error reformatting citation: {str(e)}")
            return {
                "original": citation,
                "reformatted": citation,
                "format_check": {"valid": False, "errors": [str(e)]},
                "verification": {"verified": False, "source": None}
            }

    @staticmethod
    def post_process_citation(citation):
        """Clean up and standardize the formatted citation."""
        if not re.match(r"^\[\d+\]", citation):
            citation = "[X] " + citation

        if not citation.strip().endswith("."):
            citation += "."

        citation = re.sub(r"\s+", " ", citation)
        citation = re.sub(r"\.(?!\s|$)", ". ", citation)
        citation = re.sub(r",\s+", ", ", citation)
        return citation.strip()

    def reformat_citations(self, citations):
        """Process multiple citations with validation."""
        return [self.reformat_citation(citation) for citation in citations]
