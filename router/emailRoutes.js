const express = require('express');

// Controllers
const {
  sendEmail,
  sendBulkEmails,
  sendToAllUsers,
} = require('../controller/emailController/emailSendController');

const {
  getAllUserEmails,
  deleteUserEmails,
  getUserEmails,
  updateEmailStarStatus,
} = require('../controller/emailController/emailController');

const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Email sending routes
router.post('/send', sendEmail);                    // Send single email
router.post('/bulk-send', sendBulkEmails);          // Send bulk emails
router.post('/send-all', sendToAllUsers);           // Send email to all registered users

router.get('/list', authMiddleware, getAllUserEmails);   // Get complete email list for authenticated user
router.get('/history/:userId', getUserEmails);      // Get user email history
router.patch('/star', authMiddleware, updateEmailStarStatus); // Update starred status for emails
router.delete('/delete', authMiddleware, deleteUserEmails); // Delete emails by ID list


module.exports = router;