import os
import logging
from flask import Blueprint, request, jsonify
from references_validator import ReferencesValidator

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Define the blueprint
references_blueprint = Blueprint('references', __name__)

# Define upload folder
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure upload folder exists

@references_blueprint.route('/parse-references', methods=['POST'])
def parse_references():
    if 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file part in the request"
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "No file selected"
        }), 400

    try:
        from werkzeug.utils import secure_filename
        file_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
        file.save(file_path)
        logger.info(f"File saved to: {file_path}")

        validator = ReferencesValidator()
        results = validator.validate_references_in_pdf(file_path)

        return jsonify({
            "status": "success",
            "data": results
        }), 200

    except Exception as e:
        logger.error(f"Error during reference parsing: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
