const { Queue, Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { redis } = require('../config/redis');
const { createWelcomeTemplate, createPasswordResetTemplate, createCustomTemplate, createEmailVerificationTemplate } = require('../service/emailService/emailTemplates');
const User = require('../model/user');
require('dotenv').config();

// Create email queue
const emailQueue = new Queue('emailQueue', {
  connection: redis,
});


// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

// Email worker to process jobs
const emailWorker = new Worker('emailQueue', async (job) => {
  const { type, email, userName, subject, message } = job.data;
  
  try {
    let mailOptions;

    if (type === 'welcome') {
      mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Your App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Welcome to Our Platform!',
        html: createWelcomeTemplate(userName)
      };
    } else if (type === 'custom') {
      mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Your App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: subject,
        html: createCustomTemplate(userName, message)
      };
    } else if (type === 'password-reset') {
      const { resetLink } = job.data;
      if (!resetLink) {
        throw new Error('Password reset emails require resetLink');
      }
      mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Your App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Password Reset Request',
        html: createPasswordResetTemplate(userName, resetLink)
      };
    } else if (type === 'email-verification') {
      const { verificationLink } = job.data;
      if (!verificationLink) {
        throw new Error('Email verification emails require verificationLink');
      }
      mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Your App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Verify Your Email Address',
        html: createEmailVerificationTemplate(userName, verificationLink)
      };
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type} email sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId, type };
  } catch (error) {
    console.error(`❌ Email worker error (${type}):`, error);
    throw error;
  }
}, {
  connection: redis,
});

// Worker event handlers
emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err);
});


module.exports = {
  emailQueue,
  emailWorker,
};