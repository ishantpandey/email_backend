const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    lowercase: true,
    trim: true
  },
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Email message is required'],
    maxlength: [10000, 'Message cannot exceed 10,000 characters']
  },
  type: {
    type: String,
    enum: ['welcome', 'custom', 'password-reset', 'bulk'],
    default: 'custom'
  },
  priority: {
    type: String,
    enum: ['high', 'normal', 'low', 'bulk'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed'],
    default: 'queued'
  },
  jobId: {
    type: String,
    required: [true, 'Job ID is required']
  },
  queuedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emailSchema.index({ userId: 1, createdAt: -1 });
emailSchema.index({ userEmail: 1, createdAt: -1 });
emailSchema.index({ status: 1, queuedAt: -1 });
emailSchema.index({ jobId: 1 });

module.exports = mongoose.model("Email", emailSchema);