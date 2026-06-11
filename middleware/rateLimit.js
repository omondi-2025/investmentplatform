function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests. Try again later.' } = {}) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${req.path}`;
    const now = Date.now();
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ success: false, message });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
