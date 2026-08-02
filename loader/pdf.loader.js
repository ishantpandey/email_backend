const { PDFLoader } = require(
  "@langchain/community/document_loaders/fs/pdf"
);

const loadPDF = async (filePath) => {
  const loader = new PDFLoader(filePath);

  const documents =
    await loader.load();

  return documents;
};

module.exports = {
  loadPDF,
};