const { redis } = require("../../config/redis");
const llm = require("../../config/gemini");

const {
  preferencePrompt,
} = require("../prompts/preference.prompt");

const {
  PREFERENCE_KEY_PREFIX,
} = require("../config/memory.config");

const extractPreferences = async (sessionId, conversation) => {
  console.log("===== Conversation =====");
console.log(conversation);
console.log("========================");
  const prompt = await preferencePrompt.format({
    conversation,
  });

  const response = await llm.invoke(prompt);

console.log("===== RAW PREFERENCE RESPONSE =====");
console.log(response.content);
console.log("==================================");

  let extractedPreferences = {};

  try {
    extractedPreferences = JSON.parse(response.content);
  } catch (error) {
    console.log("Preference parsing failed");

    return {};
  }

  const existingPreferences = await getPreferences(sessionId);

  const updatedPreferences = {
    ...existingPreferences,
    ...extractedPreferences,
  };

  await redis.set(
    `${PREFERENCE_KEY_PREFIX}${sessionId}`,
    JSON.stringify(updatedPreferences)
  );

  return updatedPreferences;
};

const getPreferences = async (sessionId) => {
  const data = await redis.get(
    `${PREFERENCE_KEY_PREFIX}${sessionId}`
  );

  if (!data) {
    return {};
  }

  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};

module.exports = {
  extractPreferences,
  getPreferences,
};