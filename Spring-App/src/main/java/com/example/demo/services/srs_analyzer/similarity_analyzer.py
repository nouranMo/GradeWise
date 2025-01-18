from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging

logger = logging.getLogger(__name__)

class SimilarityAnalyzer:
    @staticmethod
    def create_similarity_matrix(scopes):
        logger.info("Creating similarity matrix")
        logger.debug(f"Number of scopes to compare: {len(scopes)}")
        
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform(scopes)
            # Calculate all similarities at once instead of loops
            similarity_matrix = cosine_similarity(tfidf_matrix)
            return similarity_matrix
        except Exception as e:
            logger.error(f"Error creating similarity matrix: {str(e)}")
            raise

    @staticmethod
    def compare_scopes(scope1, scope2):
        logger.debug("Comparing two scopes")
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([scope1, scope2])
            similarity = cosine_similarity(tfidf_matrix)[0][1]
            logger.debug(f"Similarity score: {similarity:.4f}")
            return similarity
        except Exception as e:
            logger.error(f"Error comparing scopes: {str(e)}")
            raise 