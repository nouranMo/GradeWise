import os
import cv2
import json
from ultralytics import YOLO

def process_sequence_diagram(image_folder, output_folder, model_path):
    """Process sequence diagrams to extract components using YOLO."""
    # Load YOLO model
    model = YOLO(model_path)
    os.makedirs(output_folder, exist_ok=True)

    # Define all relevant labels
    valid_labels = [
        "lifeline",
        "sequence_actor",
        "messages",
        "activtion_bar",
        "return_message",
        "self_message",
        "object_creation",
        "object_destruction",
        "fragment"
    ]

    # Assign unique colors to each label
    label_colors = {
        "lifeline": (255, 0, 0),  # Blue
        "sequence_actor": (0, 255, 0),  # Green
        "messages": (0, 0, 255),  # Red
        "activtion_bar": (255, 165, 0),  # Orange
        "return_message": (128, 0, 128),  # Purple
        "self_message": (255, 192, 203),  # Pink
        "object_creation": (0, 255, 255),  # Cyan
        "object_destruction": (255, 255, 0),  # Yellow
        "fragment": (139, 69, 19)  # Brown
    }

    # Get image files
    image_files = [f for f in os.listdir(image_folder) if f.endswith((".png", ".jpg", ".jpeg"))]
    if not image_files:
        return {"error": f"No images found in {image_folder}"}

    results = {}

    for image_name in image_files:
        image_path = os.path.join(image_folder, image_name)
        image = cv2.imread(image_path)
        if image is None:
            continue

        image_display = image.copy()

        # Extract components with YOLO
        yolo_results = model.predict(image)
        components = []
        for result in yolo_results:
            for box, label_idx in zip(result.boxes.xyxy, result.boxes.cls):
                x_min, y_min, x_max, y_max = map(int, box)
                label = model.names[int(label_idx)]

                if label in valid_labels:
                    comp = {
                        "id": len(components) + 1,
                        "type": label,
                        "coords": [x_min, y_min, x_max, y_max]
                    }
                    components.append(comp)

                    # Get label color (default to white if label is unknown)
                    color = label_colors.get(label, (255, 255, 255))

                    # Draw bounding box
                    cv2.rectangle(image_display, (x_min, y_min), (x_max, y_max), color, 2)

                    # Draw text background for better readability
                    text = f"{label} (ID: {comp['id']})"
                    text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    text_x, text_y = x_min, y_min - 10
                    cv2.rectangle(image_display, (text_x, text_y - 5), (text_x + text_size[0], text_y + text_size[1] + 5), color, -1)

                    # Put label text on the image
                    cv2.putText(
                        image_display,
                        text,
                        (text_x, text_y + text_size[1] - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 255),  # White text for contrast
                        2
                    )

        # Save results
        output_data = {
            "diagram_type": "sequence",
            "components": components,
            "relationships": []  # To be implemented later
        }

        json_path = os.path.join(output_folder, f"sequence_{image_name}.json")
        with open(json_path, "w") as f:
            json.dump(output_data, f, indent=4)

        cv2.imwrite(os.path.join(output_folder, f"annotated_{image_name}"), image_display)
        results[image_name] = json_path

    return results
