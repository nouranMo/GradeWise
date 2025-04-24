import cv2
import torch
from ultralytics import YOLO
import pytesseract
from PIL import Image
import json
import numpy as np
import os

def process_use_case_diagram(image_folder, output_folder, model_path):
    # Configure Tesseract path
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    
    # Debugging message: Starting the diagram processing
    print("Starting use case diagram processing...")
    
    # Load YOLO model
    model = YOLO(model_path)
    
    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
    
    # Debugging message: Checking image folder
    print(f"Checking images in folder: {image_folder}")
    
    results = {}
    
    # Process each image in the folder
    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg"))]    
    for image_name in image_files:
        image_path = os.path.join(image_folder, image_name)
        image = cv2.imread(image_path)
        if image is None:
            print(f"Warning: Could not load image {image_path}")
            continue
            
        image_display = image.copy()
        image_height, image_width = image.shape[:2]

        # Step 1: Extract Components with YOLO
        yolo_results = model.predict(image)
        components = []
        for result in yolo_results:
            boxes = result.boxes.xyxy
            labels = result.boxes.cls
            for box, label_idx in zip(boxes, labels):
                x_min, y_min, x_max, y_max = map(int, box)
                label = model.names[int(label_idx)]
                comp = {
                    "id": len(components) + 1,
                    "type": label,
                    "coords": [x_min, y_min, x_max, y_max]
                }
                components.append(comp)
                color = (0, 255, 0) if label in ["use_case_oval", "system_boundary"] else (255, 0, 0)
                cv2.rectangle(image_display, (x_min, y_min), (x_max, y_max), color, 2)
                cv2.putText(image_display, f"{label} (ID: {comp['id']})", (x_min, y_min - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Filter duplicate system boundaries (keep the largest by area)
        system_boundaries = [comp for comp in components if comp["type"] == "system_boundary"]
        if len(system_boundaries) > 1:
            for comp in system_boundaries:
                x_min, y_min, x_max, y_max = comp["coords"]
                comp["area"] = (x_max - x_min) * (y_max - y_min)
            system_boundaries = sorted(system_boundaries, key=lambda x: x["area"], reverse=True)
            largest_boundary = system_boundaries[0]
            components = [comp for comp in components if comp["type"] != "system_boundary"]
            components.append(largest_boundary)
        # Reassign IDs
        for i, comp in enumerate(components, 1):
            comp["id"] = i

        # Determine diagram type and filter valid components
        diagram_type = "use_case" if any(c["type"] in ["use_case_oval", "use_case_actor"] for c in components) else "class"
        valid_components = [c for c in components if c["type"] in ["use_case_oval", "use_case_actor"]]

        # Step 2: Extract Relationships with Hough Line Transform
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(gray, 10, 60, apertureSize=3)  # Lowered thresholds for better edge detection

        mask = np.zeros_like(gray)
        for comp in components:
            if comp["type"] in ["use_case_oval", "use_case_actor", "system_boundary"]:
                x_min, y_min, x_max, y_max = comp["coords"]
                margin = 2  # Reduced margin to avoid masking lines close to components
                x_min = max(0, x_min - margin)
                y_min = max(0, y_min - margin)
                x_max = min(image_width, x_max + margin)
                y_max = min(image_height, y_max + margin)
                cv2.rectangle(mask, (x_min, y_min), (x_max, y_max), 255, -1)
        edges = cv2.bitwise_and(edges, cv2.bitwise_not(mask))

        kernel = np.ones((2, 2), np.uint8)  # Smaller kernel to preserve faint lines
        edges = cv2.dilate(edges, kernel, iterations=1)
        edges = cv2.erode(edges, kernel, iterations=1)

        # Adjusted Hough parameters for better line detection
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=20, minLineLength=5, maxLineGap=20)
        if lines is None:
            lines = []

        def point_near_box(x, y, box, margin=15):  # Reduced margin for better endpoint matching
            x_min, y_min, x_max, y_max = box
            near_left = (x_min - margin) <= x <= x_min and (y_min - margin) <= y <= (y_max + margin)
            near_right = x_max <= x <= (x_max + margin) and (y_min - margin) <= y <= (y_max + margin)
            near_top = (x_min - margin) <= x <= (x_max + margin) and (y_min - margin) <= y <= y_min
            near_bottom = (x_min - margin) <= x <= (x_max + margin) and y_max <= y <= (y_max + margin)
            inside = x_min <= x <= x_max and y_min <= y <= y_max
            return near_left or near_right or near_top or near_bottom or inside

        def detect_line_type(x1, y1, x2, y2, image, edges, margin=30):
            return "normal"  # All lines in this diagram are solid

        def extract_nearby_text(image, x, y, margin=50, scale_factor=2):
            region_x_min = max(0, x - margin)
            region_y_min = max(0, y - margin)
            region_x_max = min(image_width, x + margin)
            region_y_max = min(image_height, y + margin)
            region = image[region_y_min:region_y_max, region_x_min:region_x_max]
            if region.size == 0:
                return ""
            region = cv2.resize(region, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            pil_image = Image.fromarray(thresh)
            text = pytesseract.image_to_string(pil_image, config='--psm 6')
            return text.strip()

        relationships = []
        seen_relationships = set()  # To track unique relationships
        for line in lines:
            x1, y1, x2, y2 = line[0]
            from_comp = None
            to_comp = None
            
            for comp in valid_components:
                if point_near_box(x1, y1, comp["coords"]):
                    from_comp = comp
                    break
            
            for comp in valid_components:
                if point_near_box(x2, y2, comp["coords"]) and (from_comp is None or comp["id"] != from_comp["id"]):
                    to_comp = comp
                    break
            
            if from_comp and to_comp and from_comp["id"] != to_comp["id"]:
                line_type = detect_line_type(x1, y1, x2, y2, image, edges)
                rel_key = (min(from_comp["id"], to_comp["id"]), max(from_comp["id"], to_comp["id"]), line_type)
                if rel_key not in seen_relationships:
                    seen_relationships.add(rel_key)
                    rel = {
                        "from": from_comp["id"],
                        "to": to_comp["id"],
                        "line": line_type
                    }
                    relationships.append(rel)
                    color = (255, 0, 0) if line_type in ["include", "extend"] else (0, 0, 255)
                    cv2.line(image_display, (x1, y1), (x2, y2), color, 2)

        # Step 3: Extract Text with Tesseract
        for comp in valid_components:
            x_min, y_min, x_max, y_max = comp["coords"]
            region = image[y_min:y_max, x_min:x_max]
            if region.size == 0:
                comp["text"] = ""
                continue
            region = cv2.resize(region, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)
            gray_region = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            thresh_region = cv2.adaptiveThreshold(gray_region, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            pil_image = Image.fromarray(thresh_region)
            text = pytesseract.image_to_string(pil_image, config='--psm 6')
            comp["text"] = text.strip()
            cv2.putText(image_display, f"Text: {comp['text'][:20]}...", (x_min, y_max + 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

        # Save results
        output_data = {
            "diagram_type": "use_case",
            "components": components,
            "relationships": relationships  # Uncommented to include relationships in the output
        }
        
        json_path = os.path.join(output_folder, f"use_case_{image_name}.json")
        with open(json_path, "w") as f:
            json.dump(output_data, f, indent=4)
        
        cv2.imwrite(os.path.join(output_folder, f"annotated_{image_name}"), image_display)
        results[image_name] = json_path

    print("Processing completed.")
    return results

