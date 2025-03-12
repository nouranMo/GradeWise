import json
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

class BusinessValueEvaluator:
    def __init__(self):
        pass

    def extract_relevant_sections_for_llm(self, text: str) -> dict:
        """
        Extract relevant sections from the text for business value analysis.
        Returns a dictionary of section titles and their content.
        """
        logger.info("Extracting relevant sections for business value analysis")
        try:
            relevant_sections = {}
            relevant_keywords = [
                'introduction', 'overview', 'scope', 'purpose',
                'business', 'requirements', 'objectives', 'goals',
                'market', 'stakeholders', 'benefits', 'value',
                'executive summary'
            ]

            # Split text into sections based on numbered headings
            sections = text.split('\n')
            current_section = None
            current_content = []

            for line in sections:
                # Check for section headers (numbered format like "1.", "1.1", etc.)
                if any(line.strip().lower().startswith(str(i) + '.') for i in range(1, 10)):
                    # Save previous section if exists
                    if current_section and current_content:
                        content = '\n'.join(current_content).strip()
                        if content:
                            relevant_sections[current_section] = content
                    
                    current_section = line.strip()
                    current_content = []
                else:
                    if current_section:
                        current_content.append(line)

            # Add the last section
            if current_section and current_content:
                content = '\n'.join(current_content).strip()
                if content:
                    relevant_sections[current_section] = content

            # Filter sections based on relevant keywords
            filtered_sections = {
                title: content
                for title, content in relevant_sections.items()
                if any(keyword in title.lower() for keyword in relevant_keywords)
            }

            if not filtered_sections:
                logger.warning("No relevant sections found for business value analysis")
                # Take first few sections if no relevant sections found
                items = list(relevant_sections.items())[:3]
                filtered_sections = dict(items)

            logger.info(f"Extracted {len(filtered_sections)} relevant sections")
            return filtered_sections

        except Exception as e:
            logger.error(f"Error extracting relevant sections: {str(e)}")
            return {}
        
    def evaluate_business_value(self, text: str):
        """Load extracted sections, format prompt, and send to LLM for evaluation."""
        # First extract relevant sections
        extracted_data = self.extract_relevant_sections_for_llm(text)
        
        if not extracted_data:
            logger.warning("No relevant sections found for evaluation.")
            return {"status": "error", "message": "No relevant sections found."}

        document_content = "\n\n".join(
            f"## {section} ##\n{content}" for section, content in extracted_data.items()
        )

        prompt = (
            "You are an expert in evaluating Software Requirement Specifications (SRS) for business value.\n"
            "Analyze the following extracted content from an SRS document and provide a *concise overall evaluation* "
            "with a strict limit of *2 sentences per point* based on:\n"
            "- *Uniqueness*\n"
            "- *Market usefulness*\n"
            "- *Feasibility*\n"
            "- *Profitability*\n\n"
            "### Extracted SRS Content ###\n"
            f"{document_content}\n\n"
            "### Business Value Evaluation ###\n"
            "Provide a structured evaluation as follows *(maximum 2 sentences per point)*:\n\n"
            "* *Uniqueness:* [Brief evaluation in 2 sentences]\n"
            "* *Market Usefulness:* [Brief evaluation in 2 sentences]\n"
            "* *Feasibility:* [Brief evaluation in 2 sentences]\n"
            "* *Profitability:* [Brief evaluation in 2 sentences]\n\n"
            "Additionally:\n"
            "- Assign an *overall business value rating (1 to 10)*, where 1 is poor and 10 is excellent.\n"
            "- Categorize the rating as:\n"
            "  * *Very High* (9-10)\n"
            "  * *High* (7-8)\n"
            "  * *Moderate* (5-6)\n"
            "  * *Low* (3-4)\n"
            "  * *Very Low* (1-2)\n"
        )

        try:
            # Send the prompt to the LLM
            model = genai.GenerativeModel("gemini-2.0-flash") 
            response = model.generate_content(prompt)

            # Extract and print LLM response
            evaluation_result = response.text
            logger.info("Business value evaluation completed successfully")
            return {
                "status": "success",
                "Business Value Evaluation": evaluation_result
            }
        except Exception as e:
            logger.error(f"Error in LLM evaluation: {str(e)}")
            return {
                "status": "error",
                "message": f"Error during evaluation: {str(e)}"
            }