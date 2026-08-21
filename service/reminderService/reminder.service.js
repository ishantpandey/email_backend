const Reminder = require("../../model/reminderModel");

/*
|--------------------------------------------------------------------------
| Create Reminder
|--------------------------------------------------------------------------
*/

const createReminder = async ({
  userId,
  title,
  description = "",
  remindAt,
  notificationType = "email",
}) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!title) {
    throw new Error("Reminder title is required");
  }

  if (!remindAt) {
    throw new Error("Reminder time is required");
  }

  const reminderDate = new Date(remindAt);

  if (Number.isNaN(reminderDate.getTime())) {
    throw new Error("Invalid reminder date");
  }

  if (reminderDate <= new Date()) {
    throw new Error(
      "Reminder time must be in the future"
    );
  }

  const reminder = await Reminder.create({
    userId,
    title,
    description,
    remindAt: reminderDate,
    notificationType,
    status: "pending",
  });

  return reminder;
};


/*
|--------------------------------------------------------------------------
| Get Pending Reminders
|--------------------------------------------------------------------------
*/

const getPendingReminders = async (userId) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  return Reminder.find({
    userId,
    status: "pending",
    remindAt: {
      $gt: new Date(),
    },
  })
    .sort({ remindAt: 1 })
    .lean();
};


/*
|--------------------------------------------------------------------------
| Get All Reminders
|--------------------------------------------------------------------------
*/

const getAllReminders = async (userId) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  return Reminder.find({
    userId,
  })
    .sort({ remindAt: 1 })
    .lean();
};


/*
|--------------------------------------------------------------------------
| Get Reminder By ID
|--------------------------------------------------------------------------
*/

const getReminderById = async (
  reminderId,
  userId
) => {
  if (!reminderId) {
    throw new Error("reminderId is required");
  }

  if (!userId) {
    throw new Error("userId is required");
  }

  const reminder = await Reminder.findOne({
    _id: reminderId,
    userId,
  });

  if (!reminder) {
    throw new Error("Reminder not found");
  }

  return reminder;
};


/*
|--------------------------------------------------------------------------
| Cancel Reminder
|--------------------------------------------------------------------------
*/

const cancelReminder = async (
  reminderId,
  userId
) => {
  const reminder =
    await getReminderById(
      reminderId,
      userId
    );

  if (reminder.status !== "pending") {
    throw new Error(
      `Reminder is already ${reminder.status}`
    );
  }

  reminder.status = "cancelled";

  await reminder.save();

  return reminder;
};


/*
|--------------------------------------------------------------------------
| Complete Reminder
|--------------------------------------------------------------------------
*/

const completeReminder = async (
  reminderId
) => {
  if (!reminderId) {
    throw new Error(
      "reminderId is required"
    );
  }

  const reminder =
    await Reminder.findById(
      reminderId
    );

  if (!reminder) {
    throw new Error(
      "Reminder not found"
    );
  }

  reminder.status = "completed";

  await reminder.save();

  return reminder;
};


/*
|--------------------------------------------------------------------------
| Update Job ID
|--------------------------------------------------------------------------
*/

const updateReminderJobId = async (
  reminderId,
  jobId
) => {
  if (!reminderId) {
    throw new Error(
      "reminderId is required"
    );
  }

  if (!jobId) {
    throw new Error(
      "jobId is required"
    );
  }

  const reminder =
    await Reminder.findByIdAndUpdate(
      reminderId,
      {
        jobId,
      },
      {
        new: true,
      }
    );

  if (!reminder) {
    throw new Error(
      "Reminder not found"
    );
  }

  return reminder;
};


/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createReminder,
  getPendingReminders,
  getAllReminders,
  getReminderById,
  cancelReminder,
  completeReminder,
  updateReminderJobId,
};