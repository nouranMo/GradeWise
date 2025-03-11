from config import create_app, Config
from text_processing import TextProcessor
from image_processing import ImageProcessor
from srs_validator import SRSValidator
from similarity_analyzer import SimilarityAnalyzer
from references_validation.references_validator import ReferencesValidator
from business_value_evaluator import BusinessValueEvaluator
from flask import request, jsonify, session
import google.generativeai as genai
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

genai.configure(api_key=Config.GEMINI_API_KEY)

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
image_processor = ImageProcessor()
similarity_analyzer = SimilarityAnalyzer()

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

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

@app.route('/analyze_document', methods=['POST'])
@limiter.limit("5 per minute")
@handle_rate_limit(max_retries=3, initial_backoff=2)
def analyze_document():
    logger.info("Starting document analysis")
    
    if 'pdfFile' not in request.files:
        logger.error("No PDF file provided in request")
        return jsonify({"error": "No PDF file provided"}), 400

    try:
        # Get selected analyses
        analyses = request.form.get('analyses')
        if not analyses:
            return jsonify({"error": "No analyses selected"}), 400
            
        analyses = json.loads(analyses)
        
        # Save PDF
        pdf_file = request.files['pdfFile']
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(pdf_file.filename))
        pdf_file.save(pdf_path)
        logger.info(f"PDF saved to: {pdf_path}")

        # Initialize response dictionary
        response = {'status': 'success'}

        # Extract text only if needed for any of the text-based analyses
        pdf_text = None
        if any([analyses.get('SrsValidation'), 
                analyses.get('ContentAnalysis'),
                analyses.get('BusinessValueAnalysis')]):
            pdf_text = text_processor.extract_text_from_pdf(pdf_path)

        # Initialize these variables only if needed for ContentAnalysis
        all_scopes = []
        scope_sources = []
        spelling_grammar_results = []

        # Perform selected analyses
        if analyses.get('SrsValidation'):
            logger.debug("Performing SRS validation")
            parsed_srs = SRSValidator.parse_srs(pdf_text)
            validation_results = SRSValidator.validate_srs_structure(parsed_srs)
            response['srs_validation'] = {
                'structure_validation': validation_results,
                'parsed_sections': parsed_srs
            }

        if analyses.get('ReferencesValidation'):
            logger.debug("Performing references validation")
            references_results = ReferencesValidator.validate_references_in_pdf(pdf_path)
            if references_results and 'reformatted_references' in references_results:
                response['references_validation'] = references_results
            else:
                logger.error("Invalid references validation result structure")
                response['references_validation'] = {
                    'reformatted_references': [],
                    'status': 'error',
                    'message': 'Failed to process references'
                }

        if analyses.get('ContentAnalysis'):
            logger.info("Starting content analysis")  # Added log
            try:
                logger.info("Parsing document sections")
                sections = text_processor.parse_document_sections(pdf_text)
                logger.info(f"Successfully parsed {len(sections)} sections")  # Added log
                
                logger.info("Starting section scope generation")  # Added log
                # Process text sections
                for i, section in enumerate(sections):
                    try:
                        logger.info(f"Processing section {i+1}/{len(sections)}")  # Added log
                        scope = text_processor.generate_section_scope(section)
                        all_scopes.append(scope)
                        scope_sources.append(f"Section {i+1}")
                    except Exception as e:
                        logger.error(f"Error processing section {i+1}: {str(e)}")
                        continue  # Continue with next section even if one fails

                logger.info("Starting image processing")  # Added log
                # Process images for content analysis
                image_paths = image_processor.extract_images_from_pdf(pdf_path)
                logger.info(f"Found {len(image_paths)} images")  # Added log

                for i, img_path in enumerate(image_paths):
                    try:
                        logger.info(f"Processing image {i+1}/{len(image_paths)}")  # Added log
                        image_text = image_processor.extract_text_from_image(img_path)
                        if image_text.strip():
                            scope = text_processor.generate_section_scope(image_text)
                            all_scopes.append(scope)
                            scope_sources.append(f"Image {i+1}")
                    except Exception as e:
                        logger.error(f"Error processing image {i+1}: {str(e)}")
                        continue  # Continue with next image even if one fails

                logger.info("Creating similarity matrix")  # Added log
                similarity_matrix = similarity_analyzer.create_similarity_matrix(all_scopes)
                logger.info("Similarity matrix created successfully")  # Added log

                response['content_analysis'] = {
                    'similarity_matrix': similarity_matrix.tolist(),
                    'scope_sources': scope_sources,
                    'scopes': all_scopes,
                    # 'spelling_grammar': spelling_grammar_results
                }
                logger.info("Content analysis completed successfully")  # Added log

            except Exception as e:
                logger.error(f"Error in content analysis: {str(e)}", exc_info=True)
                response['content_analysis'] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('ImageAnalysis'):
            logger.debug("Processing images for image analysis")
            try:
                # Extract images from PDF
                image_paths = image_processor.extract_images_from_pdf(pdf_path)
                processed_images = []

                for i, img_path in enumerate(image_paths):
                    try:
                        # Process each image
                        image_info = {
                            'image_index': i + 1,
                            'path': img_path,
                            'extracted_text': '',
                            'analysis_results': {}
                        }

                        # Extract text from image
                        image_text = image_processor.extract_text_from_image(img_path)
                        if image_text.strip():
                            image_info['extracted_text'] = image_text

                        # Analyze image quality
                        quality_metrics = image_processor.analyze_image_quality(img_path)
                        image_info['analysis_results']['quality'] = quality_metrics

                        # Detect objects in image (if applicable)
                        objects = image_processor.detect_objects(img_path)
                        if objects:
                            image_info['analysis_results']['detected_objects'] = objects

                        # Add any image-specific metadata
                        metadata = image_processor.get_image_metadata(img_path)
                        image_info['metadata'] = metadata

                        processed_images.append(image_info)

                    except Exception as e:
                        logger.error(f"Error processing image {i+1}: {str(e)}")
                        processed_images.append({
                            'image_index': i + 1,
                            'error': str(e)
                        })

                response['image_analysis'] = {
                    'status': 'success',
                    'total_images': len(image_paths),
                    'processed_images': processed_images
                }

            except Exception as e:
                logger.error(f"Error in image analysis: {str(e)}")
                response['image_analysis'] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('BusinessValueAnalysis'):
            logger.debug("Performing business value analysis")
            try:
                evaluator = BusinessValueEvaluator()
                evaluation_result = evaluator.evaluate_business_value(pdf_text)
                response['business_value_analysis'] = evaluation_result
            except Exception as e:
                logger.error(f"Business value evaluation failed: {str(e)}")
                response['business_value_analysis'] = {
                    'status': 'error',
                    'message': 'Business value analysis failed'
                }

        if analyses.get('DiagramConvention'):
            logger.debug("Running YOLO script for diagram validation")
            try:
                subprocess.run(["python", script_path], check=True)
                response['image_validation'] = {"status": "success", "message": "YOLO script executed"}
            except subprocess.CalledProcessError as e:
                logger.error(f"YOLO script execution failed: {str(e)}")
                response['image_validation'] = {"status": "error", "message": "YOLO script execution failed"}

        logger.info("Analysis completed successfully")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error during document processing: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
    
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

        # Generate recommendations using Gemini
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

        def call_gemini_with_retry(prompt, max_attempts=3):
            for attempt in range(max_attempts):
                try:
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    response = model.generate_content(prompt)
                    return response
                except Exception as e:
                    if "RATE_LIMIT_EXCEEDED" in str(e):
                        if attempt < max_attempts - 1:
                            wait_time = 2 ** attempt
                            logger.warning(f"Gemini API rate limit hit. Waiting {wait_time} seconds...")
                            time.sleep(wait_time)
                            continue
                    raise e

        response = call_gemini_with_retry(prompt)

        return jsonify({
            'status': 'success',
            'recommendations': response.text
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

if __name__ == '__main__':
    logger.info("Starting Flask server on port 5000")
    app.run(debug=True, port=5000)