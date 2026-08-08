const { Job } = require("bullmq");

const { ragQueue } = require("../../queue/ragQueue");

const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.fromId(ragQueue, jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const state = await job.getState();

    return res.json({
      success: true,

      jobId: job.id,

      state,

      progress: job.progress,

      result: job.returnvalue,

      failedReason: job.failedReason,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getJobStatus,
};