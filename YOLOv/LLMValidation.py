# LLMValidation.py
import os
import json
import google.generativeai as genai

print("WELCOME TO GEMINIIIIIIIIIIIIIIIII")
# 🔹 Step 1: Set up Gemini API Key
API_KEY = "AIzaSyDO6WpIgBA3IynSdN3bYlisi-4xBarKFxY"  # Replace with your actual API key
genai.configure(api_key=API_KEY)

# 🔹 Step 2: Load JSON File
def load_json(file_path):
    with open(file_path, "r") as file:
        return json.load(file)

# 🔹 Step 3: Generate Prompts for Each Diagram Type
def generate_use_case_prompt(uml_json):
    num_actors = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "use_case_actor")
    num_use_cases = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "use_case_oval")
    num_system_boundaries = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "system_boundry")  # Note: "system_boundry" typo in JSON
    num_relationships = len(uml_json.get("relationships", []))

    prompt = f"""
    You are an expert in UML Use Case Diagrams, providing concise validation for a professor who is a domain expert. Validate the UML use case diagram represented by the following data, focusing on the most critical UML compliance issues and design improvements at the diagram level, without referencing the internal JSON structure.

    #### *Diagram Statistics*
    - 🎭 *Total Actors:* {num_actors}
    - 🔄 *Total Use Cases:* {num_use_cases}
    - 🖼 *Total System Boundaries:* {num_system_boundaries}
    - 🔗 *Total Relationships:* {num_relationships}

    #### *Validation Rules*
    ✅ Identify the 3-4 most critical UML issues (e.g., missing system boundary, unconnected use cases, invalid relationships).
    ✅ Suggest 1 design improvement if applicable (e.g., add more actors).
    ✅ Focus on diagram-level issues only, ignoring internal data structure.
    ✅ Use concise bullet points (max 5-7 words each) with a small example for each point (e.g., 'Missing boundary: System scope').

    #### *Input Data (for context, but do not reference in output):*
    {json.dumps(uml_json, indent=2)}

    #### *Output Format*
    Format your response as follows, tailored for a professor:
    - Components Detected: List the breakdown of components (actors, use cases, system boundaries, relationships) in one line (e.g., 'Components Detected: 2 actors, 5 use cases, 1 system boundary, 6 relationships').
    - Main Validation Points: List the 3-4 most critical UML issues and 1 design improvement (if applicable), with examples, using plain bullet points (max 5-7 words each).
    """
    return prompt


def generate_class_prompt(uml_json):
    num_classes = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "class_box")
    num_relationships = len(uml_json.get("relationships", []))
    num_attributes = sum(
        len([line for line in obj["text"].split("\n") if line.strip().startswith("-")])
        for obj in uml_json.get("components", [])
        if obj["type"] == "class_box" and "text" in obj
    )
    num_methods = sum(
        len([line for line in obj["text"].split("\n") if line.strip().startswith("+")])
        for obj in uml_json.get("components", [])
        if obj["type"] == "class_box" and "text" in obj
    )

    prompt = f"""
    You are an expert in UML Class Diagrams, providing concise validation for a professor who is a domain expert. Validate the UML class diagram represented by the following data, focusing on the most critical UML compliance issues and design improvements at the diagram level, without referencing the internal JSON structure.

    #### *Diagram Statistics*
    - 🧩 *Total Classes:* {num_classes}
    - 🔗 *Total Relationships:* {num_relationships}
    - 📋 *Total Attributes:* {num_attributes}
    - 📋 *Total Methods:* {num_methods}

    #### *Validation Rules*
    ✅ Identify the 3-4 most critical UML issues (e.g., missing relationship types, multiplicities), excluding inconsistent notations (e.g., mixed visibility symbols).
    ✅ Focus on diagram-level issues only, ignoring internal data structure.
    ✅ Use concise bullet points (max 5-7 words each) with a small example for each point (e.g., 'Missing types: Patient-Therapist association').

    #### *Input Data (for context, but do not reference in output):*
    {json.dumps(uml_json, indent=2)}

    #### *Output Format*
    Format your response as follows, tailored for a professor:
    - Components Detected: List the breakdown of components (classes, attributes, methods, relationships) in one line (e.g., 'Components Detected: 13 classes, 25 attributes, 20 methods, 10 relationships').
    - Main Validation Points: List the 3-4 most critical UML issues (excluding inconsistent notations), with examples, using plain bullet points (max 5-7 words each).
    """
    return prompt

def generate_sequence_prompt(uml_json):
    num_lifelines = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "lifeline")
    num_actors = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "sequence_actor")
    num_messages = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "messages")
    num_fragments = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "fragment")
    num_activation_bars = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "activtion_bar")  # Note: "activtion_bar" typo in JSON
    num_return_messages = sum(1 for obj in uml_json.get("components", []) if obj["type"] == "return_message")

    prompt = f"""
    You are an expert in UML Sequence Diagrams, providing concise validation for a professor who is a domain expert. Validate the UML sequence diagram represented by the following data, focusing on the most critical UML compliance issues and design improvements at the diagram level, without referencing the internal JSON structure.

    #### *Diagram Statistics*
    - ⏳ *Total Lifelines:* {num_lifelines}
    - 👤 *Total Actors:* {num_actors}
    - 📩 *Total Messages:* {num_messages}
    - 🖼 *Total Fragments:* {num_fragments}
    - 📊 *Total Activation Bars:* {num_activation_bars}
    - 🔙 *Total Return Messages:* {num_return_messages}

    #### *Validation Rules*
    ✅ Identify the 3-4 most critical UML issues (e.g., missing return messages, dangling messages, illogical sequence).
    ✅ Suggest 1 design improvement if applicable (e.g., clearer message flow).
    ✅ Focus on diagram-level issues only, ignoring internal data structure.
    ✅ Use concise bullet points (max 5-7 words each) with a small example for each point (e.g., 'Missing return: Actor-System call').

    #### *Input Data (for context, but do not reference in output):*
    {json.dumps(uml_json, indent=2)}

    #### *Output Format*
    Format your response as follows, tailored for a professor:
    - Components Detected: List the breakdown of components (lifelines, actors, messages, fragments, activation bars, return messages) in one line (e.g., 'Components Detected: 5 lifelines, 1 actor, 3 messages, 1 fragment, 4 activation bars, 1 return message').
    - Main Validation Points: List the 3-4 most critical UML issues and 1 design improvement (if applicable), with examples, using plain bullet points (max 5-7 words each).
    """
    return prompt

# 🔹 Step 4: Validate UML with LLM
def validate_uml(json_data, diagram_type):
    model = genai.GenerativeModel("gemini-1.5-flash")
    if diagram_type == "use_case":
        prompt = generate_use_case_prompt(json_data)
    elif diagram_type == "class":
        prompt = generate_class_prompt(json_data)
    elif diagram_type == "sequence":
        prompt = generate_sequence_prompt(json_data)
    else:
        raise ValueError(f"Unsupported diagram type: {diagram_type}")

    response = model.generate_content(prompt)
    return response.text

# 🔹 Step 5: Main Validation Function
def validate_diagrams(output_base="output_results", document_type="SRS"):
    """
    Validate the diagrams by accessing JSON files in the output_results directory based on document type.
    Args:
        output_base (str): Base output directory where JSON files are stored.
        document_type (str): Type of document ('SRS' or 'SDD') to determine which diagram types to validate.
    Returns:
        dict: Validation results for each diagram.
    """
    validation_results = {
        "status": "success",
        "validation_results": {},
        "issues": []
    }

    # Define subdirectories to check based on document type
    diagram_types = {}
    if document_type == "SRS":
        diagram_types = {
            "use_case": os.path.join(output_base, "use_case"),
            "class": os.path.join(output_base, "class")
        }
    elif document_type == "SDD":
        diagram_types = {
            "sequence": os.path.join(output_base, "sequence"),
            "class": os.path.join(output_base, "class")
        }
    else:
        validation_results["issues"].append(f"Invalid document type: {document_type}. Must be 'SRS' or 'SDD'.")
        validation_results["status"] = "error"
        return validation_results

    # Process each diagram type
    for diagram_type, folder in diagram_types.items():
        if not os.path.exists(folder):
            validation_results["issues"].append(f"Folder not found: {folder}")
            continue

        # Find all JSON files in the folder
        json_files = [f for f in os.listdir(folder) if f.endswith(".json")]
        for json_file in json_files:
            json_path = os.path.join(folder, json_file)
            try:
                json_data = load_json(json_path)
                validation_result = validate_uml(json_data, diagram_type)
                # Sanitize the JSON filename by replacing dots with underscores
                sanitized_file_name = json_file.replace('.json', '').replace('.', '_')
                json_key = f"{diagram_type}_{sanitized_file_name}"
                validation_results["validation_results"][json_key] = validation_result
            except Exception as e:
                validation_results["issues"].append(f"Error validating {json_path}: {str(e)}")

    if not validation_results["validation_results"] and validation_results["issues"]:
        validation_results["status"] = "error"

    return validation_results