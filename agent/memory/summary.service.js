const { RedisChatMessageHistory } = require("@langchain/community/stores/message/ioredis");
const { redis } = require("../../config/redis");
const llm = require("../../config/gemini");



const { summaryPrompt } = require("../prompts/summary.prompts");
const { SUMMARY_AFTER_MESSAGES } = require("../config/memory.config");

const generateConversationSummary = async (sessionId) => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId,
    client: redis,
  });

  const messages = await chatHistory.getMessages();

  // Don't summarize if conversation is still short
  if (messages.length < SUMMARY_AFTER_MESSAGES) {
    return null;
  }

  const conversation = messages
    .map((message) => {
      const role = message._getType() === "human" ? "User" : "Assistant";
      return `${role}: ${message.content}`;
    })
    .join("\n");

  const prompt = await summaryPrompt.format({
    conversation,
  });

  const response = await llm.invoke(prompt);

  const summary = response.content;

  await redis.set(
    `summary:${sessionId}`,
    summary
  );

  return summary;
};

const getConversationSummary = async (sessionId) => {
  return await redis.get(`summary:${sessionId}`);
};

module.exports = {
  generateConversationSummary,
  getConversationSummary,
};