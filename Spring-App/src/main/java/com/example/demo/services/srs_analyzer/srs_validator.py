import re
import logging
from image_processing import ImageProcessor

logger = logging.getLogger(__name__)

class SRSValidator:
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

    @staticmethod
    def strip_numbering(title):
        """Remove numbering from section or subsection titles."""
        logger.debug(f"Stripping numbering from title: {title}")
        stripped = re.sub(r"^\d+(\.\d+)*\s*", "", title.strip())
        logger.debug(f"Stripped title: {stripped}")
        return stripped

    @staticmethod
    def parse_srs(text):
        """Parse SRS document into structured format."""
        logger.info("Starting SRS parsing")
        logger.debug(f"Input text length: {len(text)}")
        
        parsed_data = []
        section_pattern = r"^\d+ [A-Za-z ]+"
        subsection_pattern = r"^\d+\.\d+ [A-Za-z ]+"
        page_number_pattern = r"^\d+$"
        dots_pattern = r"\.{2,}"

        current_section = None
        current_subsection = None
        current_content = ""
        
        lines = text.replace(" .", ".").replace(" ,", ",").replace(" :", ":").replace(" ;", ";").splitlines()
        
        content_lines = []
        content_started = False
        abstract_section = None

        logger.debug("Processing document lines")
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

        logger.debug(f"Found {len(content_lines)} content lines")
        for line in content_lines:
            logger.debug(f"Processing line: {line[:50]}...")  # Log first 50 chars
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
                    section_data = {
                        "title": current_section,
                        "content": current_content.strip()
                    }
                    if current_subsection:
                        section_data["subtitle"] = current_subsection
                    parsed_data.append(section_data)
                    current_content = ""
                
                current_section = line
                current_subsection = None
                
            elif current_section and re.match(subsection_pattern, line):
                if current_subsection and current_content:
                    section_data = {
                        "title": current_section,
                        "subtitle": current_subsection,
                        "content": current_content.strip()
                    }
                    parsed_data.append(section_data)
                    current_content = ""
                
                current_subsection = line
                
            else:
                current_content += line + " "
                current_content = re.sub(r'\s+', ' ', current_content)
                current_content = re.sub(r'([.,;])([A-Za-z])', r'\1 \2', current_content)
        
        if current_section and current_content:
            section_data = {
                "title": current_section,
                "content": current_content.strip()
            }
            if current_subsection:
                section_data["subtitle"] = current_subsection
            parsed_data.append(section_data)

        logger.info(f"Parsed {len(parsed_data)} sections")
        logger.debug("Parsed sections: " + ", ".join(d.get('title', 'Untitled') for d in parsed_data))
        return parsed_data

    @staticmethod
    def validate_srs_structure(parsed_data):
        """Validate the structure of an SRS document against the predefined structure."""
        logger.info("Starting SRS structure validation")
        logger.debug(f"Number of sections to validate: {len(parsed_data)}")
        
        missing_sections = []
        extra_sections = []
        matching_sections = []
        misplaced_sections = []
        misplaced_subsections = []

        # Flatten predefined structure with numbering intact
        predefined_flat = {
            section: list(subsections) 
            for section, subsections in SRSValidator.PREDEFINED_STRUCTURE.items()
        }

        # Simplified predefined structure without numbering
        simplified_predefined = {
            SRSValidator.strip_numbering(section): 
            [SRSValidator.strip_numbering(sub) for sub in subsections]
            for section, subsections in SRSValidator.PREDEFINED_STRUCTURE.items()
        }

        # Flatten parsed data
        parsed_flat = {}
        simplified_parsed = {}
        
        logger.debug("Processing parsed sections")
        for item in parsed_data:
            title = item.get("title", "").strip()
            subtitle = item.get("subtitle", "").strip()

            if not title:
                continue

            if title not in parsed_flat:
                parsed_flat[title] = []
            if subtitle:
                parsed_flat[title].append(subtitle)

            simplified_title = SRSValidator.strip_numbering(title)
            simplified_subtitle = SRSValidator.strip_numbering(subtitle)
            if simplified_title not in simplified_parsed:
                simplified_parsed[simplified_title] = []
            if simplified_subtitle:
                simplified_parsed[simplified_title].append(simplified_subtitle)

        # Validate structure
        parsed_order = list(parsed_flat.keys())
        predefined_order = list(predefined_flat.keys())

        logger.debug("Checking section order and presence")
        for predefined_index, predefined_section in enumerate(predefined_order):
            stripped_section = SRSValidator.strip_numbering(predefined_section)
            if predefined_section in parsed_flat:
                parsed_index = parsed_order.index(predefined_section)
                if parsed_index != predefined_index:
                    misplaced_sections.append(
                        f"Section '{predefined_section}' is misplaced. Found at index {parsed_index}, expected at {predefined_index}."
                    )
                else:
                    matching_sections.append(predefined_section)
            elif stripped_section in simplified_parsed:
                misplaced_sections.append(
                    f"Section '{predefined_section}' is misplaced or has incorrect numbering. Found as '{stripped_section}' in the parsed data."
                )
            else:
                missing_sections.append(predefined_section)

        logger.debug("Checking subsections")
        for section, predefined_subsections in predefined_flat.items():
            stripped_section = SRSValidator.strip_numbering(section)
            if stripped_section in simplified_parsed:
                parsed_subsections = simplified_parsed[stripped_section]
                for predefined_subsection_index, predefined_subsection in enumerate(predefined_subsections):
                    stripped_subsection = SRSValidator.strip_numbering(predefined_subsection)
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
                        missing_sections.append(f"{section} -> {predefined_subsection}")

        logger.debug("Checking for extra sections")
        for section, parsed_subsections in parsed_flat.items():
            stripped_section = SRSValidator.strip_numbering(section)
            if stripped_section not in simplified_predefined:
                extra_sections.append(section)
            else:
                for parsed_subsection in parsed_subsections:
                    stripped_subsection = SRSValidator.strip_numbering(parsed_subsection)
                    if stripped_subsection not in simplified_predefined[SRSValidator.strip_numbering(section)]:
                        extra_sections.append(f"{section} -> {parsed_subsection}")

        validation_results = {
            "matching_sections": matching_sections,
            "missing_sections": missing_sections,
            "extra_sections": extra_sections,
            "misplaced_sections": misplaced_sections,
            "misplaced_subsections": misplaced_subsections,
            "order_validation": "Order is correct" if not misplaced_sections and not misplaced_subsections else "Order is incorrect",
        }

        logger.info("SRS validation completed")
        return validation_results 
    
def process_pdf_and_validate(pdf_path, predefined_structure):
    """Process the PDF, extract images, and validate the SRS structure."""
    logger.info("Starting PDF processing and validation pipeline")
    
    # Step 1: Map pages to sections
    section_titles = list(predefined_structure.keys())
    section_map = ImageProcessor.map_pages_to_sections(pdf_path, section_titles)

    # Step 2: Extract images by section and ensure folder hierarchy
    section_image_paths = ImageProcessor.extract_images_by_section(pdf_path, section_map)
    logger.info(f"Extracted images organized by sections")

    # Step 3: Validate extracted content
    # Assume `parsed_data` is obtained from text extracted and parsed from the PDF
    parsed_data = SRSValidator.parse_srs(open(pdf_path, 'rb').read().decode('utf-8', errors='ignore'))
    validation_results = SRSValidator.validate_srs_structure(parsed_data)

    # Step 4: Combine results
    for section, images in section_image_paths.items():
        if not images and section in validation_results["missing_sections"]:
            logger.warning(f"No images found for section: {section}")
    
    logger.info("Processing and validation completed")
    return validation_results, section_image_paths

