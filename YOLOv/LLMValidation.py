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
    num_actors = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "use_case_actor")
    num_use_cases = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "use_case_oval")
    num_relationships = len(uml_json.get("relationships", []))
    system_boundary_exists = any(obj["type"] == "use_case_diagram" for obj in uml_json.get("objects", []))
    system_boundary_status = "✅ Yes" if system_boundary_exists else "❌ No (Missing!)"

    prompt = f"""
    You are an expert in UML Use Case Diagrams. Validate the following JSON structure against standard UML conventions.

    #### **Diagram Statistics**
    - 🎭 **Total Actors:** {num_actors}
    - 🔄 **Total Use Cases:** {num_use_cases}
    - 🔗 **Total Relationships:** {num_relationships}
    - 🖼️ **System Boundary Exists?** {system_boundary_status}

    #### **Validation Rules**
    ✅ Actors should only connect to Use Cases.
    ✅ Every Use Case should be connected to at least one Actor.
    ✅ Use Cases can only connect to other Use Cases with «include» or «extend».
    ✅ System boundary should exist, enclosing all use cases while actors remain outside.
    ✅ No duplicate connections or self-referencing use cases.

    #### **Input JSON:**
    {json.dumps(uml_json, indent=2)}

    #### **Output Format**
    Format your response using bullet points for each section, with concise explanations limited to a maximum of three sentences per section:
    - **Errors Found**: List any errors in the UML diagram (max 3 sentences).
    - **Corrections Needed**: Suggest corrections for the identified errors (max 3 sentences).
    - **Final Validation Status**: State whether the diagram is Valid or Invalid (max 1 sentence).
    - **Summary of UML Components**: Summarize the diagram's components (actors, use cases, relationships, etc.) (max 3 sentences).
    """
    return prompt

def generate_class_prompt(uml_json):
    num_classes = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "class_box")
    num_relationships = len(uml_json.get("relationships", []))
    
    prompt = f"""
    You are an expert in UML Class Diagrams. Validate the following JSON structure against standard UML conventions.

    #### **Diagram Statistics**
    - 🧩 **Total Classes:** {num_classes}
    - 🔗 **Total Relationships:** {num_relationships}

    #### **Validation Rules**
    ✅ Classes should have attributes and methods (if specified).
    ✅ Relationships should be valid (e.g., association, inheritance, aggregation, composition).
    ✅ No self-referencing classes unless explicitly intended.
    ✅ Multiplicity should be consistent (e.g., 1, 0..*, etc.).
    ✅ No duplicate relationships between the same classes.

    #### **Input JSON:**
    {json.dumps(uml_json, indent=2)}

    #### **Output Format**
    Format your response using bullet points for each section, with concise explanations limited to a maximum of three sentences per section:
    - **Errors Found**: List any errors in the UML diagram (max 3 sentences).
    - **Corrections Needed**: Suggest corrections for the identified errors (max 3 sentences).
    - **Final Validation Status**: State whether the diagram is Valid or Invalid (max 1 sentence).
    - **Summary of UML Components**: Summarize the diagram's components (classes, relationships, etc.) (max 3 sentences).
    """
    return prompt

def generate_sequence_prompt(uml_json):
    num_lifelines = sum(1 for obj in uml_json.get("objects", []) if obj["type"] == "lifeline")
    num_messages = len(uml_json.get("relationships", []))
    
    prompt = f"""
    You are an expert in UML Sequence Diagrams. Validate the following JSON structure against standard UML conventions.

    #### **Diagram Statistics**
    - ⏳ **Total Lifelines:** {num_lifelines}
    - 📩 **Total Messages:** {num_messages}

    #### **Validation Rules**
    ✅ Lifelines represent objects or actors.
    ✅ Messages should follow a logical sequence (e.g., synchronous/asynchronous calls).
    ✅ Activation bars should align with message calls.
    ✅ No dangling messages (source and target must exist).
    ✅ Return messages should match corresponding calls.

    #### **Input JSON:**
    {json.dumps(uml_json, indent=2)}

    #### **Output Format**
    Format your response using bullet points for each section, with concise explanations limited to a maximum of three sentences per section:
    - **Errors Found**: List any errors in the UML diagram (max 3 sentences).
    - **Corrections Needed**: Suggest corrections for the identified errors (max 3 sentences).
    - **Final Validation Status**: State whether the diagram is Valid or Invalid (max 1 sentence).
    - **Summary of UML Components**: Summarize the diagram's components (lifelines, messages, etc.) (max 3 sentences).
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
def validate_diagrams(output_base="output_results"):
    """
    Validate the diagrams by accessing JSON files in the output_results directory.
    Args:
        output_base (str): Base output directory where JSON files are stored
    Returns:
        dict: Validation results for each diagram
    """
    validation_results = {
        "status": "success",
        "validation_results": {},
        "issues": []
    }

    # Define subdirectories to check
    diagram_types = {
        "use_case": os.path.join(output_base, "use_case"),
        "class": os.path.join(output_base, "class"),
        "sequence": os.path.join(output_base, "sequence")
    }

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
                # Use the JSON filename (without extension) as the key
                json_key = f"{diagram_type}_{json_file.replace('.json', '')}"
                validation_results["validation_results"][json_key] = validation_result
            except Exception as e:
                validation_results["issues"].append(f"Error validating {json_path}: {str(e)}")

    if not validation_results["validation_results"] and validation_results["issues"]:
        validation_results["status"] = "error"

    return validation_results