const { emailQueue } = require("./emailQueue");
const { cleanupQueue } = require("./emailQueue");

// Simple priority mapping - ensures integer values for BullMQ
function getPriority(priority) {
  if (typeof priority === 'string') {
    switch (priority.toLowerCase()) {
      case "high": return 10;
      case "low": return 1;
      case "normal": return 3;
      default: return 5;
    }
  }
}

const queueHelpers = {
  addWelcomeEmail: async (email, userName, options = {}) => {
    if (!email || !userName) {
      throw new Error("Email and userName are required");
    }

    // Prepare options with integer priority
    const jobOptions = {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: 20,
      ...options,
      priority: getPriority(options.priority), // Ensure this always overrides any float priority
    };

    const job = await emailQueue.add("welcome-email",
      {
        type: "welcome",
        email: email.toLowerCase().trim(),
        userName: userName.trim(),
      },
      jobOptions
    );

    console.log(`📧 Welcome email queued for ${email}`);
    return job;
  },

  addCustomEmail: async (email, userName, subject, message, options = {}) => {

    // Prepare options with integer priority
    const jobOptions = {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 20,
      ...options,
      priority: getPriority(options.priority), // Ensure this always overrides any float priority
    };

    const job = await emailQueue.add("custom-email",
      {
        type: "custom",
        email: email.toLowerCase().trim(),
        userName: userName.trim(),
        subject: subject.trim(),
        message,
      },
      jobOptions
    );

    console.log(`📧 Custom email queued for ${email}`);
    return job;
  },

  addPasswordResetEmail: async (email, userName, resetLink, options = {}) => {
    if (!email || !userName || !resetLink) {
      throw new Error("Email, userName, and resetLink required");
    }

    // Prepare options with integer priority
    const jobOptions = {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 20,
      ...options,
      priority: getPriority(options.priority || "high"), // Ensure this always overrides any float priority
    };

    const job = await emailQueue.add(
      "password-reset-email",
      {
        type: "password-reset",
        email: email.toLowerCase().trim(),
        userName: userName.trim(),
        resetLink,
      },
      jobOptions
    );

    console.log(`📧 Password reset email queued for ${email}`);
    return job;
  },

  addEmailVerificationEmail: async (email, userName, verificationLink, options = {}) => {
    if (!email || !userName || !verificationLink) {
      throw new Error("Email, userName, and verificationLink required");
    }

    // Prepare options with integer priority
    const jobOptions = {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 20,
      ...options,
      priority: getPriority(options.priority || "high"), // Ensure this always overrides any float priority
    };

    const job = await emailQueue.add(
      "email-verification",
      {
        type: "email-verification",
        email: email.toLowerCase().trim(),
        userName: userName.trim(),
        verificationLink,
      },
      jobOptions
    );

    console.log(`📧 Email verification queued for ${email}`);
    return job;
  },

  addPasswordResetEmail: async (email, userName, resetLink, options = {}) => {
    if (!email || !userName || !resetLink) {
      throw new Error("Email, userName, and resetLink are required");
    }

    // Prepare options with integer priority - password reset should be high priority
    const jobOptions = {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: 20,
      priority: 8, // High priority for password reset emails
      ...options,
    };

    const job = await emailQueue.add("password-reset-email",
      {
        type: "password-reset",
        email: email.toLowerCase().trim(),
        userName: userName.trim(),
        resetLink: resetLink,
      },
      jobOptions
    );

    console.log(`🔒 Password reset email queued for ${email}`);
    return job;
  },

  getQueueStats: async () => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getActive(),
      emailQueue.getCompleted(0, 99),
      emailQueue.getFailed(0, 99),
      emailQueue.getDelayed(),
    ]);

    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };

    stats.total =
      stats.waiting +
      stats.active +
      stats.completed +
      stats.failed +
      stats.delayed;
    return stats;
  },

  retryFailedJobs: async (limit = 10) => {
    const failed = await emailQueue.getFailed(0, limit - 1);
    if (failed.length === 0) return 0;

    await Promise.all(failed.map((job) => job.retry()));
    console.log(`🔄 Retried ${failed.length} jobs`);
    return failed.length;
  },
};

module.exports = queueHelpers;
