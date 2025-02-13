import os
import cv2
import torch
import numpy as np
import json
from ultralytics import YOLO

# Define paths
YOLO_MODEL_PATH = "runs/detect/train5/weights/best.pt"  
IMAGE_FOLDER = "uploads/System Function"  # Change this to the folder where images are stored
OUTPUT_FOLDER = "output_results"

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
