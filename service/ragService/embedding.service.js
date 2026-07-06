const ai = require("../../config/gemini");



/**
 * Generate embedding for a text chunk using Gemini.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
const createEmbedding = async (text) => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text is required to generate embeddings.");
    }

    // Clean text before sending
    const cleanedText = text
      .replace(/\r/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedText.length) {
      throw new Error("Text is empty after cleaning.");
    }

    /**
     * Generate embedding
     */
    const response = await ai.models.embedContent({
      model: `${process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"}`,
      contents: cleanedText,
    });

    if (
      !response ||
      !response.embeddings ||
      !response.embeddings.length ||
      !response.embeddings[0].values
    ) {
      throw new Error("Embedding generation failed.");
    }

    return response.embeddings[0].values;
  } catch (error) {
    console.error("Embedding Error:", error);

    throw error;
  }
};

/**
 * Generate embeddings for multiple chunks.
 *
 * @param {string[]} chunks
 * @returns {Promise<number[][]>}
 */
const createEmbeddings = async (chunks = []) => {
  const embeddings = [];

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);
    embeddings.push(embedding);
  }

  return embeddings;
};



module.exports = {
  createEmbedding,
  createEmbeddings,
};



