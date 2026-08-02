const path = require("path");

const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { loadPDF } = require("../../loader/pdf.loader");
const { loadDOCX } = require("../../loader/docx.loader");
const { loadCSV } = require("../../loader/csv.loader");
const { loadText } = require("../../loader/text.loader");
const { loadWebsite } = require("../../loader/website.loader");
const { getVectorStore } = require("./vectorStore.service");
const { Document } = require("@langchain/core/documents");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

const ingestFile = async ({ filePath, originalName }) => {
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

  return saveDocuments(documents, {
    sourceType: extension.substring(1),

    source: originalName,
  });
};

const ingestWebsite = async (url) => {
  const documents = await loadWebsite(url);
console.log(documents);

  return saveDocuments(documents, {
    sourceType: "website",

    source: url,
  });
};

const ingestText = async (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }

  const document = new Document({
    pageContent: text,
    metadata: {
      sourceType: "text",
      source: "request-body",
    },
  });

  return saveDocuments([document], {
    sourceType: "text",
    source: "request-body",
  });
};

const saveDocuments = async (documents, sourceMetadata) => {
  if (!documents.length) {
    throw new Error("No content found in source");
  }

  const documentsWithMetadata = documents.map((document) => ({
    ...document,

    metadata: {
      ...document.metadata,

      ...sourceMetadata,
    },
  }));

  const chunks = await splitter.splitDocuments(documentsWithMetadata);

  const vectorStore = await getVectorStore();

  await vectorStore.addDocuments(chunks);

  return {
    documentCount: documents.length,

    chunkCount: chunks.length,

    sourceType: sourceMetadata.sourceType,

    source: sourceMetadata.source,
  };
};

module.exports = {
  ingestFile,
  ingestWebsite,
  ingestText,
};
