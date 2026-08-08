const { ragQueue } = require("../../queue/ragQueue");

/**
 * Upload File (PDF, DOCX, CSV, TXT)
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const job = await ragQueue.add("ingestion", {
      type: "file",
      filePath: req.file.path,
      originalName: req.file.originalname,
    });

    return res.status(202).json({
      success: true,
      message: "File uploaded successfully. Processing started.",
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
};

/**
 * Upload Website
 */
const uploadWebsite = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Website URL is required",
      });
    }

    const job = await ragQueue.add("ingestion", {
      type: "website",
      url,
    });

    return res.status(202).json({
      success: true,
      message: "Website added to queue.",
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Website ingestion failed",
      error: error.message,
    });
  }
};

/**
 * Upload Text
 */
const uploadText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const job = await ragQueue.add("ingestion", {
      type: "text",
      text: text.trim(),
    });

    return res.status(202).json({
      success: true,
      message: "Text added to queue.",
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Text ingestion failed",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFile,
  uploadWebsite,
  uploadText,
};