const mongoose = require("mongoose");
const { getRagDBConnection } = require("../config/rag-db");

/**
 * Document Schema
 *
 * Each document is divided into multiple chunks.
 * Each chunk stores its own embedding vector for semantic search.
 */
const documentSchema = new mongoose.Schema(
  {
    /**
     * Document ID (groups chunks together)
     */
    documentId: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * Source type
     * pdf | website | text | docx | github | csv ...
     */
    sourceType: {
      type: String,
      required: true,
      enum: [
        "pdf",
        "website",
        "text",
        "docx",
        "csv",
        "github",
        "api",
      ],
    },

    /**
     * Display name
     *
     * Examples:
     * Contract.pdf
     * OpenAI Docs
     * Company Policy
     */
    sourceName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Website URL
     * Empty for PDF/Text
     */
    sourceUrl: {
      type: String,
      default: "",
    },

    /**
     * Uploaded file path
     */
    filePath: {
      type: String,
      default: "",
    },

    /**
     * Chunk number
     */
    chunkIndex: {
      type: Number,
      required: true,
    },

    /**
     * Page number
     */
    page: {
      type: Number,
      default: 1,
    },

    /**
     * Chunk text
     */
    text: {
      type: String,
      required: true,
    },

    /**
     * Gemini embedding vector
     */
    embedding: {
      type: [Number],
      required: true,
      default: [],
    },

    /**
     * Statistics
     */
    characterCount: {
      type: Number,
      default: 0,
    },

    wordCount: {
      type: Number,
      default: 0,
    },

    /**
     * Optional metadata
     */
    metadata: {
      title: {
        type: String,
        default: "",
      },

      author: {
        type: String,
        default: "",
      },

      source: {
        type: String,
        default: "",
      },

      language: {
        type: String,
        default: "en",
      },

      tags: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Helpful indexes
 */

// Find all chunks by document ID
documentSchema.index({
  documentId: 1,
});

// Keep chunk ordering by document ID
documentSchema.index({
  documentId: 1,
  chunkIndex: 1,
});

// Find all chunks of one document
documentSchema.index({
  sourceName: 1,
});

// Keep chunk ordering
documentSchema.index({
  sourceName: 1,
  chunkIndex: 1,
});

// Filter by type
documentSchema.index({
  sourceType: 1,
});

// Search by URL
documentSchema.index({
  sourceUrl: 1,
});

/**
 * NOTE:
 * Do NOT create the vector index here.
 * MongoDB Atlas Vector Search indexes
 * are created in Atlas UI.
 */

let DocumentModel = null;

const getDocumentModel = () => {
  if (DocumentModel) {
    return DocumentModel;
  }

  const connection = getRagDBConnection();
  
  if (!connection) {
    throw new Error("RAG DB connection not established. Ensure connectRagDB() is called before using Document model.");
  }

  DocumentModel = connection.model("Document", documentSchema);
  return DocumentModel;
};

module.exports = getDocumentModel;