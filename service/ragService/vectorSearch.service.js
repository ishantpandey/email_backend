
const getDocumentModel = require("../../model/ragDocument");
const { createEmbedding } = require("./embedding.service");

/**
 * =====================================================
 * Perform Semantic Vector Search
 * =====================================================
 *
 * @param {string} query
 * @param {number} limit
 *
 * @returns {Promise<Array>}
 */
const searchDocuments = async (
  query,
  limit = 5
) => {
  try {
    if (!query || !query.trim()) {
      throw new Error("Search query is required.");
    }

    /**
     * Create query embedding
     */
    const queryEmbedding = await createEmbedding(query);

    /**
     * MongoDB Atlas Vector Search
     */
    const Document = getDocumentModel();
    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "rag_index",

          path: "embedding",

          queryVector: queryEmbedding,

          numCandidates: 100,

          limit,
        },
      },

      {
        $project: {
          _id: 1,

          documentId: 1,

          sourceName: 1,

          sourceType: 1,

          sourceUrl: 1,

          page: 1,

          chunkIndex: 1,

          text: 1,

          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);
console.log("Vector Search Results:", results);
    return results;
  } catch (error) {
    console.error("Vector Search Error:", error);

    throw error;
  }
};

module.exports = {
  searchDocuments,
};