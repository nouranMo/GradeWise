import { PDFDocument } from "pdf-lib";

export const compressPDF = async (file) => {
  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
      ignoreEncryption: true,
    });

    // Get all pages
    const pages = pdfDoc.getPages();

    // Compress each page
    pages.forEach((page) => {
      // Set compression options
      page.setFontSize(11); // Slightly smaller font size
      page.setLineHeight(1.1); // Tighter line spacing
    });

    // Save the compressed PDF with more aggressive compression settings
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 20,
      compress: true,
      // Additional compression options
      compressImages: true,
      compressFonts: true,
      compressStreams: true,
      // Quality settings
      imageQuality: 0.8, // Slightly reduce image quality
      preserveEditability: false, // Allow more aggressive compression
    });

    // Create a new File object from the compressed bytes
    const compressedFile = new File([compressedPdfBytes], file.name, {
      type: "application/pdf",
    });

    return compressedFile;
  } catch (error) {
    console.error("Error compressing PDF:", error);
    throw error;
  }
};
