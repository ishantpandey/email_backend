// Services
const queueHelpers = require('../../service/emailService/queueHelpers');

// Models
const User = require('../../model/user');
const Email = require('../../model/email');

// Utilities
const {
  validateClientEmailData,
  validateSubjectAndMessage,
  validateBulkEmails,
  sanitizeEmailData
} = require('../../utils/emailValidation');

// Constants
const {
  HTTP_STATUS,
  EMAIL_CONFIG,
  MESSAGES
} = require('../../constants');


const sendEmail = async (req, res) => {
  try {
    const clientErrors = validateClientEmailData(req.body);
    if (clientErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: clientErrors
      });
    }

    const sanitizedData = sanitizeEmailData(req.body);
    const { email, priority, customData } = sanitizedData;
    const { subject, message } = customData;

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found with this email address',
        email
      });
    }

    const job = await queueHelpers.addCustomEmail(email, user.name, subject, message, { priority });

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

/**
 * Send multiple custom emails in bulk
 * @route POST /api/email/bulk-send
 */
const sendBulkEmails = async (req, res) => {
  try {
    const { subject, message, emails, priority = 'bulk' } = req.body;

    const subjectMessageErrors = validateSubjectAndMessage(subject, message);
    if (subjectMessageErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Subject and message validation failed',
        errors: subjectMessageErrors
      });
    }

    const emailValidation = validateBulkEmails(emails, EMAIL_CONFIG.MAX_BULK_SIZE);
    if (!emailValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email validation failed',
        errors: emailValidation.errors
      });
    }

    const emailRecords = [];
    const bulkJobs = [];
    const notFoundEmails = [];

    for (const email of emailValidation.validEmails) {
      const user = await User.findOne({ email }).lean();
      if (!user) {
        notFoundEmails.push(email);
        continue;
      }

      const job = await queueHelpers.addCustomEmail(
        email,
        user.name,
        subject.trim(),
        message.trim(),
        { priority }
      );
      bulkJobs.push(job);

      emailRecords.push(new Email({
        userId: user._id,
        userEmail: email,
        userName: user.name,
        subject: subject.trim(),
        message: message.trim(),
        type: 'bulk',
        priority,
        status: 'queued',
        jobId: job.id
      }));
    }

    if (emailRecords.length > 0) {
      await Email.insertMany(emailRecords);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `${bulkJobs.length} ${MESSAGES.EMAIL.BULK_SUCCESS}`,
      data: {
        totalRequested: emailValidation.validEmails.length,
        totalQueued: bulkJobs.length,
        usersNotFound: notFoundEmails.length,
        notFoundEmails,
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
 * Send custom email to all registered users
 * @route POST /api/email/send-all
 */
const sendToAllUsers = async (req, res) => {
  try {
    const { subject, message, priority = 'bulk' } = req.body;

    const validationErrors = validateSubjectAndMessage(subject, message);
    if (validationErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Subject and message validation failed',
        errors: validationErrors
      });
    }

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

    const emailRecords = [];
    const emailPromises = users.map(async (user) => {
      const job = await queueHelpers.addCustomEmail(
        user.email,
        user.name || 'User',
        subject.trim(),
        message.trim(),
        { priority }
      );

      emailRecords.push(new Email({
        userId: user._id,
        userEmail: user.email,
        userName: user.name || 'User',
        subject: subject.trim(),
        message: message.trim(),
        type: 'bulk',
        priority,
        status: 'queued',
        jobId: job.id
      }));

      return job;
    });

    const jobs = await Promise.all(emailPromises);
    await Email.insertMany(emailRecords);

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
        estimatedDeliveryTime: `${Math.ceil(users.length / 10)} minutes`
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

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendToAllUsers,
};
