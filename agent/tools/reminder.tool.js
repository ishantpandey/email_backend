const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const {
  createReminder,
  getPendingReminders,
  getAllReminders,
  cancelReminder,
} = require("../../service/reminderService/reminder.service");

const { addReminderJob, reminderQueue } = require("../../queue/reminder.queue");

/*
|--------------------------------------------------------------------------
| Create Reminder
|--------------------------------------------------------------------------
*/

const createReminderTool = tool(
  async (
    { title, description, delayMinutes, remindAt, notificationType },
    config,
  ) => {
    try {
      console.log("========== CREATE REMINDER TOOL ==========");

      const userId = config?.configurable?.userId;

      if (!userId) {
        return JSON.stringify({
          success: false,
          message: "Authenticated user ID is required.",
        });
      }

      let finalRemindAt;

      if (delayMinutes !== undefined && delayMinutes !== null) {
        const minutes = Number(delayMinutes);

        if (!Number.isFinite(minutes) || minutes <= 0) {
          return JSON.stringify({
            success: false,
            message: "delayMinutes must be greater than 0.",
          });
        }

        finalRemindAt = new Date(Date.now() + minutes * 60 * 1000);

        console.log("⏱️ Delay minutes:", minutes);
      } else if (remindAt) {

      /*
      |--------------------------------------------------------------------------
      | Explicit Date/Time
      |--------------------------------------------------------------------------
      |
      | Example:
      |
      | "Remind me tomorrow at 10 AM"
      |
      | The AI can provide remindAt as ISO.
      | If no timezone specified, treat as IST (Indian Standard Time)
      |
      */
        console.log("📅 Provided reminder time:", remindAt);
        
        // Check if timezone is specified (Z for UTC or +/-HH:MM for offset)
        const hasTimezone = remindAt.includes('Z') || remindAt.match(/[+-]\d{2}:\d{2}$/);
        
        if (!hasTimezone) {
          // No timezone specified - treat as IST by adding +05:30
          finalRemindAt = new Date(remindAt + '+05:30');
          console.log("✅ Interpreted as IST (added +05:30 offset)");
        } else {
          // Timezone already specified
          finalRemindAt = new Date(remindAt);
          console.log("✅ Using provided timezone");
        }
      } else {
        return JSON.stringify({
          success: false,
          message: "Reminder time is required.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Date
      |--------------------------------------------------------------------------
      */

      if (Number.isNaN(finalRemindAt.getTime())) {
        return JSON.stringify({
          success: false,
          message: "Invalid reminder date/time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Future
      |--------------------------------------------------------------------------
      */

      if (finalRemindAt.getTime() <= Date.now()) {
        return JSON.stringify({
          success: false,
          message: "Reminder time must be in the future.",
        });
      }

      console.log("⏰ Final reminder time:", finalRemindAt.toISOString());

      /*
      |--------------------------------------------------------------------------
      | Create MongoDB Reminder
      |--------------------------------------------------------------------------
      */

      const reminder = await createReminder({
        userId,

        title,

        description,

        remindAt: finalRemindAt,

        notificationType,
      });

      /*
      |--------------------------------------------------------------------------
      | Create BullMQ Job
      |--------------------------------------------------------------------------
      */

      const job = await addReminderJob(reminder);

      /*
      |--------------------------------------------------------------------------
      | Save BullMQ Job ID
      |--------------------------------------------------------------------------
      */

      reminder.jobId = job.id;

      await reminder.save();

      console.log("✅ Reminder created:", reminder._id);

      console.log("⏰ Job ID:", job.id);

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return JSON.stringify({
        success: true,

        message: "Reminder created successfully.",

        reminder: {
          id: reminder._id.toString(),

          title: reminder.title,

          description: reminder.description,

          remindAt: reminder.remindAt,

          notificationType: reminder.notificationType,

          status: reminder.status,

          jobId: job.id,
        },
      });
    } catch (error) {
      console.error("❌ Create reminder error:", error);

      return JSON.stringify({
        success: false,
        message: error.message,
      });
    }
  },

  {
    name: "create_reminder",

    description: `
Create a reminder for the authenticated user.

Use this tool ONLY when the user explicitly
asks to create a reminder.

IMPORTANT TIME RULES:

**TIMEZONE: Expects UTC time**
Users provide times in IST (UTC+5:30), but you must convert to UTC.

1. For relative time requests, use delayMinutes.

Examples:

"Remind me in 1 minute"
-> delayMinutes: 1

"Remind me in 5 minutes"
-> delayMinutes: 5

"Remind me in 2 hours"
-> delayMinutes: 120

"Remind me in 30 minutes"
-> delayMinutes: 30

2. DO NOT calculate the current datetime yourself
for relative reminders.

3. The application calculates the exact future
datetime using the current server time.

4. Use remindAt only when the user provides
a specific date/time.

**CRITICAL**: For absolute times:
- User provides time in IST (Indian Standard Time, UTC+5:30)
- You MUST convert IST to UTC (subtract 5 hours 30 minutes)
- Provide UTC time in ISO format WITH 'Z' suffix

Format: YYYY-MM-DDTHH:mm:ssZ (e.g., "2026-08-21T09:06:00Z")

Examples:

"Remind me at 3 PM today" (User means 3 PM IST = 15:00 IST)
-> Convert to UTC: 15:00 - 5:30 = 09:30 UTC
-> Use "2026-08-21T09:30:00Z"

"Remind me tomorrow at 10 AM" (User means 10 AM IST)
-> Convert to UTC: 10:00 - 5:30 = 04:30 UTC
-> Use "2026-08-22T04:30:00Z"

5. The reminder time must be in the future (in UTC).

Do not use this tool for general questions.
`,

    schema: z.object({
      title: z.string().describe("Short title of the reminder"),

      description: z
        .string()
        .default("")
        .describe("Additional reminder details"),

      delayMinutes: z
        .number()
        .optional()
        .describe(
          "Number of minutes from now for relative reminders. Example: 5 for 'in 5 minutes', 120 for 'in 2 hours'. Must be greater than 0.",
        ),

      remindAt: z
        .string()
        .optional()
        .describe(
          "Exact future reminder datetime in UTC (ISO 8601 format WITH 'Z' suffix). Format: YYYY-MM-DDTHH:mm:ssZ (e.g., '2026-08-21T09:30:00Z'). User provides IST times, so convert IST to UTC by subtracting 5 hours 30 minutes before passing here.",
        ),

      notificationType: z
        .enum(["email", "notification", "both"])
        .default("email")
        .describe("How the user should be notified"),
    }),
  },
);

/*
|--------------------------------------------------------------------------
| List Reminders
|--------------------------------------------------------------------------
*/

const listRemindersTool = tool(
  async (_, config) => {
    try {
      console.log("========== LIST REMINDERS TOOL ==========");

      const userId = config?.configurable?.userId;

      if (!userId) {
        return JSON.stringify({
          success: false,
          message: "Authenticated user ID is required.",
        });
      }

      const reminders = await getPendingReminders(userId);
      console.log("Pending reminders:", userId, reminders);
      return JSON.stringify({
        success: true,

        reminders: reminders.map((reminder) => ({
          id: reminder._id.toString(),

          title: reminder.title,

          description: reminder.description,

          remindAt: reminder.remindAt,

          notificationType: reminder.notificationType,

          status: reminder.status,
        })),
      });
    } catch (error) {
      console.error("❌ List reminder error:", error);

      return JSON.stringify({
        success: false,
        message: error.message,
      });
    }
  },

  {
    name: "list_reminders",

    description: `
Get the authenticated user's pending reminders.

Use this when the user asks:

"What reminders do I have?"

"Show my reminders."

"What do I need to remember?"
`,

    schema: z.object({}),
  },
);

/*
|--------------------------------------------------------------------------
| Get All Reminders
|--------------------------------------------------------------------------
*/

const getAllRemindersTool = tool(
  async (_, config) => {
    try {
      console.log("========== GET ALL REMINDERS TOOL ==========");

      const userId = config?.configurable?.userId;

      if (!userId) {
        return JSON.stringify({
          success: false,
          message: "Authenticated user ID is required.",
        });
      }

      const reminders = await getAllReminders(userId);
      console.log("All reminders:", userId, reminders.length);
      
      return JSON.stringify({
        success: true,

        reminders: reminders.map((reminder) => ({
          id: reminder._id.toString(),

          title: reminder.title,

          description: reminder.description,

          remindAt: reminder.remindAt,

          notificationType: reminder.notificationType,

          status: reminder.status,

          createdAt: reminder.createdAt,
        })),
      });
    } catch (error) {
      console.error("❌ Get all reminders error:", error);

      return JSON.stringify({
        success: false,
        message: error.message,
      });
    }
  },

  {
    name: "get_all_reminders",

    description: `
Get ALL of the authenticated user's reminders (pending, completed, and cancelled).

Use this when the user asks:

"Show me all my reminders."

"Show my reminder history."

"What are all my reminders?"

"Show both active and past reminders."

For pending reminders only, use list_reminders instead.
`,

    schema: z.object({}),
  },
);

/*
|--------------------------------------------------------------------------
| Cancel Reminder
|--------------------------------------------------------------------------
*/

const cancelReminderTool = tool(
  async ({ reminderId }, config) => {
    try {
      console.log("========== CANCEL REMINDER TOOL ==========");

      const userId = config?.configurable?.userId;

      if (!userId) {
        return JSON.stringify({
          success: false,
          message: "Authenticated user ID is required.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Cancel MongoDB Reminder
      |--------------------------------------------------------------------------
      */

      const reminder = await cancelReminder(reminderId, userId);

      /*
      |--------------------------------------------------------------------------
      | Remove BullMQ Job
      |--------------------------------------------------------------------------
      */

      if (reminder.jobId) {
        try {
          const job = await reminderQueue.getJob(reminder.jobId);

          if (job) {
            await job.remove();

            console.log("🗑️ BullMQ job removed:", reminder.jobId);
          }
        } catch (queueError) {
          console.error("⚠️ Could not remove BullMQ job:", queueError.message);
        }
      }

      return JSON.stringify({
        success: true,

        message: "Reminder cancelled successfully.",

        reminder: {
          id: reminder._id.toString(),

          title: reminder.title,

          status: reminder.status,
        },
      });
    } catch (error) {
      console.error("❌ Cancel reminder error:", error);

      return JSON.stringify({
        success: false,
        message: error.message,
      });
    }
  },

  {
    name: "cancel_reminder",

    description: `
Cancel one of the authenticated user's reminders.

Use this ONLY when the user explicitly asks
to cancel a reminder.

The reminderId must come from
list_reminders or conversation context.
`,

    schema: z.object({
      reminderId: z.string().describe("MongoDB ID of the reminder to cancel"),
    }),
  },
);

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

module.exports = {
  createReminderTool,
  listRemindersTool,
  getAllRemindersTool,
  cancelReminderTool,
};
