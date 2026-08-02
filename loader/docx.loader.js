const { DocxLoader } = require(
  "@langchain/community/document_loaders/fs/docx"
);

const loadDOCX = async (
  filePath
) => {
  const loader = new DocxLoader(
    filePath
  );

  const documents =
    await loader.load();

  return documents;
};

module.exports = {
  loadDOCX,
};