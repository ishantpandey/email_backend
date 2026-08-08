const { ChatPromptTemplate } = require("@langchain/core/prompts");

const preferencePrompt = ChatPromptTemplate.fromTemplate(`
Extract ONLY long-term user preferences.

Examples of preferences:

- Programming language
- Framework
- Coding style
- Career goals
- Preferred technologies
- Learning interests

Ignore temporary requests.

Conversation:

{conversation}

Return ONLY valid JSON.

Example:

{{
  "framework": "React",
  "language": "TypeScript",
  "database": "MongoDB"
}}
`);

module.exports = {
  preferencePrompt,
};