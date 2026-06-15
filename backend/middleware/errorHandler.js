/**
 * Central Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error stack to console
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
        // Try to construct a cleaner message for the user
        const detail = err.detail || '';
        const match = detail.match(/\((.*?)\)=\((.*?)\)/);
        if (match && match[1]) {
          message = `A record with this ${match[1]} already exists.`;
        } else {
          message = 'A duplicate record violation occurred.';
        }
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference. The related record does not exist or is currently in use.';
        break;
    }
  }

  const isDev = process.env.NODE_ENV === 'development';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack })
  });
};

export default errorHandler;
