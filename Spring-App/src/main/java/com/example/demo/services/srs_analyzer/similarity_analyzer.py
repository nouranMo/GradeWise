from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging
import openai
import os
from dotenv import load_dotenv
import json
from typing import List, Tuple, Dict
import math
import re

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure OpenAI API
OPENAI_AVAILABLE = False
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    try:
        openai.api_key = api_key
        OPENAI_AVAILABLE = True
        logger.info("OpenAI API key loaded successfully")
    except Exception as e:
        logging.error(f"Error setting OpenAI API key: {str(e)}")
else:
    logging.error("OpenAI API key not found in environment variables")

class SimilarityAnalyzer:
    @staticmethod
    def compare_sections_with_gpt(section1, section2, section1_name=None, section2_name=None):
        """Compare two sections using GPT-4-mini."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI API not available, falling back to TF-IDF")
            return SimilarityAnalyzer.compare_scopes(section1, section2)
            
        try:
            # Check if either section is a figure
            is_figure1 = section1_name and "Figure:" in section1_name
            is_figure2 = section2_name and "Figure:" in section2_name
            
            if is_figure1 and is_figure2:
                # Figure to figure comparison
                prompt = f"""
                Compare these two diagrams based on their extracted text and return a similarity score between 0 and 1.
                Only return the number, nothing else.
                
                Diagram 1: {section1_name}
                Text: {section1}
                
                Diagram 2: {section2_name}
                Text: {section2}
                """
            elif is_figure1 or is_figure2:
                # Figure to text comparison
                figure_name = section1_name if is_figure1 else section2_name
                figure_text = section1 if is_figure1 else section2
                section_text = section2 if is_figure1 else section1
                section_name = section2_name if is_figure1 else section1_name
                
                prompt = f"""
                Compare this diagram text to this document section and return a similarity score between 0 and 1.
                Only return the number, nothing else.
                
                Diagram: {figure_name}
                Text: {figure_text}
                
                Section: {section_name}
                Text: {section_text}
                """
            else:
                # Regular section comparison
                prompt = f"""
                Compare these two text sections and return a similarity score between 0 and 1.
                Only return the number, nothing else.
                
                Section 1:
                {section1}
                
                Section 2:
                {section2}
                """
            
            logger.debug(f"Sending request to OpenAI with prompt: {prompt[:100]}...")
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a similarity analyzer. Return only a number between 0 and 1 representing the similarity between the given texts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )
            
            logger.debug(f"Received response from OpenAI: {response.choices[0].message.content}")
            try:
                score = float(response.choices[0].message.content.strip())
                logger.debug(f"Converted score: {score}")
                return min(max(score, 0), 1)
            except ValueError as ve:
                logger.error(f"Failed to convert response to float: {response.choices[0].message.content}")
                return SimilarityAnalyzer.compare_scopes(section1, section2)
            
        except Exception as e:
            logger.error(f"Error using GPT-3.5-turbo for comparison: {str(e)}", exc_info=True)
            return SimilarityAnalyzer.compare_scopes(section1, section2)

    @staticmethod
    def create_system_scope_with_gpt(text: str) -> str:
        """Create a system scope using GPT-3.5-turbo."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI API not available, falling back to basic scope creation")
            return text
            
        try:
            prompt = f"""
            Create a concise system scope from this text. Focus on:
            1. Main system components
            2. Key functionalities
            3. Important relationships
            4. Critical requirements
            
            Format the scope as:
            System: [Main system name/description]
            Components: [List of main components]
            Functions: [List of key functions]
            Requirements: [List of critical requirements]
            
            Text to analyze:
            {text}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a system scope analyzer. Create clear, structured system scopes."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error creating system scope with GPT: {str(e)}")
            return text

    @staticmethod
    def create_diagram_scope_with_gpt(diagram_result: dict) -> str:
        """Create a system scope from diagram analysis using GPT-3.5-turbo."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI API not available, falling back to basic diagram scope")
            return str(diagram_result)
            
        try:
            # Format diagram information for GPT
            diagram_info = f"""
            Diagram Type: {diagram_result.get('diagram_type', 'Unknown')}
            
            Components:
            {json.dumps(diagram_result.get('components', []), indent=2)}
            
            Relationships:
            {json.dumps(diagram_result.get('relationships', []), indent=2)}
            """
            
            prompt = f"""
            Create a concise system scope from this diagram analysis. Focus on:
            1. Main system components and their roles
            2. Key relationships between components
            3. System boundaries and interfaces
            4. Critical interactions
            
            Format the scope as:
            System: [Main system name/description]
            Components: [List of main components and their roles]
            Relationships: [List of key relationships]
            Boundaries: [System boundaries and interfaces]
            
            Diagram Analysis:
            {diagram_info}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a diagram analyzer. Create clear, structured system scopes from diagrams."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error creating diagram scope with GPT: {str(e)}")
            return str(diagram_result)

    @staticmethod
    def compare_scopes(scope1, scope2):
        """Fallback method using TF-IDF when OpenAI is not available."""
        logger.debug("Using TF-IDF for comparison")
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([scope1, scope2])
            similarity = cosine_similarity(tfidf_matrix)[0][1]
            logger.debug(f"Similarity score: {similarity:.4f}")
            return similarity
        except Exception as e:
            logger.error(f"Error comparing scopes: {str(e)}")
            raise 

    def determine_section_type(self, section_title):
        """
        Determine the type of a section based on its title.
        
        Args:
            section_title (str): The title of the section
            
        Returns:
            str: The type of the section (requirements, design, etc.)
        """
        title_lower = section_title.lower()
        
        # Define patterns for different section types
        section_patterns = {
            'requirements': ['requirement', 'functional', 'non-functional', 'use case'],
            'system_description': ['description', 'overview', 'introduction', 'system'],
            'architecture': ['architecture', 'design', 'component', 'structure'],
            'data_design': ['data', 'database', 'storage', 'entity'],
            'ui_design': ['interface', 'ui', 'user interface', 'screen'],
            'testing': ['test', 'validation', 'verification'],
            'deployment': ['deployment', 'installation', 'configuration'],
            'diagram': ['diagram', 'figure', 'chart', 'graph']
        }
        
        # Check if the title matches any pattern
        for section_type, patterns in section_patterns.items():
            for pattern in patterns:
                if pattern in title_lower:
                    return section_type
        
        # Check for specific diagram types
        diagram_types = {
            'use_case_diagram': ['use case diagram', 'use-case'],
            'class_diagram': ['class diagram', 'object diagram'],
            'sequence_diagram': ['sequence diagram', 'interaction'],
            'activity_diagram': ['activity diagram', 'workflow'],
            'er_diagram': ['er diagram', 'entity relationship', 'eerd'],
            'component_diagram': ['component diagram'],
            'deployment_diagram': ['deployment diagram'],
            'state_diagram': ['state diagram', 'state machine']
        }
        
        for diagram_type, patterns in diagram_types.items():
            for pattern in patterns:
                if pattern in title_lower:
                    return diagram_type
        
        # Default to 'other' if no match is found
        return 'other'

    def should_compare_sections(self, section_type1, section_type2):
        """
        Determine if two sections should be compared based on their types.
        
        Args:
            section_type1 (str): The type of the first section
            section_type2 (str): The type of the second section
            
        Returns:
            bool: True if the sections should be compared, False otherwise
        """
        # Define which section types should be compared
        comparison_rules = {
            'requirements': ['system_description', 'use_case_diagram', 'class_diagram'],
            'system_description': ['requirements', 'architecture', 'component_diagram'],
            'architecture': ['system_description', 'component_diagram', 'deployment_diagram'],
            'data_design': ['class_diagram', 'er_diagram'],
            'ui_design': ['requirements', 'activity_diagram'],
            'testing': ['requirements'],
            'deployment': ['architecture', 'deployment_diagram'],
            'use_case_diagram': ['requirements', 'activity_diagram'],
            'class_diagram': ['requirements', 'data_design', 'er_diagram'],
            'sequence_diagram': ['requirements', 'use_case_diagram'],
            'activity_diagram': ['requirements', 'use_case_diagram'],
            'er_diagram': ['data_design', 'class_diagram'],
            'component_diagram': ['architecture'],
            'deployment_diagram': ['architecture', 'deployment'],
            'state_diagram': ['requirements']
        }
        
        # Check if the sections should be compared
        if section_type1 in comparison_rules and section_type2 in comparison_rules[section_type1]:
            return True
        if section_type2 in comparison_rules and section_type1 in comparison_rules[section_type2]:
            return True
        
        return False

    def generate_relationship_analysis(self, section1_title, section1_content, section2_title, section2_content, similarity_score):
        """
        Generate a meaningful analysis of the relationship between two sections.
        
        Args:
            section1_title (str): The title of the first section
            section1_content (str): The content of the first section
            section2_title (str): The title of the second section
            section2_content (str): The content of the second section
            similarity_score (float): The similarity score between the sections
            
        Returns:
            dict: An analysis of the relationship
        """
        # Determine the types of the sections
        section1_type = self.determine_section_type(section1_title)
        section2_type = self.determine_section_type(section2_title)
        
        # Create a prompt for GPT-4 to analyze the relationship
        prompt = f"""
        Analyze the relationship between these two sections from a software documentation:
        
        SECTION 1 ({section1_type}): {section1_title}
        {section1_content[:500]}...
        
        SECTION 2 ({section2_type}): {section2_title}
        {section2_content[:500]}...
        
        The calculated similarity score is {similarity_score:.2f}.
        
        Please provide:
        1. A brief description of how these sections relate to each other
        2. Key elements that are consistent between the sections
        3. Any inconsistencies or missing elements
        4. A recommendation for improving the alignment between these sections
        
        Format your response as JSON with the following structure:
        {{
            "relationship_strength": "Strong|Moderate|Weak",
            "description": "Brief description of the relationship",
            "consistent_elements": ["Element 1", "Element 2", ...],
            "inconsistencies": ["Inconsistency 1", "Inconsistency 2", ...],
            "recommendation": "A specific recommendation"
        }}
        """
        
        try:
            # Call OpenAI API
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800
            )
            
            # Parse the response
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)
            
            # Add the section types and similarity score
            analysis['section1_type'] = section1_type
            analysis['section2_type'] = section2_type
            analysis['similarity_score'] = similarity_score
            
            return analysis
        except Exception as e:
            print(f"Error generating relationship analysis: {e}")
            return {
                "relationship_strength": "Unknown",
                "description": "Failed to generate analysis",
                "consistent_elements": [],
                "inconsistencies": [],
                "recommendation": "Please try again",
                "section1_type": section1_type,
                "section2_type": section2_type,
                "similarity_score": similarity_score,
                "error": str(e)
            }

    def create_filtered_similarity_matrix(self, all_scopes):
        """
        Create a filtered similarity matrix that only includes meaningful comparisons.
        
        Args:
            all_scopes (dict): A dictionary of section titles and their content
            
        Returns:
            tuple: A tuple containing the filtered matrix, section titles, and relationship analyses
        """
        # Get all section titles
        section_titles = list(all_scopes.keys())
        
        # Determine the type of each section
        section_types = {title: self.determine_section_type(title) for title in section_titles}
        
        # Create an empty matrix
        n = len(section_titles)
        matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        # Create a dictionary to store relationship analyses
        relationship_analyses = {}
        
        # Fill the matrix with similarity scores for sections that should be compared
        for i in range(n):
            for j in range(i+1, n):  # Only compute upper triangle
                title1 = section_titles[i]
                title2 = section_titles[j]
                type1 = section_types[title1]
                type2 = section_types[title2]
                
                # Check if these sections should be compared
                if self.should_compare_sections(type1, type2):
                    # Calculate similarity
                    content1 = all_scopes[title1]
                    content2 = all_scopes[title2]
                    similarity = self.calculate_cosine_similarity(content1, content2)
                    
                    # Apply a scaling factor to increase the similarity scores
                    scaled_similarity = self.scale_similarity_score(similarity)
                    
                    # Store the similarity score
                    matrix[i][j] = scaled_similarity
                    matrix[j][i] = scaled_similarity  # Mirror for lower triangle
                    
                    # If the similarity is above a threshold, generate an analysis
                    if scaled_similarity > 0.3:  # Adjust threshold as needed
                        analysis_key = f"{title1}|{title2}"
                        analysis = self.generate_relationship_analysis(
                            title1, content1, title2, content2, scaled_similarity
                        )
                        relationship_analyses[analysis_key] = analysis
                else:
                    # Set to 0 for sections that shouldn't be compared
                    matrix[i][j] = 0.0
                    matrix[j][i] = 0.0
        
        return matrix, section_titles, relationship_analyses

    def scale_similarity_score(self, similarity):
        """
        Scale the similarity score to make small differences more noticeable.
        
        Args:
            similarity (float): The original similarity score
            
        Returns:
            float: The scaled similarity score
        """
        # Apply a sigmoid function to amplify differences in the middle range
        if similarity < 0.1:
            return 0.0  # Filter out very low similarities
        
        # Apply a power function to increase mid-range values
        # This will map 0.3 -> ~0.5, 0.5 -> ~0.7, 0.7 -> ~0.9
        scaled = similarity ** 0.5
        
        # Ensure the result is between 0 and 1
        return min(max(scaled, 0.0), 1.0)

    def calculate_cosine_similarity(self, text1, text2):
        """
        Calculate the cosine similarity between two texts using domain-specific embeddings.
        
        Args:
            text1 (str): The first text
            text2 (str): The second text
            
        Returns:
            float: The cosine similarity between the texts
        """
        try:
            # Preprocess the texts
            text1 = self.preprocess_text_for_similarity(text1)
            text2 = self.preprocess_text_for_similarity(text2)
            
            # Get embeddings using OpenAI's text-embedding-3 model
            client = openai.OpenAI()
            
            # Get embedding for text1
            response1 = client.embeddings.create(
                model="text-embedding-3-small",
                input=text1,
                dimensions=1536
            )
            embedding1 = response1.data[0].embedding
            
            # Get embedding for text2
            response2 = client.embeddings.create(
                model="text-embedding-3-small",
                input=text2,
                dimensions=1536
            )
            embedding2 = response2.data[0].embedding
            
            # Calculate cosine similarity
            dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
            magnitude1 = math.sqrt(sum(a * a for a in embedding1))
            magnitude2 = math.sqrt(sum(b * b for b in embedding2))
            
            if magnitude1 * magnitude2 == 0:
                return 0.0
            
            similarity = dot_product / (magnitude1 * magnitude2)
            return similarity
        except Exception as e:
            print(f"Error calculating cosine similarity: {e}")
            return 0.0

    def preprocess_text_for_similarity(self, text):
        """
        Preprocess text for similarity calculation, emphasizing domain-specific terms.
        
        Args:
            text (str): The text to preprocess
            
        Returns:
            str: The preprocessed text
        """
        # Truncate long texts to avoid token limits
        if len(text) > 8000:
            text = text[:8000]
        
        # Emphasize important software engineering terms by repeating them
        important_terms = [
            "user", "system", "data", "interface", "requirement", "function", 
            "class", "object", "database", "api", "service", "component",
            "module", "architecture", "design", "test", "validation"
        ]
        
        # Create a regex pattern to match whole words only
        pattern = r'\b(' + '|'.join(important_terms) + r')\b'
        
        # Replace matches with the term repeated (e.g., "user" -> "user user")
        emphasized_text = re.sub(pattern, lambda m: m.group(0) + " " + m.group(0), text, flags=re.IGNORECASE)
        
        return emphasized_text 

    def analyze_diagram_relationships(self, similarity_matrix, scope_sources):
        """
        Analyze relationships between diagrams and text sections
        
        Args:
            similarity_matrix: The similarity matrix between all sections
            scope_sources: List of section names
            
        Returns:
            dict: Dictionary containing diagram relationships analysis
        """
        print(f"Starting diagram relationship analysis with {len(scope_sources)} sections")
        diagram_relationships = []
        
        # Define important diagram types
        important_diagram_types = [
            "System Overview", "System Context", "Use Case", 
            "EERD", "Entity Relationship", "Class Diagram", "Gantt Chart"
        ]
        
        # Identify diagram sections
        diagram_sections = []
        for i, section in enumerate(scope_sources):
            # Check if section is a diagram using multiple methods
            is_diagram = False
            
            # Method 1: Check if it's in our list of important diagrams
            if any(diagram_type in section for diagram_type in important_diagram_types):
                is_diagram = True
                
            # Method 2: Check if it starts with "Diagram_" or "Figure:"
            if section.startswith("Diagram_") or section.startswith("Figure:"):
                is_diagram = True
                
            # Method 3: Use the existing is_figure_section method
            if self.is_figure_section(section):
                is_diagram = True
                
            if is_diagram:
                diagram_sections.append((i, section))
                print(f"Found diagram section: {section}")
        
        print(f"Found {len(diagram_sections)} diagram sections: {[s[1] for s in diagram_sections]}")
        
        # If no diagrams found, try to use the important_diagrams list directly
        if not diagram_sections:
            print("No diagrams found in scope_sources, checking for important diagrams in sections")
            for i, section in enumerate(scope_sources):
                for diagram_type in important_diagram_types:
                    if diagram_type.lower() in section.lower():
                        diagram_sections.append((i, section))
                        print(f"Found diagram by name match: {section}")
                        break
        
        # Find relationships between diagrams and text sections
        for diagram_idx, diagram_name in diagram_sections:
            # Find the top 3 most related text sections for each diagram
            related_sections = []
            
            for i, section in enumerate(scope_sources):
                if i != diagram_idx and not self.is_figure_section(section):
                    similarity = similarity_matrix[diagram_idx][i]
                    if similarity > 0.3:  # Only include if similarity is above threshold
                        related_sections.append({
                            "section": section,
                            "similarity": similarity
                        })
            
            # Sort by similarity (highest first) and take top 3
            related_sections.sort(key=lambda x: x["similarity"], reverse=True)
            top_related = related_sections[:3]
            
            if top_related:
                diagram_relationships.append({
                    "diagram": diagram_name,
                    "related_sections": top_related
                })
        
        result = {
            "diagram_relationships": diagram_relationships,
            "diagram_count": len(diagram_sections)
        }
        
        print(f"Generated {len(diagram_relationships)} diagram relationships")
        print(f"Diagram relationships: {diagram_relationships}")
        
        return result

    def is_figure_section(self, section_name):
        """
        Check if a section is a diagram/figure
        
        Args:
            section_name: Name of the section
            
        Returns:
            bool: True if the section is a diagram/figure, False otherwise
        """
        if not section_name:
            return False
        
        # Debug print to see what section names we're checking
        print(f"Checking if section is a figure: {section_name}")
        
        # Check for exact matches with important diagram types
        important_diagrams = [
            "System Overview", "System Context", "Use Case", 
            "EERD", "Entity Relationship", "Class Diagram", "Gantt Chart"
        ]
        
        if section_name in important_diagrams:
            print(f"Found exact match for diagram: {section_name}")
            return True
        
        # Check for partial matches
        lower_name = section_name.lower()
        is_diagram = any(term in lower_name for term in [
            'diagram', 'figure', 'chart', 'graph', 'eerd', 
            'uml', 'class diagram', 'sequence diagram', 
            'use case', 'entity relationship'
        ])
        
        if is_diagram:
            print(f"Found diagram by pattern match: {section_name}")
        
        return is_diagram

    def analyze_content(self, sections, important_diagrams=None):
        """
        Analyze the content of a document.
        
        Args:
            sections (list): A list of document sections
            important_diagrams (list, optional): A list of important diagram types
            
        Returns:
            dict: A dictionary containing the analysis results
        """
        try:
            # Extract section titles and content
            all_scopes = {section.split('\n')[0]: section for section in sections}
            
            # Create the filtered similarity matrix
            similarity_matrix, scope_sources, relationship_analyses = self.create_filtered_similarity_matrix(all_scopes)
            
            # Analyze diagram relationships
            diagram_analysis = self.analyze_diagram_relationships(similarity_matrix, scope_sources)
            
            # Count figures in the document
            figure_count = sum(1 for section in sections if "Figure" in section)
            
            # Prepare the result
            result = {
                "sections": sections,
                "scope_sources": scope_sources,
                "similarity_matrix": similarity_matrix,
                "relationship_analyses": relationship_analyses,
                "diagram_analysis": diagram_analysis,
                "figure_count": figure_count,
                "figures_included": figure_count > 0,
                "important_diagrams": important_diagrams or []
            }
            
            return result
        except Exception as e:
            logger.error(f"Error analyzing content: {str(e)}")
            raise 