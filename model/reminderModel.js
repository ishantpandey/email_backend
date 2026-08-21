const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    remindAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    notificationType: {
      type: String,
      enum: [
        "email",
        "notification",
        "both",
      ],
      default: "email",
    },

    jobId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Reminder",
  reminderSchema
);