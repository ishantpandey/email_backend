const { ChatPromptTemplate } = require("@langchain/core/prompts");

const summaryPrompt = ChatPromptTemplate.fromTemplate(`
You are an expert conversation summarizer.

Your job is to summarize the conversation while preserving important information.

Keep:

- ongoing tasks
- project details
- important decisions
- user goals
- technical stack
- unresolved questions

Remove:

- greetings
- repeated information
- small talk

Conversation:

{conversation}

Return only the updated summary.
`);

module.exports = {
  summaryPrompt,
};