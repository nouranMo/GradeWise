import cv2
import torch
from ultralytics import YOLO
import pytesseract
from PIL import Image
import json
import numpy as np
import os
import platform

def process_class_diagram(image_folder, output_folder, model_path):
    # Configure Tesseract path based on environment
    if platform.system() == "Windows":
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    else:
        # For Linux/Docker environment, tesseract should be in PATH
        pytesseract.pytesseract.tesseract_cmd = "tesseract"
    
    # Load YOLO model
    model = YOLO(model_path)
    
    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
    
    results = {}
    
    # Process each image in the folder
    for image_name in os.listdir(image_folder):
        if not image_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
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
                cv2.rectangle(image_display, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
                cv2.putText(image_display, f"{label} (ID: {comp['id']})", (x_min, y_min - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Step 2: Extract Relationships with Contour Tracing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        mask = np.zeros_like(gray)
        for comp in components:
            x_min, y_min, x_max, y_max = comp["coords"]
            margin = 2
            x_min = max(0, x_min - margin)
            y_min = max(0, y_min - margin)
            x_max = min(image_width, x_max + margin)
            y_max = min(image_height, y_max + margin)
            cv2.rectangle(mask, (x_min, y_min), (x_max, y_max), 255, -1)
        edges = cv2.bitwise_and(edges, cv2.bitwise_not(mask))

        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=2)
        edges = cv2.erode(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        def point_near_box(x, y, box, margin=100):
            x_min, y_min, x_max, y_max = box
            near_left = (x_min - margin) <= x <= x_min and (y_min - margin) <= y <= (y_max + margin)
            near_right = x_max <= x <= (x_max + margin) and (y_min - margin) <= y <= (y_max + margin)
            near_top = (x_min - margin) <= x <= (x_max + margin) and (y_min - margin) <= y <= y_min
            near_bottom = (x_min - margin) <= x <= (x_max + margin) and y_max <= y <= (y_max + margin)
            inside = x_min <= x <= x_max and y_min <= y <= y_max
            return near_left or near_right or near_top or near_bottom or inside

        def detect_arrowhead(path_points, image, box_from, box_to, margin=30):
            if len(path_points) < 2:
                return "normal"
            x1, y1 = path_points[-2]
            x2, y2 = path_points[-1]
            x_min, y_min, x_max, y_max = box_to
            region_x_min = max(0, min(x2 - margin, x_min - margin))
            region_y_min = max(0, min(y2 - margin, y_min - margin))
            region_x_max = min(image.shape[1], max(x2 + margin, x_max + margin))
            region_y_max = min(image.shape[0], max(y2 + margin, y_max + margin))
            region = image[region_y_min:region_y_max, region_x_min:region_x_max]
            if region.size == 0:
                return "normal"
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                if cv2.contourArea(contour) < 50:
                    continue
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                if len(approx) == 3:
                    return "inheritance"
            return "normal"

        relationships = []
        valid_components = [c for c in components if c["type"] == "class_box"]

        for contour in contours:
            if cv2.contourArea(contour) < 100:
                continue
            epsilon = 0.01 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, False)
            path_points = [(point[0][0], point[0][1]) for point in approx]
            if len(path_points) < 2:
                continue
                
            from_comp = None
            to_comp = None
            
            for i, point in enumerate(path_points[:10]):
                x, y = point
                for comp in valid_components:
                    if point_near_box(x, y, comp["coords"]):
                        from_comp = comp
                        break
                if from_comp:
                    break
                    
            for i in range(max(0, len(path_points) - 10), len(path_points)):
                point = path_points[i]
                x, y = point
                for comp in valid_components:
                    if point_near_box(x, y, comp["coords"]) and (from_comp is None or comp["id"] != from_comp["id"]):
                        to_comp = comp
                        break
                if to_comp:
                    break
                    
            if from_comp and to_comp and from_comp["id"] != to_comp["id"]:
                line_type = detect_arrowhead(path_points, image, from_comp["coords"], to_comp["coords"])
                rel = {
                    "from": from_comp["id"],
                    "to": to_comp["id"],
                    "line": line_type
                }
                relationships.append(rel)
                color = (0, 255, 0) if line_type == "inheritance" else (0, 0, 255)
                for i in range(len(path_points) - 1):
                    x1, y1 = path_points[i]
                    x2, y2 = path_points[i + 1]
                    cv2.line(image_display, (x1, y1), (x2, y2), color, 5)

        # Step 3: Extract Text with Tesseract
        for comp in components:
            if comp["type"] == "class_box":
                x_min, y_min, x_max, y_max = comp["coords"]
                class_region = image[y_min:y_max, x_min:x_max]
                if class_region.size == 0:
                    comp["text"] = ""
                    continue
                gray_region = cv2.cvtColor(class_region, cv2.COLOR_BGR2GRAY)
                _, thresh_region = cv2.threshold(gray_region, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                pil_image = Image.fromarray(thresh_region)
                text = pytesseract.image_to_string(pil_image, config='--psm 6')
                comp["text"] = text.strip()
                cv2.putText(image_display, f"Text: {comp['text'][:20]}...", (x_min, y_max + 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

        # Save results
        output_data = {
            "diagram_type": "class",
            "components": components,
            "relationships": relationships
        }
        
        json_path = os.path.join(output_folder, f"class_{image_name}.json")
        with open(json_path, "w") as f:
            json.dump(output_data, f, indent=4)
        
        cv2.imwrite(os.path.join(output_folder, f"annotated_{image_name}"), image_display)
        results[image_name] = json_path

    return results
