import cv2
import pytesseract
import fitz
import os
from PIL import Image
import logging
import re

logger = logging.getLogger(__name__)

class ImageProcessor:

    @staticmethod
    def extract_images_from_pdf(pdf_path, output_dir="uploads", target_figures=None):
        """
        Extract images and correctly assign them to sections based on document structure and figure captions.
        
        Args:
            pdf_path: Path to the PDF file
            output_dir: Directory to save extracted images
            target_figures: Optional list of figure names to target (for optimization)
            
        Returns:
            List of paths to extracted images
        """
        logger.info(f"Extracting images from PDF: {pdf_path}")
        logger.info(f"Target figures: {target_figures}")
        doc = fitz.open(pdf_path)
        image_paths = []

        from text_processing import TextProcessor
        text_processor = TextProcessor()
        full_text = text_processor.extract_text_from_pdf(pdf_path)
        sections, figures = text_processor.extract_sections_with_figures(full_text)

        figure_map = {}  # Mapping of figures to their section
        for section in sections:
            for figure in section["figures"]:
                # Create more flexible matching for target figures
                if target_figures:
                    should_include = False
                    figure_lower = figure.lower()
                    
                    # Check direct substring match first
                    for target in target_figures:
                        target_lower = target.lower()
                        if target_lower in figure_lower or figure_lower in target_lower:
                            should_include = True
                            logger.info(f"Matched figure '{figure}' with target '{target}'")
                            break
                    
                    # Check for word-level matches if no direct match
                    if not should_include:
                        figure_words = set(figure_lower.split())
                        for target in target_figures:
                            target_words = set(target.lower().split())
                            # If there's significant word overlap
                            common_words = figure_words.intersection(target_words)
                            if len(common_words) > 0 and len(common_words)/len(target_words) > 0.3:
                                should_include = True
                                logger.info(f"Word-level match for figure '{figure}' with target '{target}'")
                                break
                    
                    if not should_include:
                        logger.debug(f"Skipping figure '{figure}' - no match with targets")
                        continue
                
                figure_map[figure] = section["title"]
                logger.info(f"Including figure: '{figure}' in section '{section['title']}'")

        # Skip processing if no figures match our targets
        if target_figures and not figure_map:
            logger.warning("No matching target figures found in document")
            logger.info("Available figures in the document:")
            for section in sections:
                for figure in section["figures"]:
                    logger.info(f"  - '{figure}' in section '{section['title']}'")
            
            # If we have targets but no matches, process all figures as a fallback
            logger.info("Using fallback: processing all figures in the document")
            for section in sections:
                for figure in section["figures"]:
                    figure_map[figure] = section["title"]
        
        # If still no figures, process all images as a last resort
        if not figure_map:
            logger.warning("No figures with captions found in document. Processing all images.")
            # Process all pages
            min_page = 0
            max_page = len(doc) - 1
        else:
            # Minimum and maximum pages to process - optimization
            min_page = len(doc)
            max_page = 0
            
            # First scan to find page ranges - speeds up processing
            if target_figures:
                logger.info("Scanning for page range containing target figures")
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    page_text = page.get_text("text").strip()
                    
                    for figure in figure_map.keys():
                        if figure in page_text:
                            min_page = min(min_page, page_num)
                            max_page = max(max_page, page_num)
                
                # Expand range slightly to catch diagrams that might be on adjacent pages
                min_page = max(0, min_page - 2)  # Increased padding
                max_page = min(len(doc) - 1, max_page + 2)  # Increased padding
                
                logger.info(f"Processing page range {min_page+1} to {max_page+1}")
            else:
                # Process all pages if no target figures
                min_page = 0
                max_page = len(doc) - 1

        # Special case - if we didn't find any pages with figures, process all pages
        if min_page > max_page:
            logger.warning("No pages containing figure captions found. Processing all pages.")
            min_page = 0
            max_page = len(doc) - 1

        for page_num in range(min_page, max_page + 1):
            logger.debug(f"Processing page {page_num + 1}")
            page = doc.load_page(page_num)
            images = page.get_images(full=True)
            page_text = page.get_text("text").strip()

            # Try to match this page with a section
            matched_section = None
            for figure, section_title in figure_map.items():
                if figure in page_text:
                    matched_section = section_title
                    logger.info(f"Page {page_num+1} matched to figure '{figure}'")
                    break

            # Flexible matching for target figures directly in page text
            if not matched_section and target_figures:
                for target in target_figures:
                    if target.lower() in page_text.lower():
                        matched_section = f"Auto-{target}"
                        logger.info(f"Page {page_num+1} matched to target figure '{target}'")
                        break

            if not matched_section:
                if target_figures and len(target_figures) > 0:
                    # If no exact match but we're looking for specific figures,
                    # put images in a folder named after the first target
                    section_folder = os.path.join(output_dir, target_figures[0])
                    logger.info(f"No figure match on page {page_num+1}. Using default target folder '{target_figures[0]}'")
                else:
                    logger.warning(f"No figure found on page {page_num + 1}. Assigning images to 'Unsorted'.")
                    section_folder = os.path.join(output_dir, "Unsorted")
            else:
                section_folder = os.path.join(output_dir, text_processor.strip_numbering(matched_section))

            os.makedirs(section_folder, exist_ok=True)

            # Only extract images if we found some
            if len(images) > 0:
                logger.info(f"Page {page_num+1} has {len(images)} images")
                
                for img_index, img in enumerate(images):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_data = base_image["image"]
                        img_filename = f"page_{page_num + 1}img{img_index + 1}.png"
                        img_path = os.path.join(section_folder, img_filename)

                        with open(img_path, "wb") as img_file:
                            img_file.write(image_data)

                        # We'll include all images now instead of doing selective OCR
                        image_paths.append(img_path)
                        logger.debug(f"Saved image to: {img_path}")

                    except Exception as e:
                        logger.error(f"Error extracting image {img_index + 1} from page {page_num + 1}: {str(e)}")
            else:
                logger.debug(f"No images found on page {page_num+1}")

        logger.info(f"Extracted {len(image_paths)} images total")
        return image_paths

    @staticmethod
    def preprocess_image(image_path):
        """Preprocess image for better OCR results."""
        logger.debug(f"Preprocessing image: {image_path}")
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            logger.error(f"Could not read image: {image_path}")
            raise RuntimeError(f"Could not read image: {image_path}")
        img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)[1]
        logger.debug("Image preprocessing completed")
        return img

    @staticmethod
    def extract_text_from_image(image_path):
        """Extract text from image using OCR."""
        logger.info(f"Extracting text from image: {image_path}")
        try:
            preprocessed_image = ImageProcessor.preprocess_image(image_path)
            text = pytesseract.image_to_string(preprocessed_image)
            logger.debug(f"Extracted text length: {len(text)}")
            return text
        except Exception as e:
            logger.error(f"Error during text extraction: {str(e)}")
            raise