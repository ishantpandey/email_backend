const { TextLoader } = require("@langchain/classic/document_loaders/fs/text");

const loadText = async (filePath) => {
  const loader = new TextLoader(filePath);

  return await loader.load();
};

module.exports = {
  loadText,
};