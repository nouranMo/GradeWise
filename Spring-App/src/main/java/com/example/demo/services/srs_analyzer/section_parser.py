import re
import logging

logger = logging.getLogger(__name__)

class SectionParser:
    PREDEFINED_STRUCTURES = {
        "SRS": {
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
        },
        "SDD": {
            "Abstract": {},
            "1 Introduction": {
                "1.1 Purpose": {},
                "1.2 Scope": {},
                "1.3 Intended audience": {},
                "1.4 Reference Material": {},
                "1.5 Definitions and Acronyms": {}
            },
            "2 System Overview": {
                "2.1 System Scope": {},
                "2.2 System objectives": {},
                "2.3 System Timeline": {}
            },
            "3 Design Viewpoints": {
                "3.1 Context viewpoint": {},
                "3.2 Composition Viewpoint": {},
                "3.3 Logical viewpoint": {},
                "3.4 Patterns use viewpoint": {},
                "3.5 Algorithm viewpoint": {},
                "3.6 Interaction viewpoint": {},
                "3.7 Interface viewpoint": {}
            },
            "4 Data Design": {
                "4.1 Data Description": {},
                "4.2 Database design description": {},
                "4.3 Data Models": {},
                "4.4 Database Schema": {}
            },
            "5 Human Interface Design": {
                "5.1 User Interface": {},
                "5.2 Screen Images": {},
                "5.3 Screen Objects and Actions": {},
            },
            "6 Requirements Matrix": {},
            "7 Appendices": {
                "7.1 Github": {},
                "7.2 Other appendices as appropriate": {},
            }
        }
    }

    @staticmethod
    def normalize_title(title):
        """Normalize section titles by stripping extra whitespace and standardizing case."""
        logger.debug(f"Normalizing title: {title}")
        # Remove leading/trailing whitespace, replace multiple spaces with single space
        normalized = re.sub(r'\s+', ' ', title.strip())
        logger.debug(f"Normalized title: {normalized}")
        return normalized

    @staticmethod
    def strip_numbering(title):
        """Remove numbering from section or subsection titles after normalization."""
        logger.debug(f"Stripping numbering from title: {title}")
        normalized = SectionParser.normalize_title(title)
        stripped = re.sub(r"^\d+(\.\d+)*\s*", "", normalized)
        logger.debug(f"Stripped title: {stripped}")
        return stripped

    @staticmethod
    def parse_sections(text, document_type):
        """Parse document into structured format, focusing on main sections only."""
        if document_type not in SectionParser.PREDEFINED_STRUCTURES:
            logger.error(f"Invalid document_type: {document_type}. Must be 'SRS' or 'SDD'.")
            raise ValueError("document_type must be 'SRS' or 'SDD'")

        logger.info(f"Starting section parsing for {document_type}")
        logger.debug(f"Input text length: {len(text)}")

        # Select the predefined structure based on document_type
        predefined_structure = SectionParser.PREDEFINED_STRUCTURES[document_type]
        main_sections = list(predefined_structure.keys())
        sections_dict = {}

        lines = text.splitlines()
        current_section = None
        current_content = []

        # Normalize predefined section titles for matching
        normalized_sections = {SectionParser.normalize_title(section): section for section in main_sections}

        # Create regex patterns for section matching
        section_patterns = {
            SectionParser.normalize_title(section): re.compile(
                rf'^{re.escape(SectionParser.normalize_title(section))}(?:\s|$)', re.IGNORECASE)
            for section in main_sections
        }

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Normalize the line for matching
            normalized_line = SectionParser.normalize_title(line)

            # Check if line matches any main section header
            matched_section = None
            for normalized_section, pattern in section_patterns.items():
                if pattern.match(normalized_line):
                    # Map back to the original section title from the predefined structure
                    matched_section = normalized_sections[normalized_section]
                    break

            if matched_section:
                # Save previous section content if exists
                if current_section and current_content:
                    content = ' '.join(current_content)
                    sections_dict[current_section] = content
                    logger.debug(f"Added section '{current_section}' with {len(content)} characters")

                current_section = matched_section
                current_content = []
                logger.debug(f"Found new section: {current_section}")
            elif current_section:
                current_content.append(line)

        # Add the last section
        if current_section and current_content:
            content = ' '.join(current_content)
            sections_dict[current_section] = content
            logger.debug(f"Added final section '{current_section}' with {len(content)} characters")

        logger.info(f"Parsed {len(sections_dict)} main sections for {document_type}")
        logger.debug(f"Found sections: {', '.join(sections_dict.keys())}")
        return sections_dict

    @staticmethod
    def validate_structure(parsed_data, document_type):
        """Validate the structure against the predefined structure."""
        if document_type not in SectionParser.PREDEFINED_STRUCTURES:
            logger.error(f"Invalid document_type: {document_type}. Must be 'SRS' or 'SDD'.")
            raise ValueError("document_type must be 'SRS' or 'SDD'")

        logger.info(f"Starting structure validation for {document_type}")
        logger.debug(f"Number of sections to validate: {len(parsed_data)}")

        # Select the predefined structure based on document_type
        predefined_structure = SectionParser.PREDEFINED_STRUCTURES[document_type]
        missing_sections = []
        extra_sections = []
        matching_sections = []
        misplaced_sections = []

        # Normalize predefined section titles
        normalized_predefined = {SectionParser.normalize_title(section): section for section in predefined_structure.keys()}
        # Normalize parsed section titles
        normalized_parsed = {SectionParser.normalize_title(section): section for section in parsed_data.keys()}

        # Check for missing sections
        for normalized_section, original_section in normalized_predefined.items():
            if normalized_section not in normalized_parsed:
                missing_sections.append(original_section)
            else:
                matching_sections.append(original_section)

        # Check for extra sections
        for normalized_section, original_section in normalized_parsed.items():
            if normalized_section not in normalized_predefined:
                extra_sections.append(original_section)

        # Check section order
        expected_order = list(predefined_structure.keys())
        # Map parsed sections to their normalized equivalents in the expected order
        actual_order = []
        for section in expected_order:
            normalized_section = SectionParser.normalize_title(section)
            for parsed_normalized, parsed_original in normalized_parsed.items():
                if parsed_normalized == normalized_section:
                    actual_order.append(section)
                    break

        # Compare order
        if actual_order != [s for s in expected_order if s in actual_order]:
            misplaced_sections.append("Sections are not in the expected order")

        validation_results = {
            "matching_sections": matching_sections,
            "missing_sections": missing_sections,
            "extra_sections": extra_sections,
            "misplaced_sections": misplaced_sections,
            "order_validation": "Order is correct" if not misplaced_sections else "Order is incorrect",
        }

        logger.info(f"Structure validation completed for {document_type}")
        return validation_results