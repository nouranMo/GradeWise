import re
import logging
import difflib

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
            "7 Data Design": {},
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
        """Normalize section titles by stripping extra whitespace, converting to lowercase, and standardizing hyphens."""
        title = re.sub(r'[‐–—]', '-', title)
        normalized = re.sub(r'\s+', ' ', title.strip()).lower()
        return normalized

    @staticmethod
    def strip_numbering(title):
        """Remove numbering from section or subsection titles after normalization."""
        normalized = SectionParser.normalize_title(title)
        stripped = re.sub(r"^\d+(\.\d+)*\s*", "", normalized)
        return stripped

    @staticmethod
    def replace_dots_in_key(title):
        """Replace dots with underscores in titles to make them safe as dictionary keys."""
        return title.replace('.', '_')

    @staticmethod
    def parse_sections(text, document_type):
        """Parse document into structured format, capturing main sections and subsections."""
        if document_type not in SectionParser.PREDEFINED_STRUCTURES:
            logger.error(f"Invalid document_type: {document_type}. Must be 'SRS' or 'SDD'.")
            raise ValueError("document_type must be 'SRS' or 'SDD'")

        logger.info(f"Starting section parsing for {document_type}")
        logger.debug(f"Input text length: {len(text)}")

        predefined_structure = SectionParser.PREDEFINED_STRUCTURES[document_type]
        main_sections = list(predefined_structure.keys())
        sections_dict = {}

        lines = text.splitlines()
        current_main_section = None
        current_subsection = None
        current_content = []

        # Normalize predefined section titles
        stripped_sections = {SectionParser.strip_numbering(section): section for section in main_sections}
        subsection_patterns = {}
        for main_section in predefined_structure:
            subsections = predefined_structure[main_section]
            for subsection in subsections:
                subsection_patterns[SectionParser.normalize_title(subsection)] = subsection

        # Regex patterns
        numbered_section_pattern = re.compile(r'^\d+\s+[A-Za-z\s\-]+$', re.IGNORECASE)
        subsection_pattern = re.compile(r'^\d+\.\d+\s+[A-Za-z\s\-]+$', re.IGNORECASE)
        abstract_pattern = re.compile(r'^Abstract$', re.IGNORECASE)

        for line in lines:
            line = line.strip()
            if not line:
                continue

            normalized_line = SectionParser.normalize_title(line)
            is_main_section = False
            is_subsection = False
            raw_title = line

            # Check for main section
            if abstract_pattern.match(line):
                is_main_section = True
                stripped_line = normalized_line
            elif numbered_section_pattern.match(normalized_line):
                stripped_line = SectionParser.strip_numbering(normalized_line)
                predefined_stripped = [SectionParser.strip_numbering(s).lower() for s in main_sections]
                closest_matches = difflib.get_close_matches(stripped_line, predefined_stripped, n=1, cutoff=0.8)
                if closest_matches:
                    is_main_section = True
                    logger.debug(f"Fuzzy matched main section '{stripped_line}' to '{closest_matches[0]}'")

            # Check for subsection
            elif subsection_pattern.match(normalized_line):
                stripped_line = SectionParser.strip_numbering(normalized_line)
                predefined_subsections = [SectionParser.strip_numbering(s).lower() for s in subsection_patterns.keys()]
                closest_matches = difflib.get_close_matches(stripped_line, predefined_subsections, n=1, cutoff=0.8)
                if closest_matches:
                    is_subsection = True
                    logger.debug(f"Fuzzy matched subsection '{stripped_line}' to '{closest_matches[0]}'")

            if is_main_section:
                # Save previous section/subsection content
                if current_main_section:
                    if current_subsection:
                        safe_key = SectionParser.replace_dots_in_key(current_subsection)
                        sections_dict[current_main_section]["subsections"][safe_key] = ' '.join(current_content)
                        logger.debug(f"Added subsection '{current_subsection}' (key: '{safe_key}') under '{current_main_section}'")
                    elif current_content:
                        sections_dict[current_main_section]["content"] = ' '.join(current_content)
                        logger.debug(f"Added content to main section '{current_main_section}'")

                current_main_section = raw_title
                current_subsection = None
                current_content = []
                sections_dict[current_main_section] = {"content": "", "subsections": {}}
                logger.debug(f"Found new main section: {current_main_section}")

            elif is_subsection and current_main_section:
                # Save previous subsection content
                if current_subsection and current_content:
                    safe_key = SectionParser.replace_dots_in_key(current_subsection)
                    sections_dict[current_main_section]["subsections"][safe_key] = ' '.join(current_content)
                    logger.debug(f"Added subsection '{current_subsection}' (key: '{safe_key}') under '{current_main_section}'")

                current_subsection = raw_title
                current_content = []
                logger.debug(f"Found new subsection: {current_subsection} under {current_main_section}")

            elif current_main_section:
                current_content.append(line)
            else:
                logger.debug(f"Line not assigned to any section: {line}")

        # Save final section/subsection content
        if current_main_section and current_content:
            if current_subsection:
                safe_key = SectionParser.replace_dots_in_key(current_subsection)
                sections_dict[current_main_section]["subsections"][safe_key] = ' '.join(current_content)
                logger.debug(f"Added final subsection '{current_subsection}' (key: '{safe_key}') under '{current_main_section}'")
            else:
                sections_dict[current_main_section]["content"] = ' '.join(current_content)
                logger.debug(f"Added final content to main section '{current_main_section}'")

        logger.info(f"Parsed {len(sections_dict)} main sections for {document_type}")
        logger.debug(f"Found sections: {', '.join(sections_dict.keys())}")
        return sections_dict


    @staticmethod
    def validate_structure(parsed_data, document_type):
        """Validate main sections and subsections, flagging matching, missing, and misplaced with explanations."""
        if document_type not in SectionParser.PREDEFINED_STRUCTURES:
            logger.error(f"Invalid document_type: {document_type}. Must be 'SRS' or 'SDD'.")
            raise ValueError("document_type must be 'SRS' or 'SDD'")

        logger.info(f"Starting structure validation for {document_type}")
        logger.debug(f"Number of sections to validate: {len(parsed_data)}")

        predefined_structure = SectionParser.PREDEFINED_STRUCTURES[document_type]
        missing_sections = []
        extra_sections = []
        matching_sections = []
        misplaced_sections = []
        matching_subsections = []
        missing_subsections = []
        misplaced_subsections = []

        # Normalize main sections
        normalized_predefined = {SectionParser.normalize_title(section): section for section in predefined_structure.keys()}
        stripped_predefined = {SectionParser.strip_numbering(section): section for section in predefined_structure.keys()}
        normalized_parsed = {SectionParser.normalize_title(section): section for section in parsed_data.keys()}
        stripped_parsed = {SectionParser.strip_numbering(section): section for section in parsed_data.keys()}

        # Validate main sections
        print("\nChecking predefined main sections:")
        for normalized_section, original_section in normalized_predefined.items():
            stripped_section = SectionParser.strip_numbering(original_section).lower()
            print(f" - Checking '{original_section}' (stripped: '{stripped_section}')")
            found = False

            if normalized_section in normalized_parsed:
                matching_sections.append(original_section)
                print(f"   - Found with exact title: '{original_section}' -> Matching")
                found = True
            else:
                for parsed_stripped, parsed_section in stripped_parsed.items():
                    closest_matches = difflib.get_close_matches(
                        parsed_stripped.lower(), [stripped_section], n=1, cutoff=0.95)
                    if closest_matches:
                        found = True
                        parsed_normalized = SectionParser.normalize_title(parsed_section)
                        title_similarity = difflib.SequenceMatcher(
                            None, normalized_section, parsed_normalized).ratio()
                        logger.debug(f"Comparing main section titles: '{normalized_section}' vs '{parsed_normalized}' (similarity: {title_similarity})")

                        predefined_number = re.match(r'^\d+', original_section)
                        parsed_number = re.match(r'^\d+', parsed_section)
                        if predefined_number and parsed_number and predefined_number.group(0) == parsed_number.group(0):
                            print(f"   - Found with correct title and number: '{original_section}' -> Matching")
                            matching_sections.append(original_section)
                        else:
                            issue = f"Section was found as '{parsed_section}' but should be '{original_section}'"
                            print(f"   - Found with wrong title or number: '{original_section}' found as '{parsed_section}' -> Misplaced")
                            misplaced_sections.append(issue)
                        break

            if not found:
                print(f"   - Not found: '{original_section}' -> Missing")
                missing_sections.append(original_section)

        # Check for extra main sections
        print("\nChecking for extra main sections:")
        for normalized_section, original_section in normalized_parsed.items():
            stripped_section = SectionParser.strip_numbering(original_section).lower()
            predefined_stripped = [SectionParser.strip_numbering(s).lower() for s in predefined_structure.keys()]
            closest_matches = difflib.get_close_matches(
                stripped_section, predefined_stripped, n=1, cutoff=0.95)
            if not closest_matches and normalized_section not in normalized_predefined:
                print(f" - Found extra section: '{original_section}'")
                extra_sections.append(original_section)
            else:
                print(f" - Section '{original_section}' is expected, not extra")

        # Validate subsections for each main section
        print("\nChecking subsections:")
        for main_section in predefined_structure:
            if main_section in parsed_data:
                print(f"\nValidating subsections for main section '{main_section}':")
                predefined_subsections = predefined_structure[main_section]
                parsed_subsections = parsed_data[main_section].get("subsections", {})

                # Normalize subsection titles
                normalized_predefined_sub = {SectionParser.normalize_title(sub): sub for sub in predefined_subsections.keys()}
                stripped_predefined_sub = {SectionParser.strip_numbering(sub): sub for sub in predefined_subsections.keys()}
                normalized_parsed_sub = {SectionParser.normalize_title(sub.replace('_', '.')): sub for sub in parsed_subsections.keys()}
                stripped_parsed_sub = {SectionParser.strip_numbering(sub.replace('_', '.')): sub for sub in parsed_subsections.keys()}

                # Check predefined subsections
                for normalized_sub, original_sub in normalized_predefined_sub.items():
                    stripped_sub = SectionParser.strip_numbering(original_sub).lower()
                    print(f" - Checking subsection '{original_sub}' (stripped: '{stripped_sub}')")
                    found = False

                    if normalized_sub in normalized_parsed_sub:
                        matching_subsections.append(original_sub)
                        print(f"   - Found with exact title: '{original_sub}' -> Matching")
                        found = True
                    else:
                        for parsed_stripped_sub, parsed_sub in stripped_parsed_sub.items():
                            closest_matches = difflib.get_close_matches(
                                parsed_stripped_sub.lower(), [stripped_sub], n=1, cutoff=0.95)
                            if closest_matches:
                                found = True
                                parsed_normalized_sub = SectionParser.normalize_title(parsed_sub.replace('_', '.'))
                                title_similarity = difflib.SequenceMatcher(
                                    None, normalized_sub, parsed_normalized_sub).ratio()
                                logger.debug(f"Comparing subsection titles: '{normalized_sub}' vs '{parsed_normalized_sub}' (similarity: {title_similarity})")

                                predefined_number = re.match(r'^\d+\.\d+', original_sub)
                                parsed_number = re.match(r'^\d+\.\d+', parsed_sub.replace('_', '.'))
                                if predefined_number and parsed_number and predefined_number.group(0) == parsed_number.group(0):
                                    print(f"   - Found with correct title and number: '{original_sub}' -> Matching")
                                    matching_subsections.append(original_sub)
                                else:
                                    parsed_sub_original = parsed_sub.replace('_', '.')
                                    issue = f"Subsection was found as '{parsed_sub_original}' but should be '{original_sub}'"
                                    print(f"   - Found with wrong title or number: '{original_sub}' found as '{parsed_sub_original}' -> Misplaced")
                                    misplaced_subsections.append(issue)
                                break

                    if not found:
                        print(f"   - Not found: '{original_sub}' -> Missing")
                        missing_subsections.append(original_sub)

        # Check main section order
        print("\nChecking main section order:")
        expected_order = list(predefined_structure.keys())
        actual_order = []
        for parsed_section in parsed_data.keys():
            normalized_parsed_section = SectionParser.normalize_title(parsed_section)
            for predefined_section in predefined_structure.keys():
                if normalized_parsed_section == SectionParser.normalize_title(predefined_section):
                    actual_order.append(predefined_section)
                    print(f" - Parsed '{parsed_section}' maps to predefined '{predefined_section}'")
                    break
        print("Expected order:", expected_order)
        print("Actual order:", actual_order)

        order_correct = actual_order == expected_order[:len(actual_order)] and len(actual_order) <= len(expected_order)
        print("Order correct:", order_correct)

        validation_results = {
            "matching_sections": matching_sections,
            "missing_sections": missing_sections,
            "extra_sections": extra_sections,
            "misplaced_sections": misplaced_sections,
            "matching_subsections": matching_subsections,
            "missing_subsections": missing_subsections,
            "misplaced_subsections": misplaced_subsections,
            "order_validation": "Order is correct" if order_correct else "Order is incorrect",
        }

        print("\nFinal validation results:")
        print(validation_results)

        logger.info(f"Structure validation completed for {document_type}")
        return validation_results

    @staticmethod
    def parse_sections_content_analysis(text):
        """Parse document into sections for content analysis, focusing on SRS sections."""
        logger.info("Parsing sections for content analysis (SRS)")
        
        # Use the SRS predefined structure
        predefined_structure = SectionParser.PREDEFINED_STRUCTURES["SRS"]
        main_sections = list(predefined_structure.keys())
        sections_dict = {}
        
        lines = text.splitlines()
        current_section = None
        current_content = []
        
        # Create regex patterns for section matching
        section_patterns = {}
        for section in main_sections:
            # Create pattern that matches both exact and numbered variations
            stripped = SectionParser.strip_numbering(section)
            # Match either the exact section name or the stripped version with any numbering
            pattern = rf'^(?:{re.escape(section)}|(?:\d+(?:\.\d+)*)?\s*{re.escape(stripped)})(?:\s|$)'
            section_patterns[section] = re.compile(pattern, re.IGNORECASE)
        
        logger.debug(f"Created {len(section_patterns)} section patterns")
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line matches any main section header
            matched_section = None
            for section, pattern in section_patterns.items():
                if pattern.match(line):
                    matched_section = section
                    logger.debug(f"Line '{line}' matched section '{section}'")
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
        if sections_dict:
            logger.debug("Found sections: " + ", ".join(sections_dict.keys()))
        else:
            logger.warning("No sections were found in the document")
        
        return sections_dict