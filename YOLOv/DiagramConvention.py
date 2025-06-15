# In DiagramConvention.py
import os
import json
import time
from UseCaseDiagramScript import process_use_case_diagram
from classDiagramScript import process_class_diagram
from seqDiagramScript import process_sequence_diagram

def process_diagrams(upload_base="Uploads", 
                    output_base="output_results", 
                    model_path="runs/detect/train/weights/best.pt", 
                    document_type="SRS"):
    """Process diagrams based on document type: use case and class for SRS, sequence and class for SDD."""
    if document_type == "SRS":
        use_case_folder = os.path.join(upload_base, "System Functions")
        class_folder = os.path.join(upload_base, "Preliminary Object-Oriented Domain Analysis")
    elif document_type == "SDD":
        sequence_folder = os.path.join(upload_base, "Interaction Viewpoint")
        class_folder = os.path.join(upload_base, "Logical Viewpoint")
    else:
        return {
            "status": "error",
            "message": f"Invalid document type: {document_type}. Must be 'SRS' or 'SDD'."
        }
    
    results = {
        "status": "success",
        "use_case_diagrams": {},
        "class_diagrams": {},
        "sequence_diagrams": {},
        "issues": []
    }
    
    # Ensure output directories exist with proper permissions
    try:
        for dir_name in ["use_case", "class", "sequence"]:
            dir_path = os.path.join(output_base, dir_name)
            if not os.path.exists(dir_path):
                os.makedirs(dir_path, mode=0o777, exist_ok=True)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to create output directories: {str(e)}"
        }
    
    # Process use case diagrams (only for SRS)
    if document_type == "SRS" and os.path.exists(use_case_folder):
        use_case_output = os.path.join(output_base, "use_case")
        use_case_results = process_use_case_diagram(use_case_folder, use_case_output, model_path)
        if "error" in use_case_results:
            results["issues"].append(use_case_results["error"])
        else:
            sanitized_use_case_results = {}
            for key, value in use_case_results.items():
                print(f"Processing use case diagram: {key} -> {value}")
                sanitized_key = key.replace('.', '_')
                image_path = value
                json_path = None
                if isinstance(value, dict):  # Handle dict output from process_use_case_diagram
                    image_path = value.get('image_path', '')
                    json_path = value.get('json_path', '')
                elif value.endswith('.json'):  # Handle json path
                    json_path = value
                    image_filename = os.path.basename(value).replace('use_case_', 'annotated_').replace('.json', '')
                    image_path = os.path.join(os.path.dirname(value), image_filename)
                
                print(f"Derived image path: {image_path}")
                print(f"Derived JSON path: {json_path}")
                if os.path.exists(image_path):
                    # Prefix path with /output_results
                    relative_path = os.path.join("output_results", "use_case", os.path.basename(image_path)).replace('\\', '/')
                    result_entry = {
                        "path": f"/{relative_path}",
                        "original_path": image_path.replace('\\', '/')
                    }
                    if json_path and os.path.exists(json_path):
                        json_relative_path = os.path.join("output_results", "use_case", os.path.basename(json_path)).replace('\\', '/')
                        result_entry["json_path"] = f"/{json_relative_path}"
                    sanitized_use_case_results[sanitized_key] = result_entry
                else:
                    results["issues"].append(f"Image file not found: {image_path}")
            results["use_case_diagrams"] = sanitized_use_case_results
    
    # Process class diagrams (for both SRS and SDD)
    if os.path.exists(class_folder):
        class_output = os.path.join(output_base, "class")
        class_results = process_class_diagram(class_folder, class_output, model_path)
        if "error" in class_results:
            results["issues"].append(class_results["error"])
        else:
            sanitized_class_results = {}
            for key, value in class_results.items():
                print(f"Processing class diagram: {key} -> {value}")
                sanitized_key = key.replace('.', '_')
                image_path = value
                json_path = None
                if isinstance(value, dict):  # Handle dict output from process_class_diagram
                    image_path = value.get('image_path', '')
                    json_path = value.get('json_path', '')
                elif value.endswith('.json'):  # Handle json path
                    json_path = value
                    image_filename = os.path.basename(value).replace('class_', 'annotated_').replace('.json', '')
                    image_path = os.path.join(os.path.dirname(value), image_filename)
                
                print(f"Derived image path: {image_path}")
                print(f"Derived JSON path: {json_path}")
                if os.path.exists(image_path):
                    # Prefix path with /output_results
                    relative_path = os.path.join("output_results", "class", os.path.basename(image_path)).replace('\\', '/')
                    result_entry = {
                        "path": f"/{relative_path}",
                        "original_path": image_path.replace('\\', '/')
                    }
                    if json_path and os.path.exists(json_path):
                        json_relative_path = os.path.join("output_results", "class", os.path.basename(json_path)).replace('\\', '/')
                        result_entry["json_path"] = f"/{json_relative_path}"
                    sanitized_class_results[sanitized_key] = result_entry
                else:
                    results["issues"].append(f"Image file not found: {image_path}")
            results["class_diagrams"] = sanitized_class_results
    
    # Process sequence diagrams (only for SDD)
    if document_type == "SDD" and os.path.exists(sequence_folder):
        sequence_output = os.path.join(output_base, "sequence")
        sequence_results = process_sequence_diagram(sequence_folder, sequence_output, model_path)
        if "error" in sequence_results:
            results["issues"].append(sequence_results["error"])
        else:
            sanitized_sequence_results = {}
            for key, value in sequence_results.items():
                print(f"Processing sequence diagram: {key} -> {value}")
                sanitized_key = key.replace('.', '_')
                image_path = value
                json_path = None
                if isinstance(value, dict):  # Handle dict output from process_sequence_diagram
                    image_path = value.get('image_path', '')
                    json_path = value.get('json_path', '')
                elif value.endswith('.json'):  # Handle json path
                    json_path = value
                    image_filename = os.path.basename(value).replace('sequence_', 'annotated_').replace('.json', '')
                    image_path = os.path.join(os.path.dirname(value), image_filename)
                
                print(f"Derived image path: {image_path}")
                print(f"Derived JSON path: {json_path}")
                if os.path.exists(image_path):
                    # Prefix path with /output_results
                    relative_path = os.path.join("output_results", "sequence", os.path.basename(image_path)).replace('\\', '/')
                    result_entry = {
                        "path": f"/{relative_path}",
                        "original_path": image_path.replace('\\', '/')
                    }
                    if json_path and os.path.exists(json_path):
                        json_relative_path = os.path.join("output_results", "sequence", os.path.basename(json_path)).replace('\\', '/')
                        result_entry["json_path"] = f"/{json_relative_path}"
                    sanitized_sequence_results[sanitized_key] = result_entry
                else:
                    results["issues"].append(f"Image file not found: {image_path}")
            results["sequence_diagrams"] = sanitized_sequence_results
    
    if not any([results["use_case_diagrams"], results["class_diagrams"], results["sequence_diagrams"]]):
        if results["issues"]:
            results["status"] = "error"
        else:
           results["status"] = "no_diagrams_found"
           results["message"] = "No diagram folders found"
    
    return results