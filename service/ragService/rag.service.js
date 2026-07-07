
const ai = require("../../config/gemini");
const { searchDocuments } = require("./vectorSearch.service");

/**
 * Build context from retrieved chunks
 */
const buildContext = (documents = []) => {
  return documents
    .map((doc, index) => {
      return `
Document ${index + 1}

Source: ${doc.sourceName}
Type: ${doc.sourceType}
Page: ${doc.page}

${doc.text}
`;
    })
    .join("\n\n---------------------------------\n\n");
};

/**
 * Ask Question using RAG
 */
const askRag = async (question) => {
  try {
    if (!question?.trim()) {
      throw new Error("Question is required.");
    }

    /**
     * Retrieve relevant documents
     */
    const documents = await searchDocuments(question, 5);

    console.log("Retrieved Documents");
    console.log(documents);

    /**
     * Filter low-quality matches
     *
     * You can adjust this threshold.
     * Usually 0.70 - 0.85 works well.
     */
    const filteredDocuments = documents.filter(
      (doc) => doc.score >= 0.75
    );

    console.log("Filtered Documents");
    console.log(filteredDocuments);

    /**
     * No relevant documents
     */
    if (!filteredDocuments.length) {
      return {
        answer:
          "I couldn't find that information in the uploaded documents.",
        sources: [],
      };
    }

    /**
     * Build context
     */
    const context = buildContext(filteredDocuments);

    /**
     * Strict Prompt
     */
    const prompt = `
You are a Retrieval-Augmented Generation (RAG) assistant.

You MUST answer ONLY using the CONTEXT provided below.

==========================
RULES
==========================

1. Never use your own knowledge.

2. Never guess.

3. Never use outside information.

4. If the answer is NOT present in the context, reply EXACTLY:

"I couldn't find that information in the uploaded documents."

5. Do not explain why.

6. Do not provide extra knowledge.

7. Keep the answer concise.

==========================
CONTEXT
==========================

${context}

==========================
QUESTION
==========================

${question}

==========================
ANSWER
==========================
`;

    /**
     * Ask Gemini
     */
    const response = await ai.models.generateContent({
      model: `${process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"}`,
      contents: prompt,
    });

    const answer =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate an answer.";

    return {
      answer,

      sources: filteredDocuments.map((doc) => ({
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