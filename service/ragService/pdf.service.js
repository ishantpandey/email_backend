const fs = require("fs");
const pdfParse = require("pdf-parse");

/**
 * Extract text from a PDF file.
 *
 * @param {string} filePath
 * @returns {Promise<Object>}
 *
 * Returns:
 * {
 *   text,
 *   pages,
 *   info,
 *   metadata
 * }
 */
const extractPdfText = async (filePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("PDF file not found.");
    }

    // Read file
    const buffer = fs.readFileSync(filePath);

    // Parse PDF
    const pdf = await pdfParse(buffer);

    // Clean extracted text
    const cleanedText = pdf.text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ ]+/g, " ")
      .trim();

    return {
      success: true,

      text: cleanedText,

      pages: pdf.numpages,

      info: pdf.info || {},

      metadata: pdf.metadata || {},
    };
  } catch (error) {
    console.error("PDF Extraction Error:", error);

    throw new Error(error.message);
  }
};

module.exports = {
  extractPdfText,
};