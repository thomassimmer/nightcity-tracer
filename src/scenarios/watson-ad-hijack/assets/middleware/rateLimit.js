const attempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip) {
  const record = attempts.get(ip) || {};

  if (record.whitelisted) {
    return { allowed: true };
  }

  const now = Date.now();
  if (!record.count || now - record.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  record.count++;
  return { allowed: true };
}

module.exports = { checkRateLimit };
