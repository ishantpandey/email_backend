const { redis } = require("../../config/redis");

const {
  SUMMARY_AFTER_MESSAGES,
} = require("../config/memory.config");

const shouldSummarize = async (sessionId, currentMessageCount) => {
  const key = `summary-meta:${sessionId}`;

  const lastSummaryCount =
    Number(await redis.get(key)) || 0;

  const newMessages =
    currentMessageCount - lastSummaryCount;

  if (newMessages >= SUMMARY_AFTER_MESSAGES) {
    await redis.set(key, currentMessageCount);

    return true;
  }

  return false;
};

module.exports = {
  shouldSummarize,
};