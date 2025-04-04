import os
import cv2
import torch
import json
import numpy as np
from ultralytics import YOLO
import pytesseract
from PIL import Image

def process_use_case_diagram(image_folder, output_folder, model_path):
    # Debugging message: Starting the diagram processing
    print("Starting use case diagram processing...")

    model = YOLO(model_path)
    os.makedirs(output_folder, exist_ok=True)

    # Debugging message: Checking image folder
    print(f"Checking images in folder: {image_folder}")

    # Process each image in the folder
    image_files = [f for f in os.listdir(image_folder) if f.endswith((".png", ".jpg", ".jpeg"))]
    if not image_files:
        print("No images found in the folder.")
        return {"error": f"No images found in {image_folder}"}

    results = {}

    for image_name in image_files:
        print(f"Processing image: {image_name}")

        image_path = os.path.join(image_folder, image_name)
        image = cv2.imread(image_path)
        if image is None:
            print(f"Failed to read image: {image_name}")
            continue

        image_display = image.copy()
        image_height, image_width = image.shape[:2]

        # Debugging message: Starting YOLO prediction
        print(f"Running YOLO detection for {image_name}...")
        yolo_results = model.predict(image)
        components = []

        if not yolo_results:  # Ensure YOLO results are not empty or None
            print(f"YOLO did not detect any components in {image_name}")
            return {"error": f"YOLO did not detect any components in {image_name}"}

        # Detect use case components (ovals and actors)
        for result in yolo_results:
            for box, label_idx in zip(result.boxes.xyxy, result.boxes.cls):
                x_min, y_min, x_max, y_max = map(int, box)
                label = model.names[int(label_idx)]
                if label in ["use_case_oval", "use_case_actor"]:
                    comp = {
                        "id": len(components) + 1,
                        "type": label,
                        "coords": [x_min, y_min, x_max, y_max]
                    }
                    components.append(comp)
                    cv2.rectangle(image_display, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
                    cv2.putText(image_display, f"{label} (ID: {comp['id']})", (x_min, y_min - 10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        if not components:
            print(f"No components detected in {image_name}")
            return {"error": f"No components detected in {image_name}"}

        # Debugging message: Detecting relationships using Hough Transform
        print(f"Detecting relationships in {image_name}...")

        # Extract relationships using Hough Lines
        # gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # edges = cv2.Canny(gray, 20, 80, apertureSize=3)
        # mask = np.zeros_like(gray)
        # for comp in components:
        #     x_min, y_min, x_max, y_max = comp["coords"]
        #     cv2.rectangle(mask, (x_min-2, y_min-2), (x_max+2, y_max+2), 255, -1)
        # edges = cv2.bitwise_and(edges, cv2.bitwise_not(mask))

        # lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=30, minLineLength=15, maxLineGap=20)
        # relationships = []

        # def point_near_box(x, y, box, margin=80):
        #     x_min, y_min, x_max, y_max = box
        #     return (x_min - margin <= x <= x_max + margin and y_min - margin <= y <= y_max + margin)

        # def detect_line_type(x1, y1, x2, y2, image):
        #     mid_x, mid_y = (x1 + x2) // 2, (y1 + y2) // 2
        #     text = pytesseract.image_to_string(image[max(0, mid_y-30):min(image_height, mid_y+30),
        #                                            max(0, mid_x-30):min(image_width, mid_x+30)])
        #     if "include" in text.lower():
        #         return "include"
        #     elif "extend" in text.lower():
        #         return "extend"
        #     return "normal"

        # if lines is not None:
        #     for line in lines:
        #         x1, y1, x2, y2 = line[0]
        #         from_comp = to_comp = None
        #         for comp in components:
        #             if point_near_box(x1, y1, comp["coords"]):
        #                 from_comp = comp
        #             if point_near_box(x2, y2, comp["coords"]) and comp["id"] != from_comp["id"]:
        #                 to_comp = comp
        #         if from_comp and to_comp:
        #             line_type = detect_line_type(x1, y1, x2, y2, image)
        #             relationships.append({
        #                 "from": from_comp["id"],
        #                 "to": to_comp["id"],
        #                 "line": line_type
        #             })
        #             color = (255, 0, 0) if line_type in ["include", "extend"] else (0, 0, 255)
        #             cv2.line(image_display, (x1, y1), (x2, y2), color, 2)

        # # Debugging message: Extracting text from components
        # print(f"Extracting text from components in {image_name}...")

        # # Extract text from components
        # for comp in components:
        #     x_min, y_min, x_max, y_max = comp["coords"]
        #     region = image[y_min:y_max, x_min:x_max]
        #     comp["text"] = pytesseract.image_to_string(Image.fromarray(cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)))

        # Debugging message: Saving results
        print(f"Saving results for {image_name}...")

        # Save results
        output_data = {
            "diagram_type": "use_case",
            "components": components,
            # "relationships": relationships
        }

        json_path = os.path.join(output_folder, f"use_case_{image_name}.json")
        with open(json_path, "w") as f:
            json.dump(output_data, f, indent=4)

        cv2.imwrite(os.path.join(output_folder, f"annotated_{image_name}"), image_display)
        results[image_name] = json_path

    print("Processing completed.")
    return results
