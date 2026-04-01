const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { getDatabase } = require('../config/database');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token has expired');
      }
      throw ApiError.unauthorized('Invalid token');
    }

    const db = getDatabase();
    const user = db.prepare(
      'SELECT id, name, email, role, status FROM users WHERE id = ?'
    ).get(decoded.id);

    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Account is deactivated. Contact an administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;

