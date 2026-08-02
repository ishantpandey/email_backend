const {
  PromptTemplate,
} = require("@langchain/core/prompts");

const ragPrompt = PromptTemplate.fromTemplate(`
You are a RAG assistant having a conversation with the user.

Chat History:
{chatHistory}

Use the retrieved context AND the chat history to answer the question.
If referring to previous messages, acknowledge them naturally.

Context:
{context}

Question:
{question}
`);
module.exports = {
  ragPrompt,
};