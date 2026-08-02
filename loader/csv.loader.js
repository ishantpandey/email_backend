const { CSVLoader } = require(
  "@langchain/community/document_loaders/fs/csv"
);

const loadCSV = async (
  filePath
) => {
  const loader = new CSVLoader(
    filePath
  );

  const documents =
    await loader.load();

  return documents;
};

module.exports = {
  loadCSV,
};