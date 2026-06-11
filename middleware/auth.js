const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tust-vanilla-dev-secret-change-me';
const JWT_EXPIRES_DEFAULT = '7d';
const JWT_EXPIRES_REMEMBER = '30d';
const JWT_EXPIRES_SESSION = '1d';

function signToken(userId, rememberMe = false) {
  const expiresIn = rememberMe ? JWT_EXPIRES_REMEMBER : JWT_EXPIRES_SESSION;
  return jwt.sign({ sub: String(userId), remember: !!rememberMe }, JWT_SECRET, { expiresIn });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

function requireSelfParam(paramName = 'id') {
  return (req, res, next) => {
    const targetId = req.params[paramName];
    if (targetId && String(targetId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    return next();
  };
}

module.exports = {
  JWT_SECRET,
  signToken,
  requireAuth,
  requireSelfParam
};
