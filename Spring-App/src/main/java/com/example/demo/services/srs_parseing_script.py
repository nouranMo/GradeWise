import os
from flask import Flask, render_template, request, jsonify, current_app
from flask_cors import CORS  # Import CORS from flask_cors
from PyPDF2 import PdfReader
import re
import language_tool_python
from spellchecker import SpellChecker

# Initialize Grammar and Spell Checkers
grammar_tool = language_tool_python.LanguageTool('en-US')
spell_checker = SpellChecker()
# List of custom terms to ignore
CUSTOM_TERMS = ['qanna', 'srs']

# Configuration Class
class Config:
    UPLOAD_FOLDER = 'uploads/'
    ALLOWED_EXTENSIONS = {'pdf'}
    
    @staticmethod
    def init_app(app):
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)  # Ensure the uploads folder exists

# Helper Functions
def extract_text_from_pdf(filepath):
    """Extract text from the given PDF file."""
    reader = PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def strip_numbering(title):
    """Remove numbering from section or subsection titles."""
    return re.sub(r"^\d+(\.\d+)*\s*", "", title.strip())

def check_spelling_and_grammar(text):
    try:
        # Join split words with a hyphen 
        text = re.sub(r'(\w)- (\w)', r'\1\2', text)  
        text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)  
        clean_text = re.sub(r'[^\w\s\'-]', '', text)
    
        words = clean_text.split()
        misspelled = spell_checker.unknown(words)

        misspelled = {
            word: spell_checker.correction(word) 
            for word in words 
            if word.lower() not in CUSTOM_TERMS and not re.match(r"\w+'s$", word)
            and word in spell_checker.unknown([word])
        }
        
        misspelled = {word: spell_checker.correction(word) for word in misspelled if word.lower() not in CUSTOM_TERMS}
        
        for term in CUSTOM_TERMS:
            if term in words:
                misspelled[term] = term
        
        misspelled = {word: correction for word, correction in misspelled.items() if correction is not None}

        grammar_issues = grammar_tool.check(text)
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
        
        return misspelled, grammar_suggestions
    
    except Exception as e:
        print(f"Error in spelling/grammar check: {e}")
        return {}, []

# SRS Parsing
def parse_srs(text):
    parsed_data = []
    section_pattern = r"^\d+ [A-Za-z ]+"  # Matches main section titles
    subsection_pattern = r"^\d+\.\d+ [A-Za-z ]+"  # Matches subsection titles
    page_number_pattern = r"^\d+$"  # Matches standalone page numbers
    dots_pattern = r"\.{2,}"  # Matches rows of dots, often used in TOCs

    current_section = None
    current_subsection = None
    current_content = ""
    
    lines = text.replace(" .", ".").replace(" ,", ",").replace(" :", ":").replace(" ;", ";").splitlines()
    
    content_lines = []
    content_started = False
    abstract_section = None

    for line in lines:
        line = line.strip()
        
        if re.match(page_number_pattern, line) or re.match(dots_pattern, line):
            continue
        
        if "Abstract" in line:
            content_started = True
            abstract_section = {"title": "Abstract", "content": ""}
            continue
        
        if content_started and line:
            content_lines.append(line)

    for line in content_lines:
        if abstract_section and re.match(section_pattern, line) and "Introduction" in line:
            parsed_data.append(abstract_section)
            abstract_section = None
            current_section = line
            current_subsection = None
            current_content = ""
        elif abstract_section:
            abstract_section["content"] += line + " "
        
        elif re.match(section_pattern, line):  
            if current_section and current_content:
                spelling, grammar = check_spelling_and_grammar(current_content)
                section_data = {"title": current_section, "content": current_content.strip(), "spelling_issues": spelling, "grammar_issues": grammar}
                if current_subsection:
                    section_data["subtitle"] = current_subsection
                parsed_data.append(section_data)
                current_content = ""
            
            current_section = line
            current_subsection = None
            
        elif current_section and re.match(subsection_pattern, line):
            if current_subsection and current_content:
                spelling, grammar = check_spelling_and_grammar(current_content)
                section_data = {"title": current_section, "subtitle": current_subsection, "content": current_content.strip(), "spelling_issues": spelling, "grammar_issues": grammar}
                parsed_data.append(section_data)
                current_content = ""
            
            current_subsection = line
            
        else:
            current_content += line + " "
            current_content = re.sub(r'\s+', ' ', current_content)
            current_content = re.sub(r'([.,;])([A-Za-z])', r'\1 \2', current_content)
    
    if current_section and current_content:
        spelling, grammar = check_spelling_and_grammar(current_content)
        section_data = {"title": current_section, "content": current_content.strip(), "spelling_issues": spelling, "grammar_issues": grammar}
        if current_subsection:
            section_data["subtitle"] = current_subsection
        parsed_data.append(section_data)

    print("Parsed SRS Structure:", parsed_data)

    return parsed_data


# SRS Structure
PREDEFINED_STRUCTURE = {
    "Abstract": {},
    "1 Introduction": {
        "1.1 Purpose of this document": {},
        "1.2 Scope of this document": {},
        "1.3 Business Context": {}
    },
    "2 Similar Systems": {
        "2.1 Academic": {},
        "2.2 Business Applications": {}
    },
    "3 System Description": {
        "3.1 Problem Statement": {},
        "3.2 System Overview": {},
        "3.3 System Scope": {},
        "3.4 System Context": {},
        "3.5 Objectives": {},
        "3.6 User Characteristics": {}
    },
    "4 Functional Requirements": {
        "4.1 System Functions": {},
        "4.2 Detailed Functional Specification": {}
    },
    "5 Design Constraints": {
        "5.1 Standards Compliance": {},
        "5.2 Hardware Limitations": {},
        "5.3 Other Constraints as appropriate": {}
    },
    "6 Non-functional Requirements": {},
    "7 Data Base": {},
    "8 Preliminary Object-Oriented Domain Analysis": {},
    "9 Operational Scenarios": {},
    "10 Project Plan": {},
    "11 Appendices": {
        "11.1 Definitions, Acronyms, Abbreviations": {},
        "11.2 Supportive Documents": {}
    }
}

# SRS Validation
def validate_srs_structure(parsed_data, predefined_structure):
    """Validate the structure of an SRS document against a predefined structure."""
    missing_sections = []
    extra_sections = []
    matching_sections = []
    misplaced_sections = []  # List misplaced sections with details
    misplaced_subsections = []  # List misplaced subsections with details

    # Flatten predefined structure with numbering intact
    predefined_flat = {
        section: list(subsections) for section, subsections in predefined_structure.items()
    }

    # Simplified predefined structure without numbering
    simplified_predefined = {
        strip_numbering(section): [strip_numbering(sub) for sub in subsections]
        for section, subsections in predefined_structure.items()
    }

    # Flatten parsed data
    parsed_flat = {}
    simplified_parsed = {}
    for item in parsed_data:
        title = item.get("title", "").strip()
        subtitle = item.get("subtitle", "").strip()

        if not title:
            continue

        # Flatten parsed structure with numbering intact
        if title not in parsed_flat:
            parsed_flat[title] = []
        if subtitle:
            parsed_flat[title].append(subtitle)

        # Simplified parsed structure without numbering
        simplified_title = strip_numbering(title)
        simplified_subtitle = strip_numbering(subtitle)
        if simplified_title not in simplified_parsed:
            simplified_parsed[simplified_title] = []
        if simplified_subtitle:
            simplified_parsed[simplified_title].append(simplified_subtitle)

    # Identify missing, misplaced, and matching sections
    parsed_order = list(parsed_flat.keys())
    predefined_order = list(predefined_flat.keys())

    for predefined_index, predefined_section in enumerate(predefined_order):
        stripped_section = strip_numbering(predefined_section)
        if predefined_section in parsed_flat:
            # Section exists in parsed data; check order
            parsed_index = parsed_order.index(predefined_section)
            if parsed_index != predefined_index:
                misplaced_sections.append(
                    f"Section '{predefined_section}' is misplaced. Found at index {parsed_index}, expected at {predefined_index}."
                )
            else:
                matching_sections.append(predefined_section)
        elif stripped_section in simplified_parsed:
            # Section exists without correct numbering or title variation
            misplaced_sections.append(
                f"Section '{predefined_section}' is misplaced or has incorrect numbering. Found as '{stripped_section}' in the parsed data."
            )
        else:
            # Section is entirely missing
            missing_sections.append(predefined_section)

    # Identify missing and misplaced subsections
    for section, predefined_subsections in predefined_flat.items():
        stripped_section = strip_numbering(section)
        if stripped_section in simplified_parsed:
            # Check subsections for matching or misplacement
            parsed_subsections = simplified_parsed[stripped_section]
            for predefined_subsection_index, predefined_subsection in enumerate(predefined_subsections):
                stripped_subsection = strip_numbering(predefined_subsection)
                if stripped_subsection in parsed_subsections:
                    parsed_index = parsed_subsections.index(stripped_subsection)
                    if parsed_index != predefined_subsection_index:
                        misplaced_subsections.append(
                            f"Subsection '{predefined_subsection}' in section '{section}' is misplaced. "
                            f"Found at position {parsed_index}, expected at {predefined_subsection_index}."
                        )
                    else:
                        matching_sections.append(f"{section} -> {predefined_subsection}")
                else:
                    # Subsection is missing
                    missing_sections.append(f"{section} -> {predefined_subsection}")
        else:
            # If section is missing, all its subsections are also missing
            for predefined_subsection in predefined_subsections:
                missing_sections.append(f"{section} -> {predefined_subsection}")

    # Identify extra sections and subsections
    for section, parsed_subsections in parsed_flat.items():
        stripped_section = strip_numbering(section)
        if stripped_section not in simplified_predefined:
            extra_sections.append(section)
        else:
            for parsed_subsection in parsed_subsections:
                stripped_subsection = strip_numbering(parsed_subsection)
                if stripped_subsection not in simplified_predefined[strip_numbering(section)]:
                    extra_sections.append(f"{section} -> {parsed_subsection}")

    # Prepare the comparison results
    comparison_results = {
        "matching_sections": matching_sections,
        "missing_sections": missing_sections,
        "extra_sections": extra_sections,
        "misplaced_sections": misplaced_sections,
        "misplaced_subsections": misplaced_subsections,
        "order_validation": "Order is correct" if not misplaced_sections and not misplaced_subsections else "Order is incorrect",
    }

    return comparison_results


# Flask App Setup
app = Flask(__name__)
app.config.from_object(Config)
Config.init_app(app)

# Enable CORS for all routes
CORS(app)
# CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:3000"}})
# Upload PDF Blueprint
@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    if 'pdfFile' not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400

    pdf_file = request.files['pdfFile']
    filename = pdf_file.filename
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    try:
        pdf_file.save(save_path)
        pdf_text = extract_text_from_pdf(save_path)
        parsed_srs = parse_srs(pdf_text)
        validation_results = validate_srs_structure(parsed_srs, PREDEFINED_STRUCTURE)
        return jsonify({
            "parsed_srs": parsed_srs,
            "validation_results": validation_results
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__ == "__main__":
    app.run(debug=True,port=5001)
