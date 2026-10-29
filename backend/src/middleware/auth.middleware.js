const jwt = require('jsonwebtoken');

// Memastikan pengguna memiliki token JWT yang valid.
function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token is required',
    });
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token is required',
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is not configured');

    return res.status(500).json({
      status: 'error',
      message: 'Authentication service is not configured',
    });
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    if (
      !payload ||
      typeof payload !== 'object' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0 ||
      !['CUSTOMER', 'ADMIN'].includes(payload.role)
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token',
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (error) {
    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired authentication token',
      });
    }

    console.error('Authentication failed:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
}

// Membatasi akses ke role tertentu.
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication is required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this resource',
      });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};