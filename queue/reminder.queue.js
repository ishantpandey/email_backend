const { Queue, Worker } = require("bullmq");

const { redis } = require("../config/redis");

const {
  completeReminder,
} = require("../service/reminderService/reminder.service");

const Reminder = require("../model/reminderModel");
const User = require("../model/user");
const queueHelpers = require("../service/emailService/queueHelpers");

const queueName = "reminder-queue";

/*
|--------------------------------------------------------------------------
| Queue
|--------------------------------------------------------------------------
*/

const reminderQueue = new Queue(queueName, {
  connection: redis,
});

/*
|--------------------------------------------------------------------------
| Worker
|--------------------------------------------------------------------------
*/

const reminderWorker = new Worker(
  queueName,

  async (job) => {
    console.log("======================================");

    console.log("⏰ Reminder job started");+

    console.log("======================================");

    const { reminderId, userId, title, description, notificationType } =
      job.data;

    /*
     * Get reminder from database
     */

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId,
    });

    if (!reminder) {
      throw new Error("Reminder not found");
    }

    /*
     * Don't process cancelled reminders
     */

    if (reminder.status === "cancelled") {
      console.log("⚠️ Reminder was cancelled");

      return {
        success: false,
        message: "Reminder was cancelled",
      };
    }

    /*
     * Don't process already completed reminders
     */

    if (reminder.status === "completed") {
      console.log("⚠️ Reminder already completed");

      return {
        success: false,
        message: "Reminder already completed",
      };
    }

    /*
     |--------------------------------------------------------------------------
     | Notification
     |--------------------------------------------------------------------------
     |
     | Send reminder via email
     |
     */

    console.log("🔔 REMINDER TRIGGERED");

    console.log("Title:", title);

    console.log("Description:", description);

    console.log("Notification type:", notificationType);

    // Send reminder email
    if (notificationType === "email") {
      try {
        // Get user details for email
        const user = await User.findById(userId);
        
        if (!user) {
          throw new Error("User not found");
        }

        if (!user.email) {
          throw new Error("User email not found");
        }

        // Use queue helper to send reminder email
        await queueHelpers.addReminderEmail(
          user.email,
          user.name || "User",
          title,
          description
        );
        
        console.log("✅ Reminder email sent successfully");
      } catch (error) {
        console.error("❌ Failed to send reminder email:", error.message);
        // Continue to mark as completed even if email fails
      }
    }

    /*
     * Mark reminder completed
     */

    await completeReminder(reminderId);

    console.log("✅ Reminder completed");

    return {
      success: true,
      reminderId,
    };
  },

  {
    connection: redis,

    concurrency: 5,
  },
);

/*
|--------------------------------------------------------------------------
| Worker Events
|--------------------------------------------------------------------------
*/

reminderWorker.on("completed", (job) => {
  console.log(`✅ Reminder job ${job.id} completed`);
});

reminderWorker.on("failed", (job, error) => {
  console.error(`❌ Reminder job ${job?.id} failed:`, error);
});

reminderWorker.on("error", (error) => {
  console.error("❌ Reminder worker error:", error);
});

/*
|--------------------------------------------------------------------------
| Add Reminder Job
|--------------------------------------------------------------------------
*/

const addReminderJob = async (reminder) => {
  if (!reminder?._id) {
    throw new Error("Reminder ID is required");
  }

  if (!reminder?.remindAt) {
    throw new Error("Reminder time is required");
  }

  const delay = new Date(reminder.remindAt).getTime() - Date.now();

  if (delay <= 0) {
    throw new Error("Reminder time must be in the future");
  }

  const job = await reminderQueue.add(
    "send-reminder",
    {
      reminderId: reminder._id.toString(),

      userId: reminder.userId.toString(),

      title: reminder.title,

      description: reminder.description,

      notificationType: reminder.notificationType,
    },
    {
      delay,

      removeOnComplete: 100,

      removeOnFail: 100,

      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );
 console.log(`⏰ Reminder job ${job.id} added to queue with delay of ${delay}ms`);
  return job;
};

module.exports = {
  reminderQueue,
  reminderWorker,
  addReminderJob,
};
