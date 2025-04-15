# diagram_convention.py
import os
import time
from UseCaseDiagramScript import process_use_case_diagram
from classDiagramScript import process_class_diagram
from seqDiagramScript import process_sequence_diagram

def process_diagrams(upload_base="uploads", sequence_base="sequence_diagrams", 
                    output_base="output_resultss", model_path="runs/detect/train/weights/best.pt"):
    """Process use case, class, and sequence diagrams."""
    sequence_folder = sequence_base  
    class_folder = os.path.join(upload_base, "Preliminary Object-Oriented Domain Analysis")
    use_case_folder = os.path.join(upload_base, "System Functions")
    
    results = {
        "status": "success",
        "use_case_diagrams": {},
        "class_diagrams": {},
        "sequence_diagrams": {},
        "issues": []
    }
    
    # Process use case diagrams
    if os.path.exists(use_case_folder):
        use_case_output = os.path.join(output_base, "use_case")
        use_case_results = process_use_case_diagram(use_case_folder, use_case_output, model_path)
        if "error" in use_case_results:
            results["issues"].append(use_case_results["error"])
        else:
            # Sanitize keys by replacing dots with underscores
            sanitized_use_case_results = {}
            for key, value in use_case_results.items():
                sanitized_key = key.replace('.', '_')
                sanitized_use_case_results[sanitized_key] = value
            results["use_case_diagrams"] = sanitized_use_case_results
    
    # Process class diagrams
    if os.path.exists(class_folder):
        class_output = os.path.join(output_base, "class")
        class_results = process_class_diagram(class_folder, class_output, model_path)
        if "error" in class_results:
            results["issues"].append(class_results["error"])
        else:
            # Sanitize keys by replacing dots with underscores
            sanitized_class_results = {}
            for key, value in class_results.items():
                sanitized_key = key.replace('.', '_')
                sanitized_class_results[sanitized_key] = value
            results["class_diagrams"] = sanitized_class_results
    
    # Process sequence diagrams
    if os.path.exists(sequence_folder):
        sequence_output = os.path.join(output_base, "sequence")
        sequence_results = process_sequence_diagram(sequence_folder, sequence_output, model_path)
        if "error" in sequence_results:
            results["issues"].append(sequence_results["error"])
        else:
            # Sanitize keys by replacing dots with underscores
            sanitized_sequence_results = {}
            for key, value in sequence_results.items():
                sanitized_key = key.replace('.', '_')
                sanitized_sequence_results[sanitized_key] = value
            results["sequence_diagrams"] = sanitized_sequence_results
    
    if not any([results["use_case_diagrams"], results["class_diagrams"], results["sequence_diagrams"]]):
        if results["issues"]:
            results["status"] = "error"
        else:
            results["status"] = "no_diagrams_found"
            results["message"] = "No diagram folders found"
    
    return results