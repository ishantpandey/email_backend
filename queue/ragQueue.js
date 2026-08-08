const { Queue, Worker } = require("bullmq");

const redis = require("../config/redis");

const {
  ingestFile,
  ingestWebsite,
  ingestText,
} = require("../service/ragService/ingestion.service");

// =========================
// Queue
// =========================

const ragQueue = new Queue("rag-ingestion", {
  connection: redis,

  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 3000,
    },

    removeOnComplete: 100,

    removeOnFail: 50,
  },
});

// =========================
// Job Handlers
// =========================

const handlers = {
  file: async (job) =>
    ingestFile(
      {
        filePath: job.data.filePath,
        originalName: job.data.originalName,
      },
      job
    ),

  website: async (job) =>
    ingestWebsite(job.data.url, job),

  text: async (job) =>
    ingestText(job.data.text, job),
};

// =========================
// Worker
// =========================

const worker = new Worker(
  "rag-ingestion",

  async (job) => {
    console.log("================================");
    console.log(`Job Started : ${job.id}`);
    console.log(job.data);
    console.log("================================");

    const handler = handlers[job.data.type];

    if (!handler) {
      throw new Error(`Unsupported job type: ${job.data.type}`);
    }

    return await handler(job);
  },

  {
    connection: redis,

    concurrency: 5,
  }
);

// =========================
// Events
// =========================

worker.on("ready", () => {
  console.log("✅ RAG Worker Ready");
});

worker.on("active", (job) => {
  console.log(`🚀 Job ${job.id} Started`);
});

worker.on("progress", (job, progress) => {
  console.log(`📊 Job ${job.id} : ${progress}%`);
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} Completed`);
});

worker.on("failed", (job, error) => {
  console.log(`❌ Job ${job.id} Failed`);
  console.log(error.message);
});

module.exports = {
  ragQueue,
  worker,
};