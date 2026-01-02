// Services
const queueHelpers = require('../service/queueHelpers');

// Models
const User = require('../config/model/user');
const Email = require('../config/model/email');

// Utilities
const {
  validateClientEmailData,
  validateSubjectAndMessage,
  validateBulkEmails,
  sanitizeEmailData
} = require('../utils/emailValidation');
const { getUserEmailHistory, getUserEmailStats } = require('../utils/emailHistory');

// Constants
const {
  HTTP_STATUS,
  EMAIL_CONFIG,
  MESSAGES
} = require('../constants');


const sendEmail = async (req, res) => {
  try {
    // Validate client data format: { to, subject, message, priority }
    const clientErrors = validateClientEmailData(req.body);
    if (clientErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: clientErrors
      });
    }
      
    // Sanitize and convert client format to internal format
    const sanitizedData = sanitizeEmailData(req.body);
    const { email, priority, customData } = sanitizedData;
    
    // Extract email details (now guaranteed to exist after validation)
    const { subject, message } = customData;
    
    // Check if user exists in database
    const user = await User.findOne({ email: email }).lean();
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found with this email address',
        email: email
      });
    }
    
    // Send custom email
    const job = await queueHelpers.addCustomEmail(email, user.name, subject, message, { priority });
    
    // Store email history in database
    const emailRecord = new Email({
      userId: user._id,
      userEmail: email,
      userName: user.name,
      subject,
      message,
      type: 'custom',
      priority,
      status: 'queued',
      jobId: job.id
    });
    
    await emailRecord.save();
    
    // Success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.EMAIL.SEND_SUCCESS,
      data: {
        jobId: job.id,
        emailRecordId: emailRecord._id,
        type: 'custom',
        to: email,
        userId: user._id,
        userName: user.name,
        subject,
        priority,
        queuedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.EMAIL.SEND_FAILED,
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};


 // Send multiple emails in bulk

const sendBulkEmails = async (req, res) => {
  try {
    const { subject, message, emails, priority = 'bulk' } = req.body;
    
    // Validate subject and message
    const subjectMessageErrors = validateSubjectAndMessage(subject, message);
    if (subjectMessageErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Subject and message validation failed',
        errors: subjectMessageErrors
      });
    }
    
    // Validate bulk emails
    const emailValidation = validateBulkEmails(emails, EMAIL_CONFIG.MAX_BULK_SIZE);
    if (!emailValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email validation failed',
        errors: emailValidation.errors
      });
    }
    
    // Check if all users exist in database and store email history
    const emailRecords = [];
    const bulkJobs = [];
    const notFoundEmails = [];
    
    for (const email of emailValidation.validEmails) {
      const user = await User.findOne({ email: email }).lean();
      if (!user) {
        notFoundEmails.push(email);
        continue;
      }
      
      // Send email
      const job = await queueHelpers.addCustomEmail(
        email, 
        user.name, 
        subject.trim(), 
        message.trim(), 
        { priority }
      );
      bulkJobs.push(job);
      
      // Store email history
      const emailRecord = new Email({
        userId: user._id,
        userEmail: email,
        userName: user.name,
        subject: subject.trim(),
        message: message.trim(),
        type: 'bulk',
        priority,
        status: 'queued',
        jobId: job.id
      });
      
      emailRecords.push(emailRecord);
    }
    
    // Save all email records
    if (emailRecords.length > 0) {
      await Email.insertMany(emailRecords);
    }
    
    // Success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `${bulkJobs.length} ${MESSAGES.EMAIL.BULK_SUCCESS}`,
      data: {
        totalRequested: emailValidation.validEmails.length,
        totalQueued: bulkJobs.length,
        usersNotFound: notFoundEmails.length,
        notFoundEmails: notFoundEmails,
        type: 'bulk',
        priority,
        jobIds: bulkJobs.map(job => job.id),
        emailRecordIds: emailRecords.map(record => record._id),
        queuedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk email send error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.EMAIL.BULK_FAILED,
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Send password reset email (dedicated endpoint)
 * @route POST /api/email/send-password-reset
 * @body { email, userName, resetLink, priority? }
 */
const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email, userName, resetLink, priority = 'high' } = req.body;
    
    // Basic validation
    if (!email || !userName || !resetLink) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email, userName, and resetLink are required'
      });
    }
    
    // Queue password reset email
    const job = await queueHelpers.addPasswordResetEmail(email, userName, resetLink, { priority });
    
    // Success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset email queued successfully',
      data: {
        jobId: job.id,
        type: 'password-reset',
        email,
        userName,
        priority,
        queuedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to queue password reset email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get queue statistics
 * @route GET /api/email/queue/stats
 */
const getQueueStats = async (req, res) => {
  try {
    const stats = await queueHelpers.getQueueStats();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.QUEUE.STATS_SUCCESS,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Queue stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.QUEUE.STATS_FAILED,
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

//Send email to all registered users

const sendToAllUsers = async (req, res) => {
  try {
    const { subject, message, priority = 'bulk' } = req.body;
    
    // Validate subject and message
    const validationErrors = validateSubjectAndMessage(subject, message);
    if (validationErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Subject and message validation failed',
        errors: validationErrors
      });
    }
    
    // Get all registered users
    const users = await User.find({}, 'email name').lean();
    
    if (users.length === 0) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'No registered users found',
        data: {
          totalUsers: 0,
          emailsQueued: 0,
          queuedAt: new Date().toISOString()
        }
      });
    }
    
    // Queue emails for all users and store email history
    const emailRecords = [];
    const emailPromises = users.map(async (user) => {
      const job = await queueHelpers.addCustomEmail(
        user.email, 
        user.name || 'User', 
        subject.trim(), 
        message.trim(), 
        { priority }
      );
      
      // Create email record
      const emailRecord = new Email({
        userId: user._id,
        userEmail: user.email,
        userName: user.name || 'User',
        subject: subject.trim(),
        message: message.trim(),
        type: 'bulk',
        priority,
        status: 'queued',
        jobId: job.id
      });
      
      emailRecords.push(emailRecord);
      return job;
    });
    
    const jobs = await Promise.all(emailPromises);
    
    // Save all email records
    await Email.insertMany(emailRecords);
    
    // Success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Successfully queued emails for all ${users.length} registered users`,
      data: {
        totalUsers: users.length,
        emailsQueued: jobs.length,
        jobIds: jobs.map(job => job.id),
        emailRecordIds: emailRecords.map(record => record._id),
        priority,
        subject: subject.trim(),
        queuedAt: new Date().toISOString(),
        estimatedDeliveryTime: `${Math.ceil(users.length / 10)} minutes` // Rough estimate based on queue processing
      }
    });
    
  } catch (error) {
    console.error('❌ Send to all users error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to queue emails for all users',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Retry failed jobs
 * @route POST /api/email/queue/retry-failed
 */
// const retryFailedJobs = async (req, res) => {
//   try {
//     const { limit = 10 } = req.body;
    
//     // Validate retry limit
//     if (limit > EMAIL_CONFIG.MAX_RETRY_ATTEMPTS) {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({
//         success: false,
//         message: `Maximum retry limit is ${EMAIL_CONFIG.MAX_RETRY_ATTEMPTS} jobs at once`
//       });
//     }
    
//     const retriedCount = await queueHelpers.retryFailedJobs(limit);
    
//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       message: `${retriedCount} ${MESSAGES.QUEUE.RETRY_SUCCESS}`,
//       data: {
//         retriedCount,
//         limit,
//         retriedAt: new Date().toISOString()
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Retry failed jobs error:', error);
//     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: MESSAGES.QUEUE.RETRY_FAILED,
//       error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
//     });
//   }
// };

/**
 * Email service health check
 * @route GET /api/email/test
 */
// const getEmailServiceHealth = async (req, res) => {
//   try {
//     const stats = await queueHelpers.getQueueStats();
    
//     res.status(HTTP_STATUS.OK).json({
//       success: true,
//       message: MESSAGES.EMAIL.HEALTH_CHECK_SUCCESS,
//       data: {
//         service: 'email-queue',
//         status: 'healthy',
//         queue: stats,
//         redis: 'connected',
//         nodemailer: 'configured',
//         version: process.env.npm_package_version || '1.0.0',
//         timestamp: new Date().toISOString()
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Email health check error:', error);
//     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: MESSAGES.EMAIL.HEALTH_CHECK_FAILED,
//       error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
//     });
//   }
// };

/**
 * Get email history for a user
 * @route GET /api/email/history/:userId
 */
const getUserEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, skip = 0, sortBy = '-createdAt' } = req.query;

    // Validate user exists
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    const emailHistory = await getUserEmailHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy
    });

    const stats = await getUserEmailStats(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email history retrieved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        stats,
        emails: emailHistory.emails,
        pagination: emailHistory.pagination
      }
    });

  } catch (error) {
    console.error('❌ Get user emails error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve email history',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Get all users email list
 * @route GET /api/email/users
 */
const getAllUserEmails = async (req, res) => {
  try {
    // Get all users ordered by creation date (newest first)
    const users = await Email.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User email list retrieved successfully',
      data: {
        users: users,
        total: users.length
      }
    });

  } catch (error) {
    console.error('❌ Get all user emails error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve user email list',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendPasswordResetEmail,
  sendToAllUsers,
  getUserEmails,
  getAllUserEmails,
  getQueueStats,
  //retryFailedJobs,
  //getEmailServiceHealth
};