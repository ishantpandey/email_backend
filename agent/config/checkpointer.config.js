require("dotenv").config();

const { RedisSaver } = require("@langchain/langgraph-checkpoint-redis");

const redisUrl =
  process.env.REDIS_URL || "redis://localhost:6379";

let checkpointer = null;

const initializeCheckpointer = async () => {
  if (checkpointer) {
    return checkpointer;
  }

  console.log("🔄 Initializing LangGraph Redis...");

  checkpointer = await RedisSaver.fromUrl(redisUrl);

  console.log("RedisSaver type:", checkpointer.constructor.name);

  console.log(
    "RedisSaver methods:",
    Object.getOwnPropertyNames(
      Object.getPrototypeOf(checkpointer)
    )
  );

  return checkpointer;
};

module.exports = {
  initializeCheckpointer,
};