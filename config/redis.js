const Redis = require('ioredis');
require('dotenv').config();

// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD ,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  console.log('✅ Redis is ready to use');
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

module.exports = {
  redis,
};