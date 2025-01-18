from flask import Flask
from flask_cors import CORS
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class Config:
    UPLOAD_FOLDER = './uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    GEMINI_API_KEY = "AIzaSyBUc3r8cs1f3Bj162QReYctBwbTa9uoYPI"

def create_app():
    logger.info("Creating Flask application")
    app = Flask(__name__)
    app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
    
    logger.debug("Configuring CORS")
    CORS(app)
    CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:3000"}})
    
    # Ensure upload folder exists
    if not os.path.exists(Config.UPLOAD_FOLDER):
        logger.info(f"Creating upload folder: {Config.UPLOAD_FOLDER}")
        os.makedirs(Config.UPLOAD_FOLDER)
    else:
        logger.debug(f"Upload folder already exists: {Config.UPLOAD_FOLDER}")
    
    logger.info("Flask application created successfully")
    return app 