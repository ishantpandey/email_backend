const { RedisChatMessageHistory } = require("@langchain/community/stores/message/ioredis");
const { redis } = require("../../config/redis");

const {
  generateConversationSummary,
  getConversationSummary,
} = require("./summary.service");

const {
  extractPreferences,
  getPreferences,
} = require("./preference.service");

const {
  KEEP_RECENT_MESSAGES,
} = require("../config/memory.config");

const {
  shouldSummarize,
} = require("./memory.helper");

const getMemory = async (sessionId) => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId,
    client: redis,
  });

  const messages = await chatHistory.getMessages();

  const summary =
    await getConversationSummary(sessionId);

  const preferences =
    await getPreferences(sessionId);

  return {
    summary,
    preferences,
    recentMessages: messages.slice(
      -KEEP_RECENT_MESSAGES
    ),
  };
};

const updateMemory = async (sessionId) => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId,
    client: redis,
  });

  const messages =
    await chatHistory.getMessages();

  const conversation = messages
    .map((message) => {
      const role =
        message._getType() === "human"
          ? "User"
          : "Assistant";

      return `${role}: ${message.content}`;
    })
    .join("\n");

  if (
    await shouldSummarize(
      sessionId,
      messages.length
    )
  ) {
    console.log("Generating conversation summary...");

    await generateConversationSummary(sessionId);
  }

  // Update preferences every 10 messages
  if (messages.length % 10 === 0) {
    console.log("Updating user preferences...");

    await extractPreferences(
      sessionId,
      conversation
    );
  }
};

module.exports = {
  getMemory,
  updateMemory,
};