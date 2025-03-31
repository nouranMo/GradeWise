from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging
import openai
import os
from dotenv import load_dotenv
import json
from typing import List, Tuple, Dict

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
    def create_similarity_matrix(scopes: Dict[str, str]) -> List[List[float]]:
        """Create a similarity matrix comparing all scopes using TF-IDF and cosine similarity."""
        try:
            # Get all scope names and their content in order
            scope_names = list(scopes.keys())
            n = len(scope_names)
            
            # Initialize TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            # Create TF-IDF vectors for all scopes
            scope_texts = [scopes[name] for name in scope_names]
            tfidf_matrix = vectorizer.fit_transform(scope_texts)
            
            # Calculate cosine similarity matrix
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Convert to list format for JSON serialization
            matrix_list = similarity_matrix.tolist()
            
            return matrix_list
            
        except Exception as e:
            logger.error(f"Error creating similarity matrix: {str(e)}")
            # Return empty matrix in case of error
            return []

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