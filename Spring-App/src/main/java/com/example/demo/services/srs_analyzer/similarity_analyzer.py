from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    GEMINI_AVAILABLE = True
except Exception as e:
    logging.error(f"Error configuring Gemini API: {str(e)}")
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)

class SimilarityAnalyzer:
    @staticmethod
    def compare_sections_with_gemini(section1, section2, section1_name=None, section2_name=None):
        """Compare two sections using Gemini API."""
        if not GEMINI_AVAILABLE:
            logger.warning("Gemini API not available, falling back to TF-IDF")
            return SimilarityAnalyzer.compare_scopes(section1, section2)
            
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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
                # Regular section comparison (original)
                prompt = f"""
                Compare these two text sections and return a similarity score between 0 and 1.
                Only return the number, nothing else.
                
                Section 1:
                {section1}
                
                Section 2:
                {section2}
                """
            
            response = model.generate_content(prompt)
            score = float(response.text.strip())
            return min(max(score, 0), 1)  # Ensure score is between 0 and 1
            
        except Exception as e:
            logger.error(f"Error using Gemini for comparison: {str(e)}")
            return SimilarityAnalyzer.compare_scopes(section1, section2)

    @staticmethod
    def create_similarity_matrix(sections_dict):
        """Create similarity matrix from sections dictionary {section_name: content}."""
        logger.info("Creating similarity matrix")
        logger.debug(f"Number of sections to compare: {len(sections_dict)}")
        
        try:
            section_names = list(sections_dict.keys())
            section_contents = list(sections_dict.values())
            n = len(section_names)
            similarity_matrix = np.zeros((n, n))
            
            for i in range(n):
                for j in range(i, n):
                    if i == j:
                        similarity_matrix[i][j] = 1.0
                    else:
                        score = SimilarityAnalyzer.compare_sections_with_gemini(
                            section_contents[i], 
                            section_contents[j],
                            section_names[i],
                            section_names[j]
                        )
                        similarity_matrix[i][j] = score
                        similarity_matrix[j][i] = score
            
            return {
                'matrix': similarity_matrix,
                'section_names': section_names
            }
            
        except Exception as e:
            logger.error(f"Error creating similarity matrix: {str(e)}")
            raise

    @staticmethod
    def compare_scopes(scope1, scope2):
        """Fallback method using TF-IDF when Gemini is not available."""
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