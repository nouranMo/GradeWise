from config import create_app, Config
from text_processing import TextProcessor
from image_processing import ImageProcessor
from srs_validator import SRSValidator
from similarity_analyzer import SimilarityAnalyzer
from references_validation.references_validator import ReferencesValidator
from flask import request, jsonify, session
import os
from werkzeug.utils import secure_filename
import logging
import json
from business_value_evaluator import BusinessValueEvaluator 
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
business_evaluator = BusinessValueEvaluator()

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
            logger.debug("Performing content analysis")
            sections = text_processor.parse_document_sections(pdf_text)
            
            # Process text sections
            for i, section in enumerate(sections):
                try:
                    scope = text_processor.generate_section_scope(section)
                    all_scopes.append(scope)
                    scope_sources.append(f"Section {i+1}")
                    spelling_grammar = text_processor.check_spelling_and_grammar(section)
                    spelling_grammar_results.append(spelling_grammar)
                except Exception as e:
                    logger.error(f"Error processing section {i+1}: {str(e)}")

            # Process images for content analysis
            image_paths = image_processor.extract_images_from_pdf(pdf_path)
            for i, img_path in enumerate(image_paths):
                try:
                    image_text = image_processor.extract_text_from_image(img_path)
                    if image_text.strip():
                        scope = text_processor.generate_section_scope(image_text)
                        all_scopes.append(scope)
                        scope_sources.append(f"Image {i+1}")
                        spelling_grammar = text_processor.check_spelling_and_grammar(image_text)
                        spelling_grammar_results.append(spelling_grammar)
                except Exception as e:
                    logger.error(f"Error processing image {i+1}: {str(e)}")

            similarity_matrix = similarity_analyzer.create_similarity_matrix(all_scopes)
            response['content_analysis'] = {
                'similarity_matrix': similarity_matrix.tolist(),
                'scope_sources': scope_sources,
                'scopes': all_scopes,
                'spelling_grammar': spelling_grammar_results
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
                # Analyze business value aspects
                value_metrics = business_evaluator.evaluate_business_value(pdf_text)
                
                # Analyze cost implications
                cost_analysis = business_evaluator.analyze_cost_implications(pdf_text)
                
                # Analyze market potential
                market_analysis = business_evaluator.analyze_market_potential(pdf_text)
                
                # Analyze implementation feasibility
                feasibility = business_evaluator.assess_implementation_feasibility(pdf_text)
                
                # Combine all business analyses
                business_value_result = {
                    'status': 'success',
                    'value_metrics': value_metrics,
                    'cost_analysis': cost_analysis,
                    'market_analysis': market_analysis,
                    'implementation_feasibility': feasibility,
                    'overall_score': business_evaluator.calculate_overall_score(
                        value_metrics, cost_analysis, market_analysis, feasibility
                    ),
                    'recommendations': business_evaluator.generate_recommendations(
                        value_metrics, cost_analysis, market_analysis, feasibility
                    )
                }
                
                response['business_value_analysis'] = business_value_result
                
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

if __name__ == '__main__':
    logger.info("Starting Flask server on port 5000")
    app.run(debug=True, port=5000)