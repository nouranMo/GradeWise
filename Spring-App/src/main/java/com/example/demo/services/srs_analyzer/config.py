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
    GEMINI_API_KEY = "AIzaSyBXN_8cReOcEXEBauzFqA2G2dKVJmXlero"
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    SECRET_KEY = '4c1b7c3e8c5c4a3d5b2e1f6a9d8c7b4a2e5f8c9b3d6a7e0f1c4b8d2e5a9c6f3'

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