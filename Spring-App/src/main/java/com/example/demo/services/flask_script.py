from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import cv2
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Configure Gemini API
api_key = "AIzaSyDO6WpIgBA3IynSdN3bYlisi-4xBarKFxY"
genai.configure(api_key=api_key)

app = Flask(__name__)
CORS(app) 
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:3000"}})

# Upload folder configuration
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    print("Creating upload folder...")
    os.makedirs(UPLOAD_FOLDER)
else:
    print("Upload folder exists.")

# Function to check allowed file types
def allowed_file(filename):
    print(f"Checking if file is allowed: {filename}")
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Function to preprocess the image
def preprocess_image(image_path):
    print(f"Preprocessing image: {image_path}")
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print("Failed to read image!")
        raise RuntimeError(f"Could not read image: {image_path}")
    img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)[1]
    print("Image preprocessing complete.")
    return img

# Function to extract text from image
def extract_text_from_image(image_path):
    print(f"Extracting text from image: {image_path}")
    preprocessed_image = preprocess_image(image_path)
    text = pytesseract.image_to_string(preprocessed_image)
    print(f"Extracted text: {text[:200]}...")  # Print only the first 200 characters
    return text

def generate_structured_output(extracted_text):
    print(f"Generating structured output for text: {extracted_text[:200]}...")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Based on the following text from a class diagram, extract and structure "
            f"the information into classes with their attributes and methods.\n\n"
            f"{extracted_text}\n\n"
            f"Return the response in Markdown format, structured as follows:\n\n"
            f"### Class: [Class Name]\n"
            f"#### Attributes:\n"
            f"- [Attribute 1]\n"
            f"- [Attribute 2]\n"
            f"#### Methods:\n"
            f"- [Method 1]\n"
            f"- [Method 2]\n"
        )
        print(f"Prompt sent to Gemini: {prompt[:200]}...")
        response = model.generate_content(prompt)
        print(f"Generated structured output: {response.text[:200]}...")
        return response.text
    except Exception as e:
        print(f"Error generating structured output: {e}")
        raise RuntimeError(f"Error generating structured output: {e}")

# Function to generate system scope
def generate_system_scope(structured_output):
    print(f"Generating system scope for structured output: {structured_output[:200]}...")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Create a system scope based on the following structured class diagram. "
            f"Assume the functionality of each class and write a clear system scope.\n\n"
            f"{structured_output}\n\n"
            f"Return the response in Markdown format, structured as follows:\n\n"
            f"### System Scope\n"
            f"[Write a detailed paragraph about the system scope here]"
        )
        print(f"Prompt sent to Gemini for system scope: {prompt[:200]}...")
        response = model.generate_content(prompt)
        print(f"Generated system scope: {response.text[:200]}...")
        return response.text
    except Exception as e:
        print(f"Error generating system scope: {e}")
        raise RuntimeError(f"Error generating system scope: {e}")


# Function to compare scopes using cosine similarity
def compare_scopes(gemini_scope, user_scope):
    print(f"Comparing scopes:\nGemini Scope: {gemini_scope[:200]}...\nUser Scope: {user_scope[:200]}...")
    try:
        documents = [gemini_scope, user_scope]
        vectorizer = TfidfVectorizer().fit_transform(documents)
        vectors = vectorizer.toarray()
        print(f"Vectors for cosine similarity: {vectors}")
        cosine_sim = cosine_similarity(vectors)
        similarity_score = cosine_sim[0][1]
        print(f"Similarity score: {similarity_score}")
        return similarity_score
    except Exception as e:
        print(f"Error comparing scopes: {e}")
        raise RuntimeError(f"Error comparing scopes: {e}")

# Function to analyze relationships directly from the image using Gemini
def analyze_image_with_gemini(image_path):
    print(f"Analyzing image relationships using Gemini: {image_path}")
    try:
        # Use OCR to extract text from the image
        extracted_text = extract_text_from_image(image_path)
        
        # Create the prompt using the extracted text
        prompt = (
            f"The following is an OCR-extracted representation of an image that contains "
            f"a class diagram. Analyze the relationships, attributes, and methods.\n\n"
            f"{extracted_text}\n\n"
            f"Return the response in Markdown format, structured as follows:\n\n"
            f"### Relationships\n"
            f"- **Relation:** [Description of the relationship]\n"
            f"- **Objects:** [List of related objects]\n"
        )
        print(f"Prompt for Gemini image analysis: {prompt}")

        # Use Gemini to generate content
        model = genai.GenerativeModel("gemini-1.5-flash-002")
        response = model.generate_content(prompt)

        print(f"Image relationships extracted: {response.text}")
        return response.text
    except Exception as e:
        print(f"Error during image analysis with Gemini: {e}")
        raise


# Flask route to process image and text
@app.route('/process', methods=['POST'])
def process_image():
    print("Received POST request at /process")
    if 'image' not in request.files or 'paragraph' not in request.form:
        print("Missing image or paragraph in request.")
        return jsonify({'error': 'Missing image or paragraph in request'}), 400

    image = request.files['image']
    user_scope = request.form['paragraph']

    print(f"Received image: {image.filename}")
    print(f"Received paragraph: {user_scope[:200]}...")

    # Validate the uploaded image
    if image.filename == '' or not allowed_file(image.filename):
        print("Invalid or missing image file.")
        return jsonify({'error': 'Invalid or missing image file'}), 400

    # Save the image
    filename = secure_filename(image.filename)
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    print(f"Saving image to: {image_path}")
    image.save(image_path)

    try:
        # Step 1: Extract text from the image
        extracted_text = extract_text_from_image(image_path)

        # Step 2: Generate structured output from the extracted text
        structured_output = generate_structured_output(extracted_text)

        # Step 3: Generate system scope from the structured output
        system_scope = generate_system_scope(structured_output)

        # Step 4: Analyze image relationships using Gemini
        image_relationships = analyze_image_with_gemini(image_path)

        # Step 5: Compare the system scope with the user-provided scope
        similarity = compare_scopes(system_scope, user_scope)

        # Combine all Markdown outputs
        markdown_output = f"""
# Parsing Results
## Extracted Text
{extracted_text}
{structured_output}
{system_scope}
{image_relationships}
## Similarity Score
- **Similarity Score**: {similarity:.2f}
"""
        print("Returning results to client as Markdown...")
        return jsonify({'markdown': markdown_output})

    except Exception as e:
        print(f"Error in processing: {e}")
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(debug=True, port=5000)
