const mongoose = require('mongoose');
const Email = require('../model/email');

/**
 * Get email history for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options (limit, skip, sortBy)
 * @returns {object} - Email history with pagination info
 */
const getUserEmailHistory = async (userId, options = {}) => {
  const {
    limit = 20,
    skip = 0,
    sortBy = '-createdAt'
  } = options;

  const emails = await Email.find({ userId })
    .sort(sortBy)
    .limit(limit)
    .skip(skip)
    .lean();

  const totalCount = await Email.countDocuments({ userId });

  return {
    emails,
    pagination: {
      total: totalCount,
      limit,
      skip,
      hasMore: skip + emails.length < totalCount
    }
  };
};

/**
 * Get email statistics for a user
 * @param {string} userId - User ID
 * @returns {object} - Email statistics
 */
const getUserEmailStats = async (userId) => {
  const stats = await Email.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    queued: 0,
    sent: 0,
    failed: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

/**
 * Update email status
 * @param {string} jobId - Job ID from queue
 * @param {string} status - New status (sent, failed)
 * @param {string} errorMessage - Error message if failed
 * @returns {object} - Updated email record
 */
const updateEmailStatus = async (jobId, status, errorMessage = null) => {
  const updateData = { 
    status,
    ...(status === 'sent' && { sentAt: new Date() }),
    ...(status === 'failed' && { failedAt: new Date(), errorMessage })
  };

  return await Email.findOneAndUpdate(
    { jobId },
    updateData,
    { new: true }
  );
};

module.exports = {
  getUserEmailHistory,
  getUserEmailStats,
  updateEmailStatus
};