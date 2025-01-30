import cv2
import pytesseract
import fitz
import os
from PIL import Image
import logging
from text_processing import TextProcessor
import re

logger = logging.getLogger(__name__)

class ImageProcessor:

    @staticmethod
    def extract_images_from_pdf(pdf_path, output_dir="uploads"):
        """Extract images and correctly assign them to sections based on document structure and figure captions."""
        logger.info(f"Extracting images from PDF: {pdf_path}")
        doc = fitz.open(pdf_path)
        image_paths = []

        text_processor = TextProcessor()
        full_text = text_processor.extract_text_from_pdf(pdf_path)
        sections, figures = text_processor.extract_sections_with_figures(full_text)

        figure_map = {}  # Mapping of figures to their section
        for section in sections:
            for figure in section["figures"]:
                figure_map[figure] = section["title"]

        for page_num in range(len(doc)):
            logger.debug(f"Processing page {page_num + 1}")
            page = doc.load_page(page_num)
            images = page.get_images(full=True)
            page_text = page.get_text("text").strip()

            matched_section = None
            for figure, section_title in figure_map.items():
                if figure in page_text:
                    matched_section = section_title
                    break

            if not matched_section:
                logger.warning(f"No figure found on page {page_num + 1}. Assigning images to 'Unsorted'.")
                section_folder = os.path.join(output_dir, "Unsorted")
            else:
                section_folder = os.path.join(output_dir, TextProcessor.strip_numbering(matched_section))

            os.makedirs(section_folder, exist_ok=True)

            for img_index, img in enumerate(images):
                try:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_data = base_image["image"]
                    img_filename = f"page_{page_num + 1}img{img_index + 1}.png"
                    img_path = os.path.join(section_folder, img_filename)

                    with open(img_path, "wb") as img_file:
                        img_file.write(image_data)

                    image_text = ImageProcessor.extract_text_from_image(img_path)
                    if re.search(r'\bFigure\b', image_text, re.IGNORECASE):
                        logger.debug(f"Image contains 'Figure': {img_path}")

                    image_paths.append(img_path)
                    logger.debug(f"Saved image to: {img_path}")

                except Exception as e:
                    logger.error(f"Error extracting image {img_index + 1} from page {page_num + 1}: {str(e)}")

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