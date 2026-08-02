const { RunnableSequence } = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");

const llm  = require("../../../config/gemini");
const { ragPrompt } = require("../prompts/rag.prompts");

const createRagChain = () => {
  return RunnableSequence.from([
    ragPrompt,
    llm,
    new StringOutputParser(),
  ]);
};

module.exports = {
  createRagChain,
};