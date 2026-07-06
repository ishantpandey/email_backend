
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
     * If nothing found, use general LLM response
     */
    if (!retrievedDocs.length) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [{ text: question }]
        }
      });

      const answer =
        response.response?.text() ||
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help! How can I assist you?";

      return {
        answer,
        sources: [],
        mode: "conversational",
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
You are a helpful AI assistant with access to specific documents.

Answer the question using the provided context below.

If the answer is in the context, provide a detailed answer based on it.

If the question is not related to the context, you can answer conversationally.

------------------------------

CONTEXT

${context}

------------------------------

QUESTION

${question}

------------------------------

Provide a helpful answer:
`;

    /**
     * Generate answer
     */
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [{ text: prompt }]
      }
    });

    const answer =
      response.response?.text() ||
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
      mode: "document-based",
    };
  } catch (error) {
    console.error("RAG Error:", error);
    throw error;
  }
};

module.exports = {
  askRag,
};
