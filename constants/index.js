/**
 * Application constants
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Email Configuration
const EMAIL_CONFIG = {
  MAX_BULK_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 50,
  MAX_SUBJECT_LENGTH: 200,
  MAX_BODY_LENGTH: 10000,
  DEFAULT_PRIORITY: "normal",
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
};

// Queue Configuration
const QUEUE_CONFIG = {
  DEFAULT_ATTEMPTS: 5,
  RETRY_DELAY: 3000,
  COMPLETED_JOBS_LIMIT: 50,
  FAILED_JOBS_LIMIT: 20,
};

// Response Messages
const MESSAGES = {
  EMAIL: {
    SEND_SUCCESS: "Email queued successfully",
    BULK_SUCCESS: "emails queued successfully",
    SEND_FAILED: "Failed to queue email",
    BULK_FAILED: "Failed to queue bulk emails",
    VALIDATION_FAILED: "Validation failed",
    HEALTH_CHECK_SUCCESS: "Email service is healthy",
    HEALTH_CHECK_FAILED: "Email service health check failed",
  },
  QUEUE: {
    STATS_SUCCESS: "Queue statistics retrieved successfully",
    STATS_FAILED: "Failed to retrieve queue statistics",
    RETRY_SUCCESS: "failed jobs retried successfully",
    RETRY_FAILED: "Failed to retry failed jobs",
  },
  SERVER: {
    ROUTE_NOT_FOUND: "Route not found",
    INTERNAL_ERROR: "Internal server error",
  },
};

// Environment
const ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
};
module.exports = { HTTP_STATUS, EMAIL_CONFIG, QUEUE_CONFIG, MESSAGES, ENV };
