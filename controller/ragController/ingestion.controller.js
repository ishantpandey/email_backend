const fs = require("fs/promises");
const { ingestFile, ingestWebsite, ingestText } = require("../../service/ragService/ingestion.service");



const uploadFile = async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "File is required",
      });
    }

    filePath = req.file.path;

    const result = await ingestFile({
      filePath,
      originalName: req.file.originalname,
    });

    return res.status(201).json({
      message: "File ingested successfully",

      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "File ingestion failed",

      error: error.message,
    });
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch {
        // File already removed
      }
    }
  }
};

const uploadWebsite = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        message: "Website URL is required",
      });
    }

    const result = await ingestWebsite(url);

    return res.status(201).json({
      message: "Website ingested successfully",

      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Website ingestion failed",

      error: error.message,
    });
  }
};

const uploadText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    const result = await ingestText(text);

    return res.status(201).json({
      message: "Text ingested successfully",
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
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
