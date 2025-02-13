import google.generativeai as genai
import json
import os
import cv2
import torch
import numpy as np
import json
from ultralytics import YOLO

# Define paths
YOLO_MODEL_PATH = r"D:\Fourth year\Gradd\Automated-Checking-and-Grading-Tool-For-Technical-Documentation\YOLOv\runs\detect\train5\weights\best.pt"
IMAGE_FOLDER = r"D:\Fourth year\Gradd\Automated-Checking-and-Grading-Tool-For-Technical-Documentation\uploads\System Functions"  # Change this to the folder where images are stored
OUTPUT_FOLDER = r"D:\Fourth year\Gradd\Automated-Checking-and-Grading-Tool-For-Technical-Documentation\YOLOv\output_results"

# Ensure output folder exists
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Load YOLO model
model = YOLO(YOLO_MODEL_PATH)

# Function to process each image
def process_image(image_path):
    """Runs YOLOv8 detection and line validation on a given image."""
    image = cv2.imread(image_path)
    original_image = image.copy()

    # Run YOLO inference
    results = model(image_path)
    detections = results[0]

    detected_objects = []

    # Draw YOLO bounding boxes
    for box, cls in zip(detections.boxes.xyxy, detections.boxes.cls):
        x1, y1, x2, y2 = map(int, box[:4])
        label = model.names[int(cls)]  # Get class name
        detected_objects.append({"type": label, "bbox": [x1, y1, x2, y2]})

        # Draw bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), (255, 0, 0), 2)  # Blue box
        cv2.putText(image, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

    # Convert image to grayscale for line detection
    gray = cv2.cvtColor(original_image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Detect lines with OpenCV
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80, minLineLength=40, maxLineGap=10)
    detected_relationships = []

    # Function to find the nearest object to a given point
    def find_nearest_object(point, objects):
        min_distance = float("inf")
        nearest_object = None

        for obj in objects:
            x1, y1, x2, y2 = obj["bbox"]
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            distance = np.sqrt((center_x - point[0]) ** 2 + (center_y - point[1]) ** 2)

            if distance < min_distance:
                min_distance = distance
                nearest_object = obj

        return nearest_object

    # Associate valid lines only (Actor -> Use Case)
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = map(int, line[0])
            obj1 = find_nearest_object((x1, y1), detected_objects)
            obj2 = find_nearest_object((x2, y2), detected_objects)

            if obj1 and obj2:
                # Ensure one object is an actor, the other is an oval
                if (obj1["type"] == "use_case_actor" and obj2["type"] == "use_case_oval") or \
                   (obj1["type"] == "use_case_oval" and obj2["type"] == "use_case_actor"):

                    detected_relationships.append({
                        "from": obj1["type"],
                        "to": obj2["type"],
                        "line": {"start": [x1, y1], "end": [x2, y2]}
                    })

                    # Draw only valid relationship lines
                    cv2.line(image, (x1, y1), (x2, y2), (0, 255, 0), 2)  # Green lines for valid relationships

    # Save structured JSON output
    structured_data = {
        "objects": detected_objects,
        "relationships": detected_relationships
    }

    json_filename = os.path.join(OUTPUT_FOLDER, os.path.basename(image_path).replace(".png", ".json"))
    with open(json_filename, "w") as f:
        json.dump(structured_data, f, indent=4)

    # Save the final annotated image
    output_image_path = os.path.join(OUTPUT_FOLDER, os.path.basename(image_path))
    cv2.imwrite(output_image_path, image)

    print(f"Processed: {image_path} -> Results saved as {output_image_path} and {json_filename}")

# Process all images in the folder
if os.path.exists(IMAGE_FOLDER):
    image_files = [f for f in os.listdir(IMAGE_FOLDER) if f.endswith((".png", ".jpg", ".jpeg"))]

    if not image_files:
        print(f"No images found in {IMAGE_FOLDER}")
    else:
        for image_name in image_files:
            image_path = os.path.join(IMAGE_FOLDER, image_name)
            process_image(image_path)
else:
    print(f"Folder not found: {IMAGE_FOLDER}")



# 🔹 Step 1: Set up Gemini API Key
API_KEY = "AIzaSyDQ5zYTJibmzpLtWA4dFNf1sFno7bm9Mu4"  # Replace with your actual API key
genai.configure(api_key=API_KEY)

# 🔹 Step 2: Load JSON File (UML Diagram)
def load_json(file_path):
    with open(file_path, "r") as file:
        return json.load(file)

# 🔹 Step 3: Generate a Prompt for UML Validation
def generate_prompt(uml_json):
    # Count components correctly from the 'objects' list
    num_actors = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "use_case_actor")
    num_use_cases = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "use_case_oval")
    num_relationships = len(uml_json.get("relationships", []))

    # Check if system boundary exists
    system_boundary_exists = any(obj["type"] == "use case diagram" for obj in uml_json.get("objects", []))
    system_boundary_status = "✅ Yes" if system_boundary_exists else "❌ No (Missing!)"

    prompt = f"""
    You are an expert in UML Use Case Diagrams. Analyze the following JSON structure representing a UML Use Case Diagram and validate it against standard UML conventions.

    #### **Diagram Statistics**
    - 🎭 **Total Actors:** {num_actors}
    - 🔄 **Total Use Cases (Ovals):** {num_use_cases}
    - 🔗 **Total Relationships:** {num_relationships}
    - 🖼️ **System Boundary Exists?** {system_boundary_status}

    #### **Validation Rules**
    ✅ Actors should only connect to Use Cases.
    ✅ Every Use Case should be connected to at least one Actor.
    ✅ Use Cases can only connect to other Use Cases with «include» or «extend».
    ✅ System boundary should exist, enclosing all use cases while actors remain outside.
    ✅ No duplicate connections or self-referencing use cases.

    #### **Validation Output Format**
    The output **must** include:
    1️⃣ **Errors Found (if any)**
    2️⃣ **Corrections Needed**
    3️⃣ **Final Validation Status (Valid/Invalid)**
    4️⃣ **Summary of UML Components:**
       - 🎭 Total Actors: {num_actors}
       - 🔄 Total Use Cases: {num_use_cases}
       - 🔗 Total Relationships: {num_relationships}
       - 🖼️ System Boundary Exists? {system_boundary_status}

    #### **Input JSON:**
    {json.dumps(uml_json, indent=2)}
    """
    return prompt

# 🔹 Step 4: Ask Gemini to Validate the Diagram
def validate_uml(json_data):
    prompt = generate_prompt(json_data)
    model = genai.GenerativeModel("gemini-pro")  # Using Gemini Pro model
    response = model.generate_content(prompt)
    return response.text

# 🔹 Step 5: Run the Script
import os
import time


output_dir = os.path.abspath(r"D:\Fourth year\Gradd\Automated-Checking-and-Grading-Tool-For-Technical-Documentation\YOLOv\output_results")
print(f"🔍 Looking for JSON files in: {output_dir}")

if not os.path.exists(output_dir):
    print(f"❌ Folder does not exist: {output_dir}")
else:
    # Wait longer for the file to be written
    wait_time = 0
    json_file_path = None

    while wait_time < 10:  # Wait up to 10 seconds
        json_files = [f for f in os.listdir(output_dir) if f.endswith(".json")]
        
        if json_files:
            json_file_path = os.path.join(output_dir, json_files[0])
            print(f"✅ Found JSON file: {json_file_path}")
            break  # Exit loop once file is found
        
        time.sleep(2)  # Wait before checking again
        wait_time += 2

    if json_file_path:
        # Load and validate UML
        json_data = load_json(json_file_path)
        validation_result = validate_uml(json_data)

        print("📜 **Validation Result:**")
        print(validation_result)
    else:
        print("❌ No JSON file found after waiting.")
