from config import create_app, Config
from text_processing import TextProcessor
from image_processing import ImageProcessor
from srs_validator import SRSValidator
from similarity_analyzer import SimilarityAnalyzer
from references_validation.references_validator import ReferencesValidator
from flask import request, jsonify
import os
from werkzeug.utils import secure_filename
import logging
import json

logger = logging.getLogger(__name__)

app = create_app()
text_processor = TextProcessor()
image_processor = ImageProcessor()
similarity_analyzer = SimilarityAnalyzer()

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
        
        # Save and process PDF
        pdf_file = request.files['pdfFile']
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(pdf_file.filename))
        pdf_file.save(pdf_path)
        logger.info(f"PDF saved to: {pdf_path}")

        # Initialize response dictionary
        response = {'status': 'success'}

        # Extract text if needed for any analysis
        if any([analyses.get('srsValidation'), analyses.get('contentAnalysis')]):
            pdf_text = text_processor.extract_text_from_pdf(pdf_path)

        # Perform selected analyses
        if analyses.get('srsValidation'):
            logger.debug("Performing SRS validation")
            parsed_srs = SRSValidator.parse_srs(pdf_text)
            validation_results = SRSValidator.validate_srs_structure(parsed_srs)
            response['srs_validation'] = {
                'structure_validation': validation_results,
                'parsed_sections': parsed_srs
            }

        if analyses.get('referencesValidation'):
            logger.debug("Performing references validation")
            references_results = ReferencesValidator.validate_references_in_pdf(pdf_path)
            # Ensure we're getting the correct structure
            if references_results and 'reformatted_references' in references_results:
                response['references_validation'] = references_results
            else:
                logger.error("Invalid references validation result structure")
                response['references_validation'] = {
                    'reformatted_references': [],
                    'status': 'error',
                    'message': 'Failed to process references'
                }

        if analyses.get('contentAnalysis'):
            logger.debug("Performing content analysis")
            sections = text_processor.parse_document_sections(pdf_text)
            all_scopes = []
            scope_sources = []
            spelling_grammar_results = []

            for i, section in enumerate(sections):
                try:
                    scope = text_processor.generate_section_scope(section)
                    all_scopes.append(scope)
                    scope_sources.append(f"Section {i+1}")
                    spelling_grammar = text_processor.check_spelling_and_grammar(section)
                    spelling_grammar_results.append(spelling_grammar)
                except Exception as e:
                    logger.error(f"Error processing section {i+1}: {str(e)}")

            similarity_matrix = similarity_analyzer.create_similarity_matrix(all_scopes)
            response['content_analysis'] = {
                'similarity_matrix': similarity_matrix.tolist(),
                'scope_sources': scope_sources,
                'scopes': all_scopes,
                'spelling_grammar': spelling_grammar_results
            }

        if analyses.get('imageAnalysis'):
            logger.debug("Performing image analysis")
            image_paths = image_processor.extract_images_from_pdf(pdf_path)
            image_results = []
            
            for i, img_path in enumerate(image_paths):
                try:
                    image_text = image_processor.extract_text_from_image(img_path)
                    if image_text.strip():
                        image_results.append({
                            'image_index': i + 1,
                            'extracted_text': image_text
                        })
                except Exception as e:
                    logger.error(f"Error processing image {i+1}: {str(e)}")
                    
            response['image_analysis'] = {
                'total_images': len(image_paths),
                'processed_images': image_results
            }

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