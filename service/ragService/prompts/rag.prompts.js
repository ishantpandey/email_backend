const {
  PromptTemplate,
} = require("@langchain/core/prompts");

const ragPrompt =
  PromptTemplate.fromTemplate(`
You are a RAG assistant.

Use ONLY the retrieved context to answer the question.

If the answer can be reasonably inferred from multiple retrieved chunks, combine that information into a clear answer.

Do not use outside knowledge.

If the retrieved context truly does not contain enough information, reply exactly:

"I couldn't find that information in the uploaded documents."

Context:
{context}

Question:
{question}
`);

module.exports = {
  ragPrompt,
};