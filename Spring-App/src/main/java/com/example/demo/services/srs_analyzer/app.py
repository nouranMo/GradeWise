from config import create_app, Config
from text_processing import TextProcessor
from srs_validator import SRSValidator
from similarity_analyzer import SimilarityAnalyzer
from business_value_evaluator import BusinessValueEvaluator
from flask import request, jsonify, session, Flask, send_file
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import time
import os
from werkzeug.utils import secure_filename
import logging
import json
import subprocess
import sys
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from flask_cors import CORS
from simple_references_validator import SimpleReferencesValidator
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import openai

# Explicit path to YOLOv8
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Move up multiple levels to locate the project root (Spring-App's parent)
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../../../../../../../../.."))

# Dynamically construct the YOLOv path
YOLO_PATH = os.path.join(PROJECT_ROOT, "YOLOv")

# Add YOLOv8 to sys.path if not already included
if YOLO_PATH not in sys.path:
    sys.path.insert(0, YOLO_PATH)  # Insert at position 0 to prioritize this over installed packages

# Print sys.path to verify
print("PYTHON SEARCH PATHS:", sys.path)

# Import script correctly
import importlib.util

script_path = os.path.join(YOLO_PATH, "script.py")
spec = importlib.util.spec_from_file_location("script", script_path)
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)

# Now you can use process_image from script
process_image = script.process_image

logger = logging.getLogger(__name__)

app = create_app()
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 600
    }
})

GOOGLE_CLIENT_ID = Config.GOOGLE_CLIENT_ID

text_processor = TextProcessor()
similarity_analyzer = SimilarityAnalyzer()

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Create a thread pool for CPU-bound tasks
thread_pool = ThreadPoolExecutor(max_workers=4)

def handle_rate_limit(max_retries=3, initial_backoff=1):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return f(*args, **kwargs)
                except Exception as e:
                    if "RATE_LIMIT_EXCEEDED" in str(e):
                        wait_time = initial_backoff * (2 ** retries)
                        logger.warning(f"Rate limit exceeded. Retrying in {wait_time} seconds. Attempt {retries + 1}/{max_retries}")
                        time.sleep(wait_time)
                        retries += 1
                    else:
                        raise e
            
            # If we've exhausted all retries
            return jsonify({
                'status': 'error',
                'message': 'Rate limit exceeded after maximum retries'
            }), 429
        return wrapped
    return decorator

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/auth/google', methods=['OPTIONS'])
def handle_preflight():
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    try:
        # Get the token from the request
        data = request.get_json()
        token = data.get('credential')

        if not token:
            return jsonify({'error': 'No token provided'}), 400

        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID)

        # Get user info from the token
        user_data = {
            'email': idinfo['email'],
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
            'given_name': idinfo.get('given_name', ''),
            'family_name': idinfo.get('family_name', '')
        }

        # Store user data in session
        session['user'] = user_data

        response = jsonify({
            'status': 'success',
            'user': user_data
        })

        return response

    except ValueError as e:
        logger.error(f"Token validation failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Invalid token'
        }), 401
    except Exception as e:
        logger.error(f"Google authentication failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        return jsonify({
            'status': 'success',
            'message': 'Logged out successfully'
        })
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/auth/session', methods=['GET'])
def check_session():
    try:
        if 'user' in session:
            return jsonify({
                'status': 'authenticated',
                'user': session['user']
            })
        return jsonify({
            'status': 'unauthenticated'
        }), 401
    except Exception as e:
        logger.error(f"Session check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

def analyze_document(file_path: str, analyses: Dict) -> Dict:
    """Analyze a single document."""
    print("\n" + "="*50)
    print("ANALYZE DOCUMENT FUNCTION")
    print("="*50)
    print(f"File path: {file_path}")
    print(f"Selected analyses: {json.dumps(analyses, indent=2)}")
    
    try:
        response = {'status': 'success'}

        # Extract text if needed for any analysis
        pdf_text = None
        if any([analyses.get('SrsValidation'), 
                analyses.get('ContentAnalysis'),
                analyses.get('BusinessValueAnalysis'),
                analyses.get('SpellCheck')]):
            print("\nExtracting text for analyses...")
            pdf_text = text_processor.extract_text_from_pdf(file_path)
            print(f"Extracted text length: {len(pdf_text)}")

        # Check if reference validation is selected
        if analyses.get('ReferencesValidation'):
            print("\nSTARTING REFERENCE VALIDATION")
            print("-"*30)
            
            try:
                print("Calling SimpleReferencesValidator.validate_references_in_pdf")
                references_results = SimpleReferencesValidator.validate_references_in_pdf(file_path)
                print("\nReference validation results:")
                print(json.dumps(references_results, indent=2))
                
                if references_results:
                    print("Reference validation successful, adding to response")
                    # Transform the results into the format expected by the frontend
                    transformed_results = {
                        "status": "success",
                        "reference_details": [{
                            "reference": ref.get("reference", ""),
                            "reference_number": ref.get("reference_number", ""),
                            "is_cited": ref.get("is_cited", False),
                            "citations_in_document": ref.get("citations", []),
                            "citation_count": ref.get("citation_count", 0),
                            "online_verification": {
                                "verified": ref.get("is_verified", False),
                                "source": ref.get("verification", {}).get("source", ""),
                                "url": ref.get("verification", {}).get("url", ""),
                                "title": ref.get("verification", {}).get("title", "")
                            },
                            "format_validation": ref.get("format_validation", {})
                        } for ref in references_results.get("references", [])],
                        "statistics": {
                            "total_references": references_results.get("statistics", {}).get("total", 0),
                            "cited_references": references_results.get("statistics", {}).get("cited", 0),
                            "uncited_references": references_results.get("statistics", {}).get("uncited", 0),
                            "verified_references": references_results.get("statistics", {}).get("verified", 0),
                            "valid_references": references_results.get("statistics", {}).get("valid_format", 0)
                        },
                        "reference_validation": {
                            "status": "valid" if all(ref.get("is_valid_format", False) for ref in references_results.get("references", [])) else "invalid",
                            "validation_details": [ref.get("format_validation", {}) for ref in references_results.get("references", [])]
                        }
                    }
                    response['references_validation'] = transformed_results
                else:
                    print("WARNING: No reference results returned")
                    response['references_validation'] = {
                        'status': 'error',
                        'message': 'No references found or error during validation'
                    }
            except Exception as e:
                print("\nERROR IN REFERENCE VALIDATION:")
                print(f"Exception type: {type(e)}")
                print(f"Exception message: {str(e)}")
                import traceback
                print("Traceback:")
                traceback.print_exc()
                response['references_validation'] = {
                    'status': 'error',
                    'message': f'Error during reference validation: {str(e)}'
                }

        if analyses.get('SrsValidation'):
            print("\nSTARTING SRS VALIDATION")
            print("-"*30)
            try:
                parsed_srs = SRSValidator.parse_srs(pdf_text)
                validation_results = SRSValidator.validate_srs_structure(parsed_srs)
                response['srs_validation'] = {
                    'structure_validation': validation_results,
                    'parsed_sections': parsed_srs
                }
                print("SRS validation completed")
            except Exception as e:
                print(f"Error in SRS validation: {str(e)}")
                response['srs_validation'] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('SpellCheck') and not analyses.get('ContentAnalysis'):
            print("\nSTARTING SPELL CHECK")
            print("-"*30)
            try:
                spell_check_results = text_processor.check_spelling_and_grammar(pdf_text)
                if spell_check_results:
                    misspelled_count = len(spell_check_results.get('misspelled', {}))
                    response['spelling_check'] = {
                        'status': 'success',
                        'misspelled_words': spell_check_results.get('misspelled', {}),
                        'misspelled_count': misspelled_count,
                        'checked_text_length': len(pdf_text)
                    }
                print("Spell check completed")
            except Exception as e:
                print(f"Error in spell check: {str(e)}")
                response['spelling_check'] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('ContentAnalysis'):
            print("\nSTARTING CONTENT ANALYSIS")
            print("-"*30)
            try:
                content_analysis = {
                    "sections": [],
                    "similarity_matrix": [],
                    "scope_sources": [],
                    "figures_included": False,
                    "figure_count": 0
                }

                print("Parsing document sections...")
                sections = text_processor.parse_document_sections(pdf_text)
                content_analysis["sections"] = sections
                print(f"Found {len(sections)} sections")

                all_scopes = {}
                print("\nCreating system scopes for sections...")
                for section in sections:
                    title, content = section.split('\n', 1)
                    if content.strip():
                        try:
                            scope = similarity_analyzer.create_system_scope_with_gpt(content)
                            all_scopes[title] = scope
                            print(f"Created scope for section: {title}")
                        except Exception as e:
                            print(f"Error creating scope for section {title}: {str(e)}")
                            continue

                print("\nProcessing diagrams...")
                sections_dict = {section.split('\n', 1)[0]: section.split('\n', 1)[1] for section in sections}
                figures = text_processor._find_figures_in_sections(sections_dict)
                
                diagram_scopes = text_processor.extract_diagrams_from_pdf(file_path)
                if diagram_scopes:
                    content_analysis["figures_included"] = True
                    content_analysis["figure_count"] = len(diagram_scopes)
                    all_scopes.update(diagram_scopes)
                    print(f"Added {len(diagram_scopes)} diagram scopes")

                if all_scopes:
                    print("\nCreating similarity matrix...")
                    section_titles = [section.split('\n', 1)[0] for section in sections]
                    if diagram_scopes:
                        section_titles.extend(diagram_scopes.keys())
                    
                    content_analysis["scope_sources"] = section_titles
                    content_analysis["similarity_matrix"] = similarity_analyzer.create_similarity_matrix(all_scopes)
                    print(f"Created similarity matrix with {len(section_titles)} scopes")

                diagram_count = len([scope for scope in content_analysis["scope_sources"] if scope.startswith("Diagram_")])
                important_diagrams = [scope for scope in content_analysis["scope_sources"] if any(
                    diagram_type in scope.lower() for diagram_type in [
                        "system overview", "system context", "use case", "eerd",
                        "entity relationship", "class diagram", "gantt chart"
                    ]
                )]

                response["content_analysis"] = {
                    "similarity_matrix": content_analysis["similarity_matrix"],
                    "scope_sources": content_analysis["scope_sources"],
                    "figures_included": content_analysis["figures_included"],
                    "figure_count": content_analysis["figure_count"],
                    "important_diagrams": important_diagrams,
                    "sections": sections,
                    "diagram_analysis": {
                        "total_diagrams": diagram_count,
                        "important_diagrams": important_diagrams,
                        "diagram_scopes": diagram_scopes
                    }
                }
                print("Content analysis completed")

            except Exception as e:
                print(f"Error in content analysis: {str(e)}")
                response["content_analysis"] = {
                    "error": "An error occurred during content analysis",
                    "details": str(e)
                }

        if analyses.get('BusinessValueAnalysis'):
            print("\nSTARTING BUSINESS VALUE ANALYSIS")
            print("-"*30)
            try:
                evaluator = BusinessValueEvaluator()
                evaluation_result = evaluator.evaluate_business_value(pdf_text)
                response['business_value_analysis'] = evaluation_result
                print("Business value analysis completed")
            except Exception as e:
                print(f"Error in business value analysis: {str(e)}")
                response['business_value_analysis'] = {
                    'status': 'error',
                    'message': str(e)
                }

        print("\nAnalysis completed successfully")
        print("Final response:", json.dumps(response, indent=2))
        return response

    except Exception as e:
        print("\nERROR IN ANALYZE_DOCUMENT:")
        print(f"Exception type: {type(e)}")
        print(f"Exception message: {str(e)}")
        import traceback
        print("Traceback:")
        traceback.print_exc()
        return {
            'status': 'error',
            'message': str(e)
        }

@app.route('/analyze_document', methods=['POST'])
def analyze_document_route():
    print("\n" + "="*50)
    print("ANALYZE DOCUMENT ROUTE")
    print("="*50)
    
    try:
        # Check if PDF file is present
        if 'pdfFile' not in request.files:
            print("No PDF file provided in request")
            return jsonify({'error': 'No PDF file provided'}), 400

        # Get the PDF file
        pdf_file = request.files['pdfFile']
        if not pdf_file.filename:
            print("Empty PDF file provided")
            return jsonify({'error': 'Empty PDF file provided'}), 400

        # Get analyses from form data
        analyses_str = request.form.get('analyses', '{}')
        print(f"Raw analyses string: {analyses_str}")
        
        try:
            analyses = json.loads(analyses_str)
            print(f"Parsed analyses: {json.dumps(analyses, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Error parsing analyses JSON: {e}")
            return jsonify({'error': 'Invalid analyses format'}), 400

        # Save the file temporarily
        filename = secure_filename(pdf_file.filename)
        unique_filename = f"{int(time.time())}_{filename}"
        save_path = os.path.join('uploads', unique_filename)
        
        # Create uploads directory if it doesn't exist
        os.makedirs('uploads', exist_ok=True)
        
        # Save the file
        pdf_file.save(save_path)
        print(f"PDF saved to: {save_path}")
        print(f"File size: {os.path.getsize(save_path)} bytes")

        try:
            # Start analysis
            print("\nStarting analysis...")
            results = analyze_document(save_path, analyses)
            print("\nAnalysis completed successfully")
            print(f"Final response: {json.dumps(results, indent=2)}")
            
            return jsonify(results)
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(save_path):
                    os.remove(save_path)
                    print(f"Temporary file removed: {save_path}")
            except Exception as e:
                print(f"Error removing temporary file: {e}")

    except Exception as e:
        print(f"\nError in analyze_document_route: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/generate_recommendations', methods=['POST'])
@limiter.limit("5 per minute")
@handle_rate_limit(max_retries=3, initial_backoff=2)
def generate_recommendations():
    try:
        data = request.json
        parsing_result = data.get('parsingResult')
        
        if not parsing_result:
            return jsonify({
                'status': 'error',
                'message': 'No parsing result provided'
            }), 400
        
        current_time = time.time()
        if hasattr(generate_recommendations, 'last_call_time'):
            time_diff = current_time - generate_recommendations.last_call_time
            if time_diff < 0.1:  # Minimum 100ms between API calls
                return jsonify({
                    'status': 'error',
                    'message': 'Too many requests, please slow down'
                }), 429
        
        generate_recommendations.last_call_time = current_time

        # Format analysis summary
        summary = []
        
        # Business Value Analysis
        if "business_value_analysis" in parsing_result:
            summary.append("Business Value Analysis:")
            summary.append(parsing_result["business_value_analysis"].get("Business Value Evaluation", "Not available"))

        # SRS Structure
        if "srs_validation" in parsing_result:
            srs = parsing_result["srs_validation"]
            if "structure_validation" in srs:
                summary.append("\nSRS Structure:")
                summary.append(f"Missing sections: {', '.join(srs['structure_validation'].get('missing_sections', []))}")
                summary.append(f"Present sections: {', '.join(srs['structure_validation'].get('matching_sections', []))}")

        # References
        if "references_validation" in parsing_result:
            summary.append("\nReferences Analysis:")
            refs = parsing_result["references_validation"]
            if "reformatted_references" in refs:
                issues = sum(1 for ref in refs["reformatted_references"] if ref.get("errors"))
                summary.append(f"Found {issues} references with formatting issues")

        # Content Analysis
        if "content_analysis" in parsing_result:
            summary.append("\nContent Analysis:")
            if "similarity_matrix" in parsing_result["content_analysis"]:
                summary.append("Content similarity analysis completed")

        # Image Analysis
        if "image_analysis" in parsing_result:
            summary.append("\nImage Analysis:")
            images = parsing_result["image_analysis"].get("processed_images", [])
            summary.append(f"Analyzed {len(images)} images")

        analysis_summary = "\n".join(summary)

        # Generate recommendations using OpenAI
        prompt = f"""
        As an expert SRS document analyzer, review these analysis results and provide specific, actionable recommendations.
        Focus on improvements across all analyzed aspects.

        Analysis Results:
        {analysis_summary}

        Generate 3-5 specific recommendations that:
        1. Address the most critical issues first
        2. Suggest concrete improvements
        3. Acknowledge strong points that should be maintained
        4. Consider both technical and business aspects

        Format each recommendation as a clear, actionable item.
        Use markdown bullet points (*) for each recommendation.
        """

        def call_openai_with_retry(prompt, max_attempts=3):
            for attempt in range(max_attempts):
                try:
                    response = openai.ChatCompletion.create(
                        model="gpt-4",
                        messages=[
                            {"role": "system", "content": "You are an expert SRS document analyzer. Provide clear, actionable recommendations."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=1000
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    if "rate_limit" in str(e).lower():
                        if attempt < max_attempts - 1:
                            wait_time = 2 ** attempt
                            logger.warning(f"OpenAI API rate limit hit. Waiting {wait_time} seconds...")
                            time.sleep(wait_time)
                            continue
                    raise e

        recommendations = call_openai_with_retry(prompt)

        return jsonify({
            'status': 'success',
            'recommendations': recommendations
        })

    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'status': 'error',
        'message': 'Rate limit exceeded. Please try again later.',
        'retry_after': e.description
    }), 429

def check_plagiarism(text, reference_docs):
    """
    Check plagiarism using TF-IDF and cosine similarity
    """
    try:
        # Combine the input text with reference documents
        all_docs = [text] + reference_docs
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(stop_words='english')
        
        # Transform documents into TF-IDF vectors
        tfidf_matrix = vectorizer.fit_transform(all_docs)
        
        # Calculate cosine similarity between the input text and reference documents
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
        
        # Get the maximum similarity score
        max_similarity = similarities.max()
        
        return {
            'similarity_score': float(max_similarity),
            'is_plagiarized': max_similarity > 0.7,  # Threshold of 70% similarity
            'message': 'High similarity detected' if max_similarity > 0.7 else 'No significant similarity found'
        }
    except Exception as e:
        return {
            'error': str(e),
            'similarity_score': 0,
            'is_plagiarized': False,
            'message': 'Error during plagiarism check'
        }

@app.route('/check_plagiarism', methods=['POST'])
@limiter.limit("5 per minute")
@handle_rate_limit(max_retries=3, initial_backoff=2)
def check_plagiarism_route():
    try:
        if 'pdfFile' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400

        # Get the PDF file
        pdf_file = request.files['pdfFile']
        filename = secure_filename(pdf_file.filename)
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{filename}"
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save the file
        pdf_file.save(pdf_path)

        try:
            # Extract text from PDF
            pdf_text = text_processor.extract_text_from_pdf(pdf_path)
            
            # Get reference documents from a predefined directory
            reference_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'reference_docs')
            reference_docs = []
            
            if os.path.exists(reference_dir):
                for ref_file in os.listdir(reference_dir):
                    if ref_file.endswith('.pdf'):
                        ref_path = os.path.join(reference_dir, ref_file)
                        ref_text = text_processor.extract_text_from_pdf(ref_path)
                        reference_docs.append(ref_text)
            
            # Check plagiarism
            result = check_plagiarism(pdf_text, reference_docs)
            
            return jsonify(result)
            
        finally:
            # Clean up the temporary file
            try:
                os.remove(pdf_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary file {pdf_path}: {str(e)}")

    except Exception as e:
        logger.error(f"Error during plagiarism check: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask server on port 5000")
    app.run(debug=True, port=5000)