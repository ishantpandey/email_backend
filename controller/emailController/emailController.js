// Models
const User = require('../../config/model/user');
const Email = require('../../config/model/email');
const mongoose = require('mongoose');

// Utilities
const { getUserEmailHistory, getUserEmailStats } = require('../../utils/emailHistory');

// Services
const queueHelpers = require('../../service/emailService/queueHelpers');

// Constants
const { HTTP_STATUS, MESSAGES } = require('../../constants');

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

/**
 * Get complete email list for authenticated user
 * @route GET /api/email/list
 */
const getAllUserEmails = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    const emails = await Email.find({ userId })
      .sort('-createdAt')
      .lean();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email list retrieved successfully',
      data: {
        total: emails.length,
        emails
      }
    });

  } catch (error) {
    console.error('❌ Get all user emails error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve email list',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Delete one or many emails for authenticated user
 * @route DELETE /api/email/delete
 */
const deleteUserEmails = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const rawIds = Array.isArray(req.body?.emailIds) ? req.body.emailIds : [];
    const cleanedIds = rawIds
      .map(id => (id ?? '').toString().trim())
      .filter(id => id.length > 0);

    if (!cleanedIds.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Provide at least one email ID in emailIds array'
      });
    }

    const validIds = cleanedIds.filter(mongoose.Types.ObjectId.isValid);
    const invalidIds = cleanedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    if (!validIds.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No valid email IDs provided',
        data: { invalidIds }
      });
    }

    const deleteResult = await Email.deleteMany({ _id: { $in: validIds }, userId });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email records deleted successfully',
      data: {
        requested: validIds.length,
        deleted: deleteResult.deletedCount,
        invalidIds
      }
    });

  } catch (error) {
    console.error('❌ Delete user emails error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete email records',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Update starred status for one or many emails
 * @route PATCH /api/email/star
 */
const updateEmailStarStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const { emailId, starred } = req.body;

    if (typeof starred !== 'boolean') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'starred must be a boolean value'
      });
    }

    const normalizedId = (emailId ?? '').toString().trim();

    if (!normalizedId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Provide a valid emailId value'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Provided emailId is not valid'
      });
    }

    const updatedEmail = await Email.findOneAndUpdate(
      { _id: normalizedId, userId },
      { $set: { isStarred: starred } },
      { new: true }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email star status updated successfully',
      data: {
        emailId: updatedEmail._id,
        isStarred: updatedEmail.isStarred
      }
    });

  } catch (error) {
    console.error('❌ Update email star status error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update email star status',
      error: process.env.NODE_ENV === 'development' ? error.message : MESSAGES.SERVER.INTERNAL_ERROR
    });
  }
};

/**
 * Get email history for a user
 * @route GET /api/email/history/:userId
 */
const getUserEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, skip = 0, sortBy = '-createdAt' } = req.query;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    const emailHistory = await getUserEmailHistory(userId, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
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



module.exports = {
  getQueueStats,
  getAllUserEmails,
  deleteUserEmails,
  updateEmailStarStatus,
  getUserEmails,
};