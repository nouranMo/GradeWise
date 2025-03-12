import re
import logging

logger = logging.getLogger(__name__)

class SectionParser:
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
    def parse_sections(text):
        """Parse document into structured format, focusing on main sections only."""
        logger.info("Starting section parsing")
        logger.debug(f"Input text length: {len(text)}")
        
        # Get main section titles
        main_sections = list(SectionParser.PREDEFINED_STRUCTURE.keys())
        sections_dict = {}
        
        lines = text.splitlines()
        current_section = None
        current_content = []
        
        # Create regex patterns for exact section matching
        section_patterns = {
            section: re.compile(rf'^{re.escape(section)}(?:\s|$)', re.IGNORECASE)
            for section in main_sections
        }
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if line matches any main section header exactly
            matched_section = None
            for section, pattern in section_patterns.items():
                if pattern.match(line):
                    matched_section = section
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
            
        logger.info(f"Parsed {len(sections_dict)} main sections")
        logger.debug("Found sections: " + ", ".join(sections_dict.keys()))
        return sections_dict

    @staticmethod
    def validate_structure(parsed_data):
        """Validate the structure against the predefined structure."""
        logger.info("Starting structure validation")
        logger.debug(f"Number of sections to validate: {len(parsed_data)}")
        
        missing_sections = []
        extra_sections = []
        matching_sections = []
        misplaced_sections = []
        
        # Check for missing sections
        for section in SectionParser.PREDEFINED_STRUCTURE.keys():
            if section not in parsed_data:
                missing_sections.append(section)
            else:
                matching_sections.append(section)
        
        # Check for extra sections
        for section in parsed_data:
            if section not in SectionParser.PREDEFINED_STRUCTURE:
                extra_sections.append(section)
        
        # Check section order
        expected_order = list(SectionParser.PREDEFINED_STRUCTURE.keys())
        actual_order = [s for s in expected_order if s in parsed_data]
        
        if actual_order != [s for s in expected_order if s in actual_order]:
            misplaced_sections.append("Sections are not in the expected order")
        
        validation_results = {
            "matching_sections": matching_sections,
            "missing_sections": missing_sections,
            "extra_sections": extra_sections,
            "misplaced_sections": misplaced_sections,
            "order_validation": "Order is correct" if not misplaced_sections else "Order is incorrect",
        }

        logger.info("Structure validation completed")
        return validation_results 