/**
 * Central Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Always log error server-side
  console.error(err.stack || err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error names/classes
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.message || 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  }

  // Handle PostgreSQL specific constraint violations
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        {
          const detail = err.detail || '';
          const match = detail.match(/\((.*?)\)=\((.*?)\)/);
          if (match && match[1]) {
            message = `A record with this ${match[1]} already exists.`;
          } else {
            message = 'A duplicate record violation occurred.';
          }
        }
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference. The related record does not exist or is currently in use.';
        break;
    }
  }

  // In production, sanitize 500+ errors unless operational
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && statusCode >= 500 && !err.isOperational) {
    message = 'Internal server error. Please try again later.';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(!isProd && { stack: err.stack })
  });
};

export default errorHandler;
