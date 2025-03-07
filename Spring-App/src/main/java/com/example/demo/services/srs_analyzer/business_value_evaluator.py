import json
import google.generativeai as genai

def evaluate_business_value(extracted_data):
    """Load extracted sections, format prompt, and send to LLM for evaluation."""

    
    if not extracted_data:
        print("No relevant sections found for evaluation.")
        return {"status": "error", "message": "No relevant sections found."}

    # 🔹 Combine all sections into a single content block
    document_content = "\n\n".join(
    f"## {section} ##\n{content}" for section, content in extracted_data.items()
)


    # 🔹 Construct a refined prompt for overall evaluation
    prompt = (
        "You are an expert in evaluating Software Requirement Specifications (SRS) for business value.\n"
        "Analyze the following extracted content from an SRS document and provide a *concise overall evaluation* "
        "with a strict limit of *2 sentences per point* based on:\n"
        "- *Uniqueness*\n"
        "- *Market usefulness*\n"
        "- *Feasibility*\n"
        "- *Profitability*\n\n"
        "### Extracted SRS Content ###\n"
        f"{document_content}\n\n"
        "### Business Value Evaluation ###\n"
        "Provide a structured evaluation as follows *(maximum 2 sentences per point)*:\n\n"
        "* *Uniqueness:* [Brief evaluation in 2 sentences]\n"
        "* *Market Usefulness:* [Brief evaluation in 2 sentences]\n"
        "* *Feasibility:* [Brief evaluation in 2 sentences]\n"
        "* *Profitability:* [Brief evaluation in 2 sentences]\n\n"
        "Additionally:\n"
        "- Assign an *overall business value rating (1 to 10)*, where 1 is poor and 10 is excellent.\n"
        "- Categorize the rating as:\n"
        "  * *Very High* (9-10)\n"
        "  * *High* (7-8)\n"
        "  * *Moderate* (5-6)\n"
        "  * *Low* (3-4)\n"
        "  * *Very Low* (1-2)\n"
    )

    # 🔹 Send the prompt to the LLM
    model = genai.GenerativeModel("gemini-2.0-flash") 
    response = model.generate_content(prompt)

    # 🔹 Extract and print LLM response
    evaluation_result = response.text
    print("\n--- Business Value Evaluation ---\n")
    print(evaluation_result)


    return {"Business Value Evaluation": evaluation_result}