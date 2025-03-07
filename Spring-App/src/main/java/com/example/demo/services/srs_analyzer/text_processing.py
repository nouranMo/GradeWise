import re
import json
import language_tool_python
from spellchecker import SpellChecker
from transformers import pipeline
import torch
from PyPDF2 import PdfReader
import logging
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
        self.CUSTOM_TERMS = ['qanna', 'srs'] #Hopefully grammarly API and remove this
        

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

    @staticmethod
    def strip_numbering(title: str) -> str:
        """Remove numbering from a section title (e.g., '1.2 Title' -> 'Title')."""
        return re.sub(r'^\d+(\.\d+)*\s+', '', title).strip()

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

    def extract_sections_with_figures(self, text):
        """
        Extract sections and associate them with figure captions.
        Returns a list of dictionaries with section title, content, and figure positions.
        """
        logger.info("Extracting sections with figure captions")
        sections = []
        figures = []
        current_section = None

        lines = text.splitlines()
        for line in lines:
            section_match = re.match(r'^\d+(\.\d+)*\s+[A-Z]', line)  # Detect section titles
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

        logger.info(f"Extracted {len(sections)} sections with {len(figures)} figures")
        return sections, figures

    def parse_document_sections(self, text):
        """Parse document into logical segments based on sections, handling 'Abstract' separately."""
        logger.info("Parsing document sections")
        print("\n--- Parsing Document Sections ---\n")  # Debug message

        segments = []
        current_segment = ""
        found_abstract = False  # Flag to check if 'Abstract' is detected

        try:
            lines = text.splitlines()
            for line in lines:  
                if re.match(r'^\d+(\.\d+)* [A-Z]', line):  # New section/subsection (numbered)
                    if current_segment:
                        segments.append(current_segment.strip())
                        print(f"\nExtracted Section:\n{current_segment.strip()}\n")  # Print extracted section
                        logger.debug(f"Added segment of length: {len(current_segment)}")
                    current_segment = line + "\n"

                elif line.strip().lower() == "abstract" and not found_abstract:  # Detect 'Abstract'
                    if current_segment:  
                        segments.append(current_segment.strip())  # Save previous section
                    current_segment = "Abstract\n"  # Start 'Abstract' section
                    found_abstract = True  # Mark 'Abstract' as found

                else:
                    current_segment += line + "\n"

            if current_segment:
                segments.append(current_segment.strip())
                print(f"\nExtracted Section:\n{current_segment.strip()}\n")  # Print last extracted section

            logger.info(f"Parsed {len(segments)} sections")
            print(f"\nTotal Sections Parsed: {len(segments)}")  # Print total sections count
            return segments

        except Exception as e:
            logger.error(f"Error parsing document sections: {str(e)}")
            print(f"Error parsing document: {str(e)}")  # Print error in terminal
        raise

    def get_section_for_text(self, text, sections):
        """Helper function to find which section a given piece of text belongs to."""
        for section in sections:
            if text in section:
                return section.splitlines()[0]  # Return the section title
        return None

    def parse_document_sections_with_pages(self, pdf_path):
        """Parse sections and associate them with page numbers."""
        logger.info("Parsing document sections with page numbers")
        sections = []
        try:
            reader = PdfReader(pdf_path)
            last_valid_section = None

            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                has_text = bool(text.strip())  # Check if the page has meaningful text

                lines = text.splitlines() if text else []
                for line in lines:
                    if re.match(r'^\d+(\.\d+)* [A-Z]', line):  # Section/subsection pattern
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

    @async_operation
    def extract_relevant_sections_for_llm(self, sections_list):
            """Convert list of section strings to dict, match required sections, and save to JSON."""
            
            required_keys = {
                "Abstract": "Abstract",
                "1.3 Business Context": "Business Context",
                "3.1 Problem Statement": "Problem Statement",
                "3.3 System Scope": "System Scope",
                "3.4 Objectives": "Objectives"
            }

            filtered_sections = {}
            sections_dict = {}

            #  Convert list of section strings to dictionary {title: content}
            for section in sections_list:
                lines = section.split("\n")
                if len(lines) > 1:  # Ensure section has a title and content
                    title = lines[0].strip()
                    content = "\n".join(lines[1:]).strip()
                    stripped_title = self.strip_numbering(title)  # Remove numbering like '3.1'
                    sections_dict[stripped_title] = content

            logger.debug(f"Available section keys: {list(sections_dict.keys())}")

            #  Handle "Abstract" separately since it's missing
            for i, section in enumerate(sections_list):
                if section.lower().startswith("abstract"):
                    lines = section.split("\n")
                    content = "\n".join(lines[1:]).strip()
                    filtered_sections["Abstract"] = content
                    logger.info(f"✅ Extracted Abstract section")
                    break  # Stop after finding the first "Abstract"

            #  Match extracted sections with required keys
            for key, expected_title in required_keys.items():
                if expected_title in sections_dict:
                    filtered_sections[key] = sections_dict[expected_title]
                    logger.info(f" Extracted Section: {key}")

            if not filtered_sections:
                logger.error("No required sections found. JSON will be empty.")

            # Save to JSON
            with open("filtered_sections.json", "w", encoding="utf-8") as json_file:
                json.dump(filtered_sections, json_file, indent=4, ensure_ascii=False)

            logger.info(" Filtered sections saved to 'filtered_sections.json'")

            return filtered_sections