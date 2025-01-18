from config import create_app, Config
from text_processing import TextProcessor
from image_processing import ImageProcessor
from srs_validator import SRSValidator
from similarity_analyzer import SimilarityAnalyzer
from flask import request, jsonify
import os
from werkzeug.utils import secure_filename
import logging

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
        # Save and process PDF
        pdf_file = request.files['pdfFile']
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(pdf_file.filename))
        pdf_file.save(pdf_path)
        logger.info(f"PDF saved to: {pdf_path}")

        # Extract text and parse sections
        logger.debug("Extracting text from PDF")
        pdf_text = text_processor.extract_text_from_pdf(pdf_path)
        
        # Validate SRS structure
        logger.debug("Validating SRS structure")
        validation_results = SRSValidator.validate_srs_structure(
            SRSValidator.parse_srs(pdf_text)
        )

        # Process sections and images
        all_scopes = []
        scope_sources = []
        spelling_grammar_results = []

        # Extract and process images
        logger.debug("Processing images")
        image_paths = image_processor.extract_images_from_pdf(pdf_path)
        for i, img_path in enumerate(image_paths):
            try:
                image_text = image_processor.extract_text_from_image(img_path)
                if image_text.strip():  # Only process non-empty text
                    scope = text_processor.generate_section_scope(image_text)
                    all_scopes.append(scope)
                    scope_sources.append(f"Image {i+1}")
                    spelling_grammar = text_processor.check_spelling_and_grammar(image_text)
                    spelling_grammar_results.append(spelling_grammar)
            except Exception as e:
                logger.error(f"Error processing image {i+1}: {str(e)}")

        # Process text sections
        logger.debug("Processing text sections")
        sections = text_processor.parse_document_sections(pdf_text)
        for i, section in enumerate(sections):
            try:
                scope = text_processor.generate_section_scope(section)
                all_scopes.append(scope)
                scope_sources.append(f"Section {i+1}")
                spelling_grammar = text_processor.check_spelling_and_grammar(section)
                spelling_grammar_results.append(spelling_grammar)
            except Exception as e:
                logger.error(f"Error processing section {i+1}: {str(e)}")

        # Generate similarity matrix
        similarity_matrix = similarity_analyzer.create_similarity_matrix(all_scopes)

        # Prepare response
        response = {
            'similarity_matrix': similarity_matrix.tolist(),
            'scope_sources': scope_sources,
            'scopes': all_scopes,
            'spelling_grammar': spelling_grammar_results,
            'validation_results': validation_results,
            'status': 'success'
        }

        logger.info("Analysis completed successfully")
        logger.debug(f"Response data: {response}")
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