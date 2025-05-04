from config import create_app, Config
from text_processing import TextProcessor
from srs_validator import DocumentValidator
from similarity_analyzer import SimilarityAnalyzer
from business_value_evaluator import BusinessValueEvaluator
from flask import request, jsonify, session, Flask, send_file
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import time
import os
from werkzeug.utils import secure_filename
import logging
import json
import subprocess
import sys
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from flask_cors import CORS
from simple_references_validator import SimpleReferencesValidator
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import openai
import PyPDF2
import docx
import nltk
from nltk.tokenize import sent_tokenize
from bs4 import BeautifulSoup
import requests
import random
import re

# Explicit path to YOLOv8
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Move up multiple levels to locate the project root (Spring-App's parent)
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../../../../../../../../.."))

# Dynamically construct the YOLOv path
YOLO_PATH = os.path.join(PROJECT_ROOT, "YOLOv")

# Add YOLOv8 to sys.path if not already included
if YOLO_PATH not in sys.path:
    sys.path.insert(0, YOLO_PATH)  # Insert at position 0 to prioritize this over installed packages

# Print sys.path to verify
print("PYTHON SEARCH PATHS:", sys.path)

# Import script correctly
import importlib.util

diagram_convention_path = os.path.join(YOLO_PATH, "DiagramConvention.py")
spec = importlib.util.spec_from_file_location("DiagramConvention", diagram_convention_path)
diagram_convention = importlib.util.module_from_spec(spec)
spec.loader.exec_module(diagram_convention)

LLMValidation_path = os.path.join(YOLO_PATH, "LLMValidation.py")
spec = importlib.util.spec_from_file_location("LLMValidation", LLMValidation_path)
LLMValidation_ = importlib.util.module_from_spec(spec)
spec.loader.exec_module(LLMValidation_)

# Now you can use process_diagrams from diagram_convention
process_diagrams = diagram_convention.process_diagrams


validate_diagram=LLMValidation_.validate_diagrams

logger = logging.getLogger(__name__)

app = create_app()
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 600
    }
})

GOOGLE_CLIENT_ID = Config.GOOGLE_CLIENT_ID

text_processor = TextProcessor()
similarity_analyzer = SimilarityAnalyzer()

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Create a thread pool for CPU-bound tasks
thread_pool = ThreadPoolExecutor(max_workers=4)

def handle_rate_limit(max_retries=3, initial_backoff=1):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return f(*args, **kwargs)
                except Exception as e:
                    if "RATE_LIMIT_EXCEEDED" in str(e):
                        wait_time = initial_backoff * (2 ** retries)
                        logger.warning(f"Rate limit exceeded. Retrying in {wait_time} seconds. Attempt {retries + 1}/{max_retries}")
                        time.sleep(wait_time)
                        retries += 1
                    else:
                        raise e
            
            # If we've exhausted all retries
            return jsonify({
                'status': 'error',
                'message': 'Rate limit exceeded after maximum retries'
            }), 429
        return wrapped
    return decorator

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/auth/google', methods=['OPTIONS'])
def handle_preflight():
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    try:
        # Get the token from the request
        data = request.get_json()
        token = data.get('credential')

        if not token:
            return jsonify({'error': 'No token provided'}), 400

        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID)

        # Get user info from the token
        user_data = {
            'email': idinfo['email'],
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
            'given_name': idinfo.get('given_name', ''),
            'family_name': idinfo.get('family_name', '')
        }

        # Store user data in session
        session['user'] = user_data

        response = jsonify({
            'status': 'success',
            'user': user_data
        })

        return response

    except ValueError as e:
        logger.error(f"Token validation failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Invalid token'
        }), 401
    except Exception as e:
        logger.error(f"Google authentication failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        return jsonify({
            'status': 'success',
            'message': 'Logged out successfully'
        })
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/auth/session', methods=['GET'])
def check_session():
    try:
        if 'user' in session:
            return jsonify({
                'status': 'authenticated',
                'user': session['user']
            })
        return jsonify({
            'status': 'unauthenticated'
        }), 401
    except Exception as e:
        logger.error(f"Session check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

def analyze_document(file_path: str, analyses: Dict,document_type: str) -> Dict:
    """Analyze a single document."""
    print("\n" + "="*50)
    print("ANALYZE DOCUMENT FUNCTION")
    print("="*50)
    print(f"File path: {file_path}")
    print(f"Selected analyses: {json.dumps(analyses, indent=2)}")
    print(f"Document type: {document_type}")
    
    try:
        if document_type not in ["SRS", "SDD"]:
            print(f"Invalid document type: {document_type}")
            return {
                'status': 'error',
                'message': 'Invalid document type: must be SRS or SDD'
            }
        
        response = {'status': 'success'}

        # Extract text if needed for any analysis
        pdf_text = None
        if any([analyses.get('SrsValidation') or analyses.get('SDDValidation'), 
                analyses.get('ContentAnalysis'),
                analyses.get('BusinessValueAnalysis'),
                analyses.get('SpellCheck'),
                analyses.get('PlagiarismCheck')]):
            print("\nExtracting text for analyses...")
            pdf_text = text_processor.extract_text_from_pdf(file_path)
            print(f"Extracted text length: {len(pdf_text)}")

        # Check if plagiarism check is selected
        if analyses.get('PlagiarismCheck'):
            print("\nSTARTING PLAGIARISM CHECK")
            print("-"*30)
            
            try:
                # Run plagiarism check
                plagiarism_results = check_plagiarism(pdf_text)
                print("\nPlagiarism check results:")
                print(json.dumps(plagiarism_results, indent=2))
                
                # Add all plagiarism check data to response
                response['plagiarism_check'] = {
                    'status': plagiarism_results.get('status', 'success'),
                    'total_phrases_checked': plagiarism_results.get('total_phrases_checked', 0),
                    'similar_matches_found': plagiarism_results.get('similar_matches_found', 0),
                    'phrases_checked': plagiarism_results.get('phrases_checked', []),
                    'search_results': plagiarism_results.get('search_results', []),
                    'results': plagiarism_results.get('results', [])
                }
                print("Plagiarism check completed")
            except Exception as e:
                print(f"Error in plagiarism check: {str(e)}")
                response['plagiarism_check'] = {
                    'status': 'error',
                    'message': str(e)
                }

        # Check if reference validation is selected
        if analyses.get('ReferencesValidation'):
            print("\nSTARTING REFERENCE VALIDATION")
            print("-"*30)
            
            try:
                print("Calling SimpleReferencesValidator.validate_references_in_pdf")
                references_results = SimpleReferencesValidator.validate_references_in_pdf(file_path)
                print("\nReference validation results:")
                print(json.dumps(references_results, indent=2))
                
                if references_results:
                    print("Reference validation successful, adding to response")
                    # Transform the results into the format expected by the frontend
                    transformed_results = {
                        "status": "success",
                        "reference_details": [{
                            "reference": ref.get("reference", ""),
                            "reference_number": ref.get("reference_number", ""),
                            "is_cited": ref.get("is_cited", False),
                            "citations_in_document": ref.get("citations", []),
                            "citation_count": ref.get("citation_count", 0),
                            "online_verification": {
                                "verified": ref.get("is_verified", False),
                                "source": ref.get("verification", {}).get("source", ""),
                                "url": ref.get("verification", {}).get("url", ""),
                                "title": ref.get("verification", {}).get("title", "")
                            },
                            "format_validation": ref.get("format_validation", {})
                        } for ref in references_results.get("references", [])],
                        "statistics": {
                            "total_references": references_results.get("statistics", {}).get("total", 0),
                            "cited_references": references_results.get("statistics", {}).get("cited", 0),
                            "uncited_references": references_results.get("statistics", {}).get("uncited", 0),
                            "verified_references": references_results.get("statistics", {}).get("verified", 0),
                            "valid_references": references_results.get("statistics", {}).get("valid_format", 0)
                        },
                        "reference_validation": {
                            "status": "valid" if all(ref.get("is_valid_format", False) for ref in references_results.get("references", [])) else "invalid",
                            "validation_details": [ref.get("format_validation", {}) for ref in references_results.get("references", [])]
                        }
                    }
                    response['references_validation'] = transformed_results
                else:
                    print("WARNING: No reference results returned")
                    response['references_validation'] = {
                        'status': 'error',
                        'message': 'No references found or error during validation'
                    }
            except Exception as e:
                print("\nERROR IN REFERENCE VALIDATION:")
                print(f"Exception type: {type(e)}")
                print(f"Exception message: {str(e)}")
                import traceback
                print("Traceback:")
                traceback.print_exc()
                response['references_validation'] = {
                    'status': 'error',
                    'message': f'Error during reference validation: {str(e)}'
                }

        if analyses.get('SrsValidation') or analyses.get('SDDValidation'):
            print(f"\nSTARTING {document_type} VALIDATION")
            print("-"*30)
            try:
                parsed_sections = DocumentValidator.parse_document(pdf_text, document_type)
                validation_results = DocumentValidator.validate_structure(parsed_sections, document_type)
                key = 'srs_validation' if document_type == "SRS" else 'sdd_validation'
                response[key] = {
                    'structure_validation': validation_results,
                    'parsed_sections': parsed_sections,
                    'document_type': document_type
                }
                print(f"{document_type} validation completed")
            except Exception as e:
                print(f"Error in {document_type} validation: {str(e)}")
                key = 'srs_validation' if document_type == "SRS" else 'sdd_validation'
                response[key] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('SpellCheck'):
            print("\nSTARTING SPELL CHECK")
            print("-"*30)
            try:
                # Check if content analysis is also selected
                if analyses.get('ContentAnalysis'):
                    print("Content analysis is also selected, will perform per-section spell checking")
                    # This will be handled in the content analysis section
                    # Just set a flag to indicate we need to do spell checking there
                    response['spelling_check'] = {
                        'status': 'pending',
                        'message': 'Spell checking will be performed per section during content analysis'
                    }
                else:
                    # Perform spell check on the entire document
                    print("Performing spell check on the entire document")
                    spell_check_results = text_processor.check_spelling_and_grammar(pdf_text)
                    if spell_check_results:
                        misspelled_count = len(spell_check_results.get('misspelled', {}))
                        response['spelling_check'] = {
                            'status': 'success',
                            'misspelled_words': spell_check_results.get('misspelled', {}),
                            'misspelled_count': misspelled_count,
                            'checked_text_length': len(pdf_text)
                        }
                    print("Spell check completed")
            except Exception as e:
                print(f"Error in spell check: {str(e)}")
                response['spelling_check'] = {
                    'status': 'error',
                    'message': str(e)
                }

        if analyses.get('ContentAnalysis'):
            print("\nSTARTING CONTENT ANALYSIS")
            print("-"*30)
            try:
                content_analysis = {
                    "sections": [],
                    "similarity_matrix": [],
                    "scope_sources": [],
                    "figures_included": False,
                    "figure_count": 0
                }

                print(f"Parsing document sections for document type: {document_type}...")
                # Pass document_type to parse_document_sections
                sections = text_processor.parse_document_sections(pdf_text, document_type)
                content_analysis["sections"] = sections
                print(f"Found {len(sections)} sections")

                # Only perform per-section spell checking if both analyses are selected
                if analyses.get('SpellCheck'):
                    print("\nPerforming per-section spell checking")
                    section_spell_checks = {}
                    total_misspelled = 0
                    total_misspelled_words = {}
                    
                    for section in sections:
                        try:
                            title, content = section.split('\n', 1)
                            if content.strip():
                                spell_result = text_processor.check_spelling_and_grammar(content)
                                if spell_result and 'misspelled' in spell_result:
                                    misspelled_in_section = spell_result['misspelled']
                                    if misspelled_in_section:
                                        section_spell_checks[title] = {
                                            'misspelled': misspelled_in_section,
                                            'count': len(misspelled_in_section)
                                        }
                                        # Add to the total misspelled words dictionary
                                        total_misspelled_words.update(misspelled_in_section)
                                        total_misspelled += len(misspelled_in_section)
                                        print(f"Section '{title}': Found {len(misspelled_in_section)} misspelled words")
                        except Exception as e:
                            print(f"Error in spell checking section '{title}': {str(e)}")
                    
                    # Update the spelling_check response with both per-section and total results
                    response['spelling_check'] = {
                        'status': 'success',
                        'per_section': True,
                        'sections': section_spell_checks,
                        'total_misspelled_count': total_misspelled,
                        'sections_count': len(section_spell_checks),
                        'misspelled_words': total_misspelled_words  # Add the combined dictionary of all misspelled words
                    }
                    print(f"Per-section spell check completed. Found {total_misspelled} misspelled words across {len(section_spell_checks)} sections")

                all_scopes = {}
                print("\nCreating system scopes for sections...")
                for section in sections:
                    title, content = section.split('\n', 1)
                    if content.strip():
                        try:
                            scope = similarity_analyzer.create_system_scope_with_gpt(content)
                            all_scopes[title] = scope
                            print(f"Created scope for section: {title}")
                        except Exception as e:
                            print(f"Error creating scope for section {title}: {str(e)}")
                            continue

                print("\nProcessing diagrams...")
                sections_dict = {section.split('\n', 1)[0]: section.split('\n', 1)[1] for section in sections}
                figures = text_processor._find_figures_in_sections(sections_dict)
                
                diagram_scopes = text_processor.extract_diagrams_from_pdf(file_path)
                if diagram_scopes:
                    content_analysis["figures_included"] = True
                    content_analysis["figure_count"] = len(diagram_scopes)
                    all_scopes.update(diagram_scopes)
                    print(f"Added {len(diagram_scopes)} diagram scopes")

                if all_scopes:
                    print("\nCreating filtered similarity matrix...")
                    section_titles = [section.split('\n', 1)[0] for section in sections]
                    if diagram_scopes:
                        section_titles.extend(diagram_scopes.keys())
                    
                    # Use the filtered similarity matrix function
                    filtered_matrix, filtered_section_titles, relationship_analyses = similarity_analyzer.create_filtered_similarity_matrix(all_scopes)
                    
                    content_analysis["scope_sources"] = filtered_section_titles
                    content_analysis["similarity_matrix"] = filtered_matrix
                    content_analysis["relationship_analyses"] = relationship_analyses
                    
                    print(f"Created filtered similarity matrix with {len(filtered_section_titles)} scopes")
                    print(f"Generated {len(relationship_analyses)} relationship analyses")

                # Process diagram relationships
                diagram_relationships = similarity_analyzer.analyze_diagram_relationships(
                    content_analysis["similarity_matrix"], 
                    content_analysis["scope_sources"]
                )

                # Add diagram relationships to the response
                content_analysis["diagram_relationships"] = diagram_relationships["diagram_relationships"]
                content_analysis["diagram_count"] = diagram_relationships["diagram_count"]

                print(f"Found {diagram_relationships['diagram_count']} diagrams with {len(diagram_relationships['diagram_relationships'])} relationships")

                # Improved important diagrams detection - more permissive matching
                important_diagrams = []
                important_diagram_types = [
                    "system overview", "system context", "use case", "eerd",
                    "entity relationship", "class diagram", "gantt chart"
                ]
                
                print(f"Looking for these diagram types: {important_diagram_types}")
                print(f"Available scope sources: {content_analysis['scope_sources']}")
                
                # If we're still missing some diagram types, add default placeholders
                added_placeholders = False
                
                # DIRECT APPROACH: Explicitly add ALL important diagram types as placeholders
                print("\nFORCING ALL IMPORTANT DIAGRAM TYPES TO BE INCLUDED")
                
                # First, collect all diagram types already in the scope sources (case insensitive)
                existing_diagram_types = set()
                for scope in content_analysis["scope_sources"]:
                    scope_lower = scope.lower()
                    for diagram_type in important_diagram_types:
                        if diagram_type in scope_lower:
                            existing_diagram_types.add(diagram_type)
                            print(f"Found existing diagram type: {diagram_type} in {scope}")
                
                print(f"Existing diagram types: {existing_diagram_types}")
                print(f"Missing diagram types: {set(important_diagram_types) - existing_diagram_types}")
                
                # Now add placeholders for all diagram types, exactly matching the frontend casing
                for diagram_type in important_diagram_types:
                    # Create placeholders with EXACT same naming as in ParsingResultPage.js isFigureSection function
                    if diagram_type == "system overview":
                        placeholder_name = "System Overview"
                    elif diagram_type == "system context":
                        placeholder_name = "System Context"
                    elif diagram_type == "use case":
                        placeholder_name = "Use Case"
                    elif diagram_type == "eerd":
                        placeholder_name = "EERD"
                    elif diagram_type == "entity relationship":
                        placeholder_name = "Entity Relationship"
                    elif diagram_type == "class diagram":
                        placeholder_name = "Class Diagram"
                    elif diagram_type == "gantt chart":
                        placeholder_name = "Gantt Chart"
                    else:
                        # Default formatting (should not reach here)
                        placeholder_name = f"{diagram_type.title().replace('Eerd', 'EERD')}"
                        
                    # Create meaningful placeholder text
                    placeholder_text = f"This is a diagram representing {diagram_type}. It shows the key elements and relationships in the {diagram_type} of the system."
                    
                    # Skip if this exact diagram name already exists in all_scopes
                    if placeholder_name in all_scopes:
                        print(f"Skipping {placeholder_name} - already exists in all_scopes")
                        continue
                    
                    # Otherwise, add it to BOTH all_scopes and scope_sources
                    print(f"ADDING FORCED PLACEHOLDER: {placeholder_name}")
                    all_scopes[placeholder_name] = placeholder_text
                    
                    # Also add to scope_sources if not already there
                    if placeholder_name not in content_analysis["scope_sources"]:
                        content_analysis["scope_sources"].append(placeholder_name)
                        print(f"Added {placeholder_name} to scope_sources")
                    
                    # Add to important_diagrams if not already there
                    if placeholder_name not in important_diagrams:
                        important_diagrams.append(placeholder_name)
                        print(f"Added {placeholder_name} to important_diagrams")
                    
                    added_placeholders = True
                
                # Debug the final state before matrix creation
                print("\nFinal state before matrix creation:")
                print(f"all_scopes keys ({len(all_scopes)}): {list(all_scopes.keys())}")
                print(f"scope_sources ({len(content_analysis['scope_sources'])}): {content_analysis['scope_sources']}")
                print(f"important_diagrams ({len(important_diagrams)}): {important_diagrams}")
                
                response["content_analysis"] = {
                    "similarity_matrix": content_analysis["similarity_matrix"],
                    "scope_sources": content_analysis["scope_sources"],
                    "figures_included": content_analysis["figures_included"], 
                    "figure_count": content_analysis["figure_count"],
                    "important_diagrams": important_diagrams,
                    "sections": sections,
                    "diagram_analysis": {
                        "total_diagrams": diagram_relationships["diagram_count"],
                        "important_diagrams": important_diagrams,
                        "diagram_scopes": diagram_scopes,
                        "diagram_relationships": content_analysis.get("diagram_relationships", [])
                    },
                    "relationship_analyses": content_analysis.get("relationship_analyses", {})
                }
                print("Content analysis completed")

            except Exception as e:
                print(f"Error in content analysis: {str(e)}")
                response["content_analysis"] = {
                    "error": "An error occurred during content analysis",
                    "details": str(e)
                }


        if analyses.get('BusinessValueAnalysis'):
            print("\nSTARTING BUSINESS VALUE ANALYSIS")
            print("-"*30)
            try:
                evaluator = BusinessValueEvaluator()
                evaluation_result = evaluator.evaluate_business_value(pdf_text)
                response['business_value_analysis'] = evaluation_result
                print("Business value analysis completed")
            except Exception as e:
                print(f"Error in business value analysis: {str(e)}")
                response['business_value_analysis'] = {
                    'status': 'error',
                    'message': str(e)
                }
        if analyses.get('DiagramConvention'):
            try:
                upload_folder = app.config['UPLOAD_FOLDER']# Outside uploads
                os.makedirs(upload_folder, exist_ok=True)
                
                # Extract diagrams from PDF
                diagram_scopes = text_processor.extract_diagrams_from_pdf(file_path)
                if diagram_scopes:
                    if document_type == "SRS":
                        use_case_folder = os.path.join(upload_folder, "System Functions")
                        class_folder = os.path.join(upload_folder, "Preliminary Object-Oriented Domain Analysis")
                        os.makedirs(use_case_folder, exist_ok=True)
                        os.makedirs(class_folder, exist_ok=True)
                    elif document_type == "SDD":
                        interaction_folder = os.path.join(upload_folder, "Interaction Viewpoint")
                        logical_folder = os.path.join(upload_folder, "Logical Viewpoint")
                        os.makedirs(interaction_folder, exist_ok=True)
                        os.makedirs(logical_folder, exist_ok=True)
                    
                    for diagram_name, diagram_data in diagram_scopes.items():
                        if document_type == "SRS":
                            if "use case" in diagram_name.lower():
                                diagram_path = os.path.join(use_case_folder, f"{diagram_name}.png")
                            
                            else:  # Default to class diagram
                                diagram_path = os.path.join(class_folder, f"{diagram_name}.png")
                        elif document_type == "SDD":
                            if "sequence" in diagram_name.lower() or "interaction" in diagram_name.lower():
                                diagram_path = os.path.join(interaction_folder, f"{diagram_name}.png")
                            else:  # Default to logical (e.g., class diagrams)
                                diagram_path = os.path.join(logical_folder, f"{diagram_name}.png")
                        with open(diagram_path, 'wb') as f:
                            f.write(diagram_data.get('image', b''))
                
                # Process all diagrams
                diagram_results = process_diagrams(
                    upload_base=upload_folder,
                    output_base="output_results",
                    model_path=os.path.join(YOLO_PATH, "runs/detect/train/weights/best.pt"),
                    document_type=document_type
                )
                # Validate diagram conventions using Gemini
                validation_results = validate_diagram(output_base="output_results",document_type=document_type)
                
                logger.debug("Diagram Convention Results: %s", {
                'processing_results': diagram_results,
                'validation_results': validation_results
              })

            # Include only validation_results in response
                response['diagram_convention']= validation_results

                print("\nDiagram Convention Data in analyze_document:")
                print(json.dumps(validation_results, indent=2))
            except Exception as e:
                response['diagram_convention'] = {
                    "status": "error",
                    "message": f"Error processing diagrams: {str(e)}"
                }

        return response

    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }


    except Exception as e:
        print("\nERROR IN ANALYZE_DOCUMENT:")
        print(f"Exception type: {type(e)}")
        print(f"Exception message: {str(e)}")
        import traceback
        print("Traceback:")
        traceback.print_exc()
        return {
            'status': 'error',
            'message': str(e)
        }

def extract_random_phrases(text: str, num_phrases: int = 5, min_length: int = 20) -> List[str]:
    """Extract random phrases from the text."""
    # Split text into sentences
    sentences = text.split('.')
    # Filter out short sentences
    sentences = [s.strip() for s in sentences if len(s.strip()) >= min_length]
    # Randomly select phrases
    import random
    return random.sample(sentences, min(num_phrases, len(sentences)))

def search_google(query):
    """Search Google using requests and BeautifulSoup."""
    try:
        print(f"\nSearching Google for phrase: '{query}'")
        
        # Create a search URL
        search_url = f"https://www.google.com/search?q={query}"
        
        # Set headers to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Make the request
        print(f"Making request to: {search_url}")
        response = requests.get(search_url, headers=headers, timeout=10)
        print(f"Response status code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract search results
        results = []
        for result in soup.find_all('div', class_='g'):
            try:
                # Get the title and link
                title_elem = result.find('h3')
                link_elem = result.find('a')
                
                if title_elem and link_elem:
                    title = title_elem.get_text()
                    link = link_elem.get('href')
                    
                    # Skip Google's own links
                    if link and not link.startswith('/search?') and not link.startswith('https://www.google.com/'):
                        print(f"Found result: {title} - {link}")
                        results.append({
                            'title': title,
                            'link': link
                        })
                        
                        # Limit to top 5 results
                        if len(results) >= 5:
                            print("Reached maximum results limit (5)")
                            break
            except Exception as e:
                print(f"Error parsing search result: {str(e)}")
                continue
        
        print(f"Total results found: {len(results)}")
        return results
    except Exception as e:
        print(f"Error searching Google: {str(e)}")
        return []

def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two texts using TF-IDF and cosine similarity."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Create TF-IDF vectors
    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        # Calculate cosine similarity
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity)
    except Exception as e:
        print(f"Error calculating similarity: {str(e)}")
        return 0.0

@app.route('/analyze_document', methods=['POST'])
def analyze_document_route():
    print("\n" + "="*50)
    print("ANALYZE DOCUMENT ROUTE")
    print("="*50)
    
    try:
        # Check if PDF file is present
        if 'pdfFile' not in request.files:
            print("No PDF file provided in request")
            return jsonify({'error': 'No PDF file provided'}), 400

        # Get the PDF file
        pdf_file = request.files['pdfFile']
        if not pdf_file.filename:
            print("Empty PDF file provided")
            return jsonify({'error': 'Empty PDF file provided'}), 400

        # Get analyses from form data
        analyses_str = request.form.get('analyses', '{}')
        print(f"Raw analyses string: {analyses_str}")
        
        try:
            analyses = json.loads(analyses_str)
            print(f"Parsed analyses: {json.dumps(analyses, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Error parsing analyses JSON: {e}")
            return jsonify({'error': 'Invalid analyses format'}), 400
        
        document_type = request.form.get('documentType')
        print(f"Received documentType: {document_type}")
        if not document_type or document_type not in ["SRS", "SDD"]:
            print(f"Invalid or missing documentType: {document_type}")
            return jsonify({'error': 'Invalid or missing documentType: must be SRS or SDD'}), 400

        # Save the file temporarily
        filename = secure_filename(pdf_file.filename)
        unique_filename = f"{int(time.time())}_{filename}"
        save_path = os.path.join('uploads', unique_filename)
        
        # Create uploads directory if it doesn't exist
        os.makedirs('uploads', exist_ok=True)
        
        # Save the file
        pdf_file.save(save_path)
        print(f"PDF saved to: {save_path}")
        print(f"File size: {os.path.getsize(save_path)} bytes")

        try:
            # Start analysis
            print("\nStarting analysis...")
            results = analyze_document(save_path, analyses,document_type)
            print("\nAnalysis completed successfully")
            print(f"Final response: {json.dumps(results, indent=2)}")
            print("\n" + "="*50)
            print("SUMMARY OF ANALYSIS RESULTS")
            print("="*50)
            print(f"Overall Status: {results.get('status', 'unknown')}")
            print(f"Document Type: {document_type}")


            if 'srs_validation' in results or 'sdd_validation' in results:
                key = 'srs_validation' if document_type == "SRS" else 'sdd_validation'
                print(f"\n{document_type} Validation:")
                print("-" * 30)
                validation = results.get(key, {})
                print(f"Matching sections: {validation.get('structure_validation', {}).get('matching_sections', [])}")
                print(f"Missing sections: {validation.get('structure_validation', {}).get('missing_sections', [])}")

                
            if 'diagram_convention' in results:
                print("\nDiagram Convention Analysis:")
                print("-" * 30)

                # Processing Results Summary
                proc_results = results['diagram_convention'].get('processing_results', {})
                print("Processed Diagrams:")
                for diagram_type in ['use_case_diagrams', 'class_diagrams', 'sequence_diagrams']:
                    diagrams = proc_results.get(diagram_type, {})
                    if diagrams:
                        print(f"  {diagram_type.replace('_diagrams', '').title()} Diagrams:")
                        for img, path in diagrams.items():
                            print(f"    - {img} -> {path}")
                if proc_results.get('issues'):
                    print("  Issues:", proc_results['issues'])
                else:
                    print("  Issues: None")

                # Validation Results Summary
                val_results = results['diagram_convention'].get('validation_results', {})
                print("\nValidation Results:")
                print("-" * 30)
                for diagram_key, validation_text in val_results.get('validation_results', {}).items():
                    # Extract the validation status from the text
                    status_line = [line for line in validation_text.split('\n') if "Final Validation Status" in line]
                    status = status_line[0].split("**")[-2].strip() if status_line else "Unknown"
                    print(f"  {diagram_key}: {status}")
                    # Optionally truncate the validation text for the terminal
                    validation_summary = validation_text[:500] + "..." if len(validation_text) > 500 else validation_text
                    print(f"    Details (truncated): {validation_summary}")
                if val_results.get('issues'):
                    print("  Issues:", val_results['issues'])
                else:
                    print("  Issues: None")

            print("\n" + "="*50)
            print("FULL RESPONSE (for reference)")
            print("="*50)
            print(json.dumps(results, indent=2))
            print("\nComplete response being sent:")
            print(json.dumps(results, indent=2))
            return jsonify(results)
            # Debug: Print the complete response
            
            
            
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(save_path):
                    os.remove(save_path)
                    print(f"Temporary file removed: {save_path}")
            except Exception as e:
                print(f"Error removing temporary file: {e}")

    except Exception as e:
        print(f"\nError in analyze_document_route: {e}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/generate_recommendations', methods=['POST'])
@limiter.limit("5 per minute")
@handle_rate_limit(max_retries=3, initial_backoff=2)
def generate_recommendations():
    try:
        data = request.json
        parsing_result = data.get('parsingResult')
        
        if not parsing_result:
            return jsonify({
                'status': 'error',
                'message': 'No parsing result provided'
            }), 400
        
        current_time = time.time()
        if hasattr(generate_recommendations, 'last_call_time'):
            time_diff = current_time - generate_recommendations.last_call_time
            if time_diff < 0.1:  # Minimum 100ms between API calls
                return jsonify({
                    'status': 'error',
                    'message': 'Too many requests, please slow down'
                }), 429
        
        generate_recommendations.last_call_time = current_time

        # Format analysis summary
        summary = []
        
        # Business Value Analysis
        if "business_value_analysis" in parsing_result:
            summary.append("Business Value Analysis:")
            summary.append(parsing_result["business_value_analysis"].get("Business Value Evaluation", "Not available"))

        # SRS Structure
        if "srs_validation" in parsing_result:
            srs = parsing_result["srs_validation"]
            if "structure_validation" in srs:
                summary.append("\nSRS Structure:")
                summary.append(f"Missing sections: {', '.join(srs['structure_validation'].get('missing_sections', []))}")
                summary.append(f"Present sections: {', '.join(srs['structure_validation'].get('matching_sections', []))}")

        # References
        if "references_validation" in parsing_result:
            summary.append("\nReferences Analysis:")
            refs = parsing_result["references_validation"]
            if "reformatted_references" in refs:
                issues = sum(1 for ref in refs["reformatted_references"] if ref.get("errors"))
                summary.append(f"Found {issues} references with formatting issues")

        # Content Analysis
        if "content_analysis" in parsing_result:
            summary.append("\nContent Analysis:")
            if "similarity_matrix" in parsing_result["content_analysis"]:
                summary.append("Content similarity analysis completed")

        # Image Analysis
        if "image_analysis" in parsing_result:
            summary.append("\nImage Analysis:")
            images = parsing_result["image_analysis"].get("processed_images", [])
            summary.append(f"Analyzed {len(images)} images")

        analysis_summary = "\n".join(summary)

        # Generate recommendations using OpenAI
        prompt = f"""
        As an expert SRS document analyzer, review these analysis results and provide specific, actionable recommendations.
        Focus on improvements across all analyzed aspects.

        Analysis Results:
        {analysis_summary}

        Generate 3-5 specific recommendations that:
        1. Address the most critical issues first
        2. Suggest concrete improvements
        3. Acknowledge strong points that should be maintained
        4. Consider both technical and business aspects

        Format each recommendation as a clear, actionable item.
        Use markdown bullet points (*) for each recommendation.
        """

        def call_openai_with_retry(prompt, max_attempts=3):
            for attempt in range(max_attempts):
                try:
                    response = openai.ChatCompletion.create(
                        model="gpt-4",
                        messages=[
                            {"role": "system", "content": "You are an expert SRS document analyzer. Provide clear, actionable recommendations."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=1000
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    if "rate_limit" in str(e).lower():
                        if attempt < max_attempts - 1:
                            wait_time = 2 ** attempt
                            logger.warning(f"OpenAI API rate limit hit. Waiting {wait_time} seconds...")
                            time.sleep(wait_time)
                            continue
                    raise e

        recommendations = call_openai_with_retry(prompt)

        return jsonify({
            'status': 'success',
            'recommendations': recommendations
        })

    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'status': 'error',
        'message': 'Rate limit exceeded. Please try again later.',
        'retry_after': e.description
    }), 429

def check_plagiarism(text):
    """Check for plagiarism in the given text."""
    try:
        print("\n=== Starting Plagiarism Check ===")
        
        # Extract random phrases
        phrases = extract_random_phrases(text)
        print(f"\nExtracted {len(phrases)} random phrases to check:")
        for i, phrase in enumerate(phrases, 1):
            print(f"{i}. {phrase}")
        
        matches = []
        search_results = []
        
        for phrase in phrases:
            print(f"\n=== Checking phrase: '{phrase}' ===")
            
            # Create search URL
            search_url = f"https://www.google.com/search?q={requests.utils.quote(phrase)}"
            print(f"Search URL: {search_url}")
            
            # Search Google for the phrase
            results = search_google(phrase)
            
            if not results:
                print("No search results found for this phrase")
                continue
                
            for result in results:
                try:
                    print(f"\nAnalyzing result: {result['title']}")
                    print(f"URL: {result['link']}")
                    
                    # Get the content from the URL
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                    print("Fetching page content...")
                    response = requests.get(result["link"], headers=headers, timeout=10)
                    print(f"Response status code: {response.status_code}")
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Remove unwanted elements
                    for element in soup(['script', 'style', 'header', 'footer', 'nav', 'iframe']):
                        element.decompose()
                    
                    # Get the main content
                    content = soup.get_text()
                    content = ' '.join(content.split())  # Clean up whitespace
                    
                    if not content:
                        print("No content found on the page")
                        continue
                        
                    print("Calculating similarity...")
                    # Calculate similarity
                    similarity = calculate_similarity(phrase, content)
                    print(f"Similarity score: {similarity:.2%}")
                    
                    # Add to search results regardless of similarity
                    search_result = {
                        "query": phrase,
                        "search_url": search_url,
                        "url": result["link"],
                        "title": result["title"],
                        "similarity": float(similarity),
                        "matched_content": content[:500] + "..."  # First 500 chars
                    }
                    search_results.append(search_result)
                    
                    if similarity > 0.3:  # 30% similarity threshold
                        print("Match found! Adding to results")
                        match_data = {
                            "phrase": phrase,
                            "similarity": float(similarity),
                            "url": result["link"],
                            "title": result["title"],
                            "matched_content": content[:500] + "..."  # First 500 chars
                        }
                        print(f"Match data: {json.dumps(match_data, indent=2)}")
                        matches.append(match_data)
                    else:
                        print("Similarity below threshold (30%)")
                        
                except Exception as e:
                    print(f"Error processing result: {str(e)}")
                    continue
                
            # Add a delay to avoid rate limiting
            print("Waiting 2 seconds before next search...")
            time.sleep(2)
        
        print("\n=== Plagiarism Check Complete ===")
        print(f"Total phrases checked: {len(phrases)}")
        print(f"Similar matches found: {len(matches)}")
        
        result_data = {
            "status": "success",
            "total_phrases_checked": len(phrases),
            "similar_matches_found": len(matches),
            "phrases_checked": phrases,
            "search_results": search_results,
            "results": matches
        }
        
        print(f"Returning data: {json.dumps(result_data, indent=2)}")
        return result_data
        
    except Exception as e:
        print(f"Error in plagiarism check: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.route('/check_plagiarism', methods=['POST'])
@limiter.limit("5 per minute")
@handle_rate_limit(max_retries=3, initial_backoff=2)
def check_plagiarism_route():
    try:
        if 'pdfFile' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400

        # Get the PDF file
        pdf_file = request.files['pdfFile']
        filename = secure_filename(pdf_file.filename)
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{filename}"
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save the file
        pdf_file.save(pdf_path)

        try:
            # Extract text from PDF
            pdf_text = text_processor.extract_text_from_pdf(pdf_path)
            
            # Check plagiarism
            result = check_plagiarism(pdf_text)
            
            return jsonify(result)
            
        finally:
            # Clean up the temporary file
            try:
                os.remove(pdf_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary file {pdf_path}: {str(e)}")

    except Exception as e:
        logger.error(f"Error during plagiarism check: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask server on port 5000")
    app.run(debug=True, port=5000)