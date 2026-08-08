const path = require("path");

const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const { loadPDF } = require("../../loader/pdf.loader");
const { loadDOCX } = require("../../loader/docx.loader");
const { loadCSV } = require("../../loader/csv.loader");
const { loadText } = require("../../loader/text.loader");
const { loadWebsite } = require("../../loader/website.loader");

const { getVectorStore } = require("./vectorStore.service");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

/**
 * Upload PDF / DOCX / CSV / TXT
 */
const ingestFile = async ({ filePath, originalName }, job = null) => {
  if (job) await job.updateProgress(5);

  const extension = path.extname(originalName).toLowerCase();

  let documents;

  switch (extension) {
    case ".pdf":
      documents = await loadPDF(filePath);
      break;

    case ".docx":
      documents = await loadDOCX(filePath);
      break;

    case ".csv":
      documents = await loadCSV(filePath);
      break;

    case ".txt":
      documents = await loadText(filePath);
      break;

    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }

  if (job) await job.updateProgress(30);

  return saveDocuments(
    documents,
    {
      sourceType: extension.replace(".", ""),
      source: originalName,
    },
    job
  );
};

/**
 * Website
 */
const ingestWebsite = async (url, job = null) => {
  if (job) await job.updateProgress(5);

  const documents = await loadWebsite(url);

  if (job) await job.updateProgress(30);

  return saveDocuments(
    documents,
    {
      sourceType: "website",
      source: url,
    },
    job
  );
};

/**
 * Text
 */
const ingestText = async (text, job = null) => {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }

  if (job) await job.updateProgress(10);

  const documents = [
    new Document({
      pageContent: text,
      metadata: {
        sourceType: "text",
        source: "request-body",
      },
    }),
  ];

  if (job) await job.updateProgress(30);

  return saveDocuments(
    documents,
    {
      sourceType: "text",
      source: "request-body",
    },
    job
  );
};

/**
 * Common Save Function
 */
const saveDocuments = async (
  documents,
  sourceMetadata,
  job = null
) => {
  if (!documents || documents.length === 0) {
    throw new Error("No content found in source");
  }

  if (job) await job.updateProgress(40);

  const documentsWithMetadata = documents.map((doc) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      ...sourceMetadata,
    },
  }));

  const chunks = await splitter.splitDocuments(documentsWithMetadata);

  if (job) await job.updateProgress(60);

  const vectorStore = await getVectorStore();

  await vectorStore.addDocuments(chunks);

  if (job) await job.updateProgress(100);

  return {
    success: true,

    documentCount: documents.length,

    chunkCount: chunks.length,

    sourceType: sourceMetadata.sourceType,

    source: sourceMetadata.source,

    message: "Documents ingested successfully",
  };
};

module.exports = {
  ingestFile,
  ingestWebsite,
  ingestText,
};