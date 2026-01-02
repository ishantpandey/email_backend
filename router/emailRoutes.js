const express = require('express');

// Controllers
const {
  sendEmail,
  sendBulkEmails,
  sendToAllUsers,
  getUserEmails,
  getAllUserEmails,
  getQueueStats,
  //retryFailedJobs,
  //getEmailServiceHealth
} = require('../controller/emailController');

const router = express.Router();

// Email sending routes
router.post('/send', sendEmail);                    // Send single email
router.post('/bulk-send', sendBulkEmails);          // Send bulk emails
router.post('/send-all', sendToAllUsers);           // Send email to all registered users

// Email history routes
router.get('/users', getAllUserEmails);             // Get all users email list
router.get('/history/:userId', getUserEmails);      // Get user email history

// Queue management routes
router.get('/queue/stats', getQueueStats);           // Get queue statistics
//router.post('/queue/retry-failed', retryFailedJobs); // Retry failed jobs

// Health check route
//router.get('/test', getEmailServiceHealth); // Service health check

module.exports = router;