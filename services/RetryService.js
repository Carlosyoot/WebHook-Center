const redis = require('./RedisService').redis;

const RETRY_PREFIX = 'retry:';
const MAX_ATTEMPTS = 6;
const TTL_SECONDS = 24 * 60 * 60; 

function getRetryKey(id) {
  return `${RETRY_PREFIX}${id}`;
}

async function registerRetry(id) {
  const key = getRetryKey(id);
  const exists = await redis.exists(key);

  if (!exists) {
    await redis.set(key, 1, { EX: TTL_SECONDS });
    return 1;
  }

  const attempts = await redis.incr(key);
  await redis.expire(key, TTL_SECONDS);
  return attempts;
}

async function getRetryCount(id) {
  const key = getRetryKey(id);
  const attempts = await redis.get(key);
  return parseInt(attempts || '0', 10);
}

function getBackoffDelay(attempt) {
  const base = Math.pow(2, attempt) * 1000; 
  const jitter = Math.floor(base * 0.1 * (Math.random() * 2 - 1)); 
  return base + jitter;
}

async function shouldRetry(id, maxAttempts = MAX_ATTEMPTS) {
  const count = await getRetryCount(id);
  return count < maxAttempts;
}

async function resetRetry(id) {
  await redis.del(getRetryKey(id));
}

module.exports = {
  registerRetry,
  getRetryCount,
  getBackoffDelay,
  shouldRetry,
  resetRetry
};
