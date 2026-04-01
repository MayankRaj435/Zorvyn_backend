const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err.name === 'SyntaxError' && err.status === 400) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    errors = [];
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    message = 'A record with this value already exists';
    errors = [];
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Database constraint violation';
    errors = [];
  }

  if (env.nodeEnv === 'development' && statusCode === 500) {
    console.error('🔴 Error:', err);
  }

  if (statusCode === 500 && env.nodeEnv === 'production') {
    message = 'Internal server error';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.nodeEnv === 'development' && statusCode === 500 && { stack: err.stack }),
  });
}

module.exports = errorHandler;

