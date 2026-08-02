const { PineconeStore } = require("@langchain/pinecone");

const { index } = require("../../config/pineconedb");
const { embeddings } = require("./embedding.service");

const getVectorStore = async () => {
  return await PineconeStore.fromExistingIndex(
    embeddings,
    {
      pineconeIndex: index,
    }
  );
};

module.exports = {
  getVectorStore,
};