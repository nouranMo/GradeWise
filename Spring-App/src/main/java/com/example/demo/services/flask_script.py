from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import cv2
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure Gemini API
api_key = "AIzaSyDOExmBe0spo7h7PXGRbFqiPRPzfn5FdxE"
genai.configure(api_key=api_key)

app = Flask(__name__)

# Function to preprocess the image
def preprocess_image(image_path):
    print(f"Preprocessing image: {image_path}")
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    print("Image read successfully.")
    img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)[1]
    print("Image thresholding applied.")
    return img

# Function to extract text from image
def extract_text_from_image(image_path):
    print(f"Extracting text from image: {image_path}")
    preprocessed_image = preprocess_image(image_path)
    text = pytesseract.image_to_string(preprocessed_image)
    print(f"Extracted text: {text}")
    return text

# Function to generate structured output
def generate_structured_output(extracted_text):
    print(f"Generating structured output for text: {extracted_text}")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Based on the following text from a class diagram, extract and structure the information into classes with their attributes and methods:\n\n{extracted_text}\n\nPlease return the structured classes in the following format:\n\nClass: [Class Name]\nAttributes: [List of Attributes]\nMethods: [List of Methods]"
        print(f"Prompt for structured output: {prompt}")
        response = model.generate_content(prompt)
        print(f"Generated structured output: {response.text}")
        return response.text
    except Exception as e:
        print(f"Error during structured output generation: {e}")
        raise

# Function to generate system scope
def generate_system_scope(structured_output):
    print(f"Generating system scope for structured output: {structured_output}")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Create a system scope based on the following structured class diagram. Assume the functionality of each class and write a clear system scope:\n\n{structured_output}\n\nReturn the system scope in a well-structured paragraph."
        print(f"Prompt for system scope: {prompt}")
        response = model.generate_content(prompt)
        print(f"Generated system scope: {response.text}")
        return response.text
    except Exception as e:
        print(f"Error during system scope generation: {e}")
        raise

# Function to compare scopes using cosine similarity
def compare_scopes(gemini_scope, user_scope):
    print(f"Comparing scopes:\nGemini Scope: {gemini_scope}\nUser Scope: {user_scope}")
    try:
        documents = [gemini_scope, user_scope]
        vectorizer = TfidfVectorizer().fit_transform(documents)
        print(f"Vectorized documents: {vectorizer}")
        vectors = vectorizer.toarray()
        print(f"Vectors: {vectors}")
        cosine_sim = cosine_similarity(vectors)
        print(f"Cosine similarity matrix: {cosine_sim}")
        similarity_score = cosine_sim[0][1]
        print(f"Similarity score: {similarity_score}")
        return similarity_score
    except Exception as e:
        print(f"Error during scope comparison: {e}")
        raise

# Function to analyze relationships directly from the image using Gemini
def analyze_image_with_gemini(image_path):
    print(f"Analyzing image relationships using Gemini: {image_path}")
    try:
        # Use OCR to extract text from the image
        extracted_text = extract_text_from_image(image_path)
        
        # Create the prompt using the extracted text
        prompt = (
            f"The following is an OCR-extracted representation of an image that contains "
            f"a class diagram. Analyze the relationships, attributes, and methods. "
            f"Provide a structured output in this format:\n\n"
            f"Relation: [Description of the relationship]\n"
            f"Objects: [List of related objects]\n\n"
            f"OCR Extracted Text:\n{extracted_text}"
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

# Update the Flask route to include the image relationship analysis
@app.route('/process', methods=['POST'])
def process_image():
    print("Received POST request at /process")
    data = request.get_json()
    print(f"Request JSON data: {data}")

    image_path = data.get('imagePath')
    user_scope = data.get('paragraph')  # User-provided scope

    if not image_path or not user_scope:
        error_message = "Missing 'imagePath' or 'paragraph' in the request data."
        print(f"Error: {error_message}")
        return jsonify({'error': error_message}), 400

    try:
        # Step 1: Extract text from the image
        extracted_text = extract_text_from_image(image_path)
        print(f"Extracted text: {extracted_text}")

        # Step 2: Generate structured output from extracted text
        structured_output = generate_structured_output(extracted_text)
        print(f"Structured output: {structured_output}")

        # Step 3: Generate system scope from structured output
        system_scope = generate_system_scope(structured_output)
        print(f"Generated system scope: {system_scope}")

        # Step 4: Analyze relationships in the image using Gemini
        image_relationships = analyze_image_with_gemini(image_path)
        print(f"Image relationships: {image_relationships}")

        # Step 5: Compare the generated system scope with the user-provided scope
        similarity = compare_scopes(system_scope, user_scope)
        print(f"Similarity score: {similarity}")

        # Return the results
        response = jsonify({
            'structuredOutput': structured_output,
            'systemScope': system_scope,
            'imageRelationships': image_relationships,
            'similarity': similarity
        })
        print("Returning response to client.")
        return response

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(debug=True, port=5000)
