/**
 * Email validation utilities
 */

// Email format validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Priority levels
const PRIORITY_LEVELS = ['high', 'normal', 'low', 'bulk'];

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validate priority level
 * @param {string} priority - Priority to validate
 * @returns {boolean} - True if valid
 */
const isValidPriority = (priority) => {
  return PRIORITY_LEVELS.includes(priority);
};

/**
 * Validate subject and message for bulk operations
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {array} - Array of validation errors
 */
const validateSubjectAndMessage = (subject, message) => {
  const errors = [];
  
  // Required fields validation
  if (!subject) errors.push('Subject is required');
  if (!message) errors.push('Message is required');
  
  // Length validation
  if (subject && subject.length > 200) {
    errors.push('Subject cannot exceed 200 characters');
  }
  if (message && message.length > 10000) {
    errors.push('Message cannot exceed 10,000 characters');
  }
  
  return errors;
};

/**
 * Validate bulk email array
 * @param {array} emails - Array of email addresses
 * @param {number} maxBulkSize - Maximum allowed bulk size
 * @returns {object} - Validation result with errors and valid emails
 */
const validateBulkEmails = (emails, maxBulkSize = 100) => {
  const result = {
    isValid: true,
    errors: [],
    validEmails: []
  };
  
  // Basic array validation
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    result.isValid = false;
    result.errors.push('Emails array is required and cannot be empty');
    return result;
  }
  
  // Check bulk size limit
  if (emails.length > maxBulkSize) {
    result.isValid = false;
    result.errors.push(`Cannot send more than ${maxBulkSize} emails at once`);
    return result;
  }
  
  // Validate each email address
  const validationErrors = [];
  const validEmails = [];
  
  emails.forEach((email, index) => {
    if (!email || typeof email !== 'string') {
      validationErrors.push(`Email ${index + 1}: Email address is required and must be a string`);
      return;
    }
    
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      validationErrors.push(`Email ${index + 1}: Invalid email format (${trimmedEmail})`);
      return;
    }
    
    validEmails.push(trimmedEmail.toLowerCase());
  });
  
  if (validationErrors.length > 0) {
    result.isValid = false;
    result.errors = validationErrors;
    return result;
  }
  
  // Remove duplicate emails
  result.validEmails = [...new Set(validEmails)];
  return result;
};

/**
 * Validate client email data format
 * @param {object} emailPayload - Email payload from client { to, subject, message, priority? }
 * @returns {array} - Array of validation errors
 */
const validateClientEmailData = (emailPayload) => {
  const errors = [];
  
  // Required fields validation
  if (!emailPayload.to) errors.push('Email address (to) is required');
  if (!emailPayload.subject) errors.push('Subject is required');
  if (!emailPayload.message) errors.push('Message is required');
  
  // Email format validation
  if (emailPayload.to && !isValidEmail(emailPayload.to)) {
    errors.push('Invalid email format');
  }
  
  // Length validation
  if (emailPayload.subject && emailPayload.subject.length > 255) {
    errors.push('Subject must be less than 255 characters');
  }
  if (emailPayload.message && emailPayload.message.length > 10000) {
    errors.push('Message must be less than 10,000 characters');
  }
  
  // Priority validation
  if (emailPayload.priority && !isValidPriority(emailPayload.priority)) {
    errors.push(`Invalid priority. Supported: ${PRIORITY_LEVELS.join(', ')}`);
  }
  
  return errors;
};

/**
 * Sanitize email data
 * @param {object} data - Email data to sanitize (supports both client format and internal format)
 * @returns {object} - Sanitized data in internal format
 */
const sanitizeEmailData = (data) => {
  const sanitized = {};
  
  // Handle client format (to, subject, message) and internal format (email, customData)
  if (data.to) {
    sanitized.email = data.to.toLowerCase().trim();
  } else if (data.email) {
    sanitized.email = data.email.toLowerCase().trim();
  }
  
  if (data.userName) {
    sanitized.userName = data.userName.trim();
  }
  
  // Type is always 'custom' for client emails since all non-reset emails are custom
  sanitized.type = 'custom';
  
  if (data.priority && isValidPriority(data.priority)) {
    sanitized.priority = data.priority;
  } else {
    sanitized.priority = 'normal';
  }
  
  // Handle both client format and internal format
  if (data.subject && data.message) {
    // Client format: { to, subject, message }
    sanitized.customData = {
      subject: data.subject.trim(),
      message: data.message.trim()
    };
  } else if (data.customData) {
    // Internal format: { email, customData: { subject, message } }
    sanitized.customData = {
      subject: data.customData.subject?.trim(),
      message: data.customData.message?.trim()
    };
  }
  
  return sanitized;
};

module.exports = {
  validateClientEmailData,
  validateSubjectAndMessage,
  validateBulkEmails,
  sanitizeEmailData,
  isValidEmail,
  isValidPriority,
  PRIORITY_LEVELS
};