const fs = require("fs");
const crypto = require("crypto");

const getDocumentModel = require("../../model/ragDocument");

const { extractPdfText } = require("../../service/ragService/pdf.service");
const { extractWebsiteText } = require("../../service/ragService/website.service");
const { createEmbedding } = require("../../service/ragService/embedding.service");

const { chunkText } = require("../../utils/rag-util/chunkText");

/**
 * ============================================
 * Shared Function
 * Save document chunks into MongoDB
 * ============================================
 */
const saveChunks = async ({
  text,
  sourceType,
  sourceName,
  sourceUrl = "",
  filePath = "",
  page = 1,
}) => {
  const Document = getDocumentModel();
  
  if (!text || !text.trim()) {
    throw new Error("No text available for indexing.");
  }

  /**
   * Split into chunks
   */
  const chunks = chunkText(text);

  if (!chunks.length) {
    throw new Error("Failed to create text chunks.");
  }

  /**
   * Generate one ID for all chunks
   */
  const documentId = crypto.randomUUID();

  /**
   * Prevent duplicate indexing
   */
  const exists = await Document.findOne({
    sourceName,
    sourceType,
  });

  if (exists) {
    throw new Error(`${sourceType} already indexed.`);
  }

  const documents = [];

  console.log(`Generating ${chunks.length} embeddings...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const embedding = await createEmbedding(chunk);

    documents.push({
      documentId,

      sourceType,

      sourceName,

      sourceUrl,

      filePath,

      page,

      chunkIndex: i,

      text: chunk,

      embedding,

      characterCount: chunk.length,

      wordCount: chunk.split(/\s+/).filter(Boolean).length,

      metadata: {
        title: sourceName,
        source: sourceType,
      },
    });
  }

  await Document.insertMany(documents);

  return {
    documentId,
    totalChunks: documents.length,
  };
};

/**
 * ============================================
 * Upload PDF
 * POST /api/documents/pdf
 * ============================================
 */
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
    }

    /**
     * Extract PDF
     */
    const pdf = await extractPdfText(req.file.path);

    if (!pdf.success || !pdf.text) {
      throw new Error("Unable to extract PDF text.");
    }

    /**
     * Save chunks
     */
    const result = await saveChunks({
      text: pdf.text,

      sourceType: "pdf",

      sourceName: req.file.originalname,

      filePath: req.file.path,
    });

    return res.status(201).json({
      success: true,

      message: "PDF indexed successfully.",

      documentId: result.documentId,

      totalChunks: result.totalChunks,

      totalPages: pdf.pages,
    });
  } catch (error) {
    /**
     * Delete uploaded file if indexing fails
     */
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================
 * Add Website
 * POST /api/documents/website
 * ============================================
 */
const addWebsite = async (req, res) => {
  try {
    const { url } = req.body;

    /**
     * Validate request
     */
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Website URL is required.",
      });
    }

    /**
     * Extract website content
     */
    const website = await extractWebsiteText(url);

    if (!website.success || !website.text) {
      throw new Error("Unable to extract website content.");
    }

    /**
     * Save website chunks
     */
    const result = await saveChunks({
      text: website.text,

      sourceType: "website",

      sourceName: website.title || url,

      sourceUrl: url,
    });

    return res.status(201).json({
      success: true,

      message: "Website indexed successfully.",

      documentId: result.documentId,

      totalChunks: result.totalChunks,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================
 * Add Manual Text
 * POST /api/documents/text
 * ============================================
 */
const addText = async (req, res) => {
  try {
    const { title, text } = req.body;

    /**
     * Validate request
     */
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required.",
      });
    }

    /**
     * Save manual text
     */
    const result = await saveChunks({
      text,

      sourceType: "text",

      sourceName: title?.trim() || "Manual Text",
    });

    return res.status(201).json({
      success: true,

      message: "Text indexed successfully.",

      documentId: result.documentId,

      totalChunks: result.totalChunks,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================
 * Get All Indexed Documents
 * GET /api/documents
 * ============================================
 */
const getDocuments = async (req, res) => {
  try {
    const Document = getDocumentModel();
    
    const documents = await Document.aggregate([
      {
        $group: {
          _id: "$documentId",

          documentId: {
            $first: "$documentId",
          },

          sourceType: {
            $first: "$sourceType",
          },

          sourceName: {
            $first: "$sourceName",
          },

          sourceUrl: {
            $first: "$sourceUrl",
          },

          filePath: {
            $first: "$filePath",
          },

          totalChunks: {
            $sum: 1,
          },

          createdAt: {
            $first: "$createdAt",
          },
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      totalDocuments: documents.length,
      documents,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================
 * Delete Indexed Document
 * DELETE /api/documents/:documentId
 * ============================================
 */
const deleteDocument = async (req, res) => {
  try {
    const Document = getDocumentModel();
    
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "Document ID is required.",
      });
    }

    /**
     * Find document
     */
    const document = await Document.findOne({
      documentId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    /**
     * Delete uploaded PDF
     */
    if (
      document.filePath &&
      document.sourceType === "pdf"
    ) {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    }

    /**
     * Delete every chunk
     */
    const result = await Document.deleteMany({
      documentId,
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      deletedChunks: result.deletedCount,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================
 * Export Controllers
 * ============================================
 */

module.exports = {
  uploadPdf,
  addWebsite,
  addText,
  getDocuments,
  deleteDocument,
};