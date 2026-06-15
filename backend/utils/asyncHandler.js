/**
 * Wraps async route handlers to automatically catch exceptions and forward them to the next middleware (errorHandler)
 * @param {Function} fn - The asynchronous handler function
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
