const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { askRag } = require("../../service/ragService/rag.service");

const ragTool = tool(
  async ({ question }, config) => {
    const sessionId = config?.configurable?.sessionId;
    console.log("========== rag TOOL CALLED ==========");
    const result = await askRag(question, sessionId);

    return result.answer;
  },
  {
    name: "rag",
    description: `
Use this tool whenever the user asks about:

- uploaded documents
- uploaded files
- PDFs
- DOCX
- CSV
- TXT
- websites
- resume
- CV
- API Setu documentation
- knowledge base
- uploaded content
- summarize uploaded documents
- information from uploaded files

Always use this tool if the answer might exist in uploaded documents.
Never answer from your own knowledge when the question refers to uploaded content.
`,
    schema: z.object({
      question: z.string(),
    }),
  },
);

module.exports = {
  ragTool,
};
