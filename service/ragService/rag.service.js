
const ai = require("../../config/gemini");
const { searchDocuments } = require("./vectorSearch.service");



/**
 * =====================================================
 * Build Context from Retrieved Documents
 * =====================================================
 */
const buildContext = (documents = []) => {
  return documents
    .map((doc, index) => {
      return `
Document ${index + 1}

Source: ${doc.sourceName}
Type: ${doc.sourceType}
Page: ${doc.page}
Similarity Score: ${doc.score?.toFixed(4)}

Content:
${doc.text}
`;
    })
    .join("\n----------------------------------------\n");
};

/**
 * =====================================================
 * Ask Gemini using RAG
 * =====================================================
 *
 * @param {string} question
 *
 * @returns {Promise<Object>}
 */
const askRag = async (question) => {
  try {
    if (!question || !question.trim()) {
      throw new Error("Question is required.");
    }

    /**
     * Retrieve relevant chunks
     */
    const retrievedDocs = await searchDocuments(question, 5);

    /**
     * If nothing found
     */
    if (!retrievedDocs.length) {
      return {
        answer:
          "I couldn't find any relevant information in the uploaded documents.",
        sources: [],
      };
    }

    /**
     * Build context
     */
    const context = buildContext(retrievedDocs);

    /**
     * Prompt
     */
    const prompt = `
You are a helpful AI assistant.

Answer ONLY from the provided context.

If the answer is not present in the context,
say:

"I couldn't find that information in the uploaded documents."

Do not make up information.

------------------------------

CONTEXT

${context}

------------------------------

QUESTION

${question}

------------------------------

Return only the answer.
`;

    /**
     * Generate answer
     */
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const answer =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No answer generated.";

    return {
      answer,

      sources: retrievedDocs.map((doc) => ({
        documentId: doc.documentId,

        sourceName: doc.sourceName,

        sourceType: doc.sourceType,

        page: doc.page,

        score: doc.score,
      })),
    };
  } catch (error) {
    console.error("RAG Error:", error);

    throw error;
  }
};

module.exports = {
  askRag,
};
