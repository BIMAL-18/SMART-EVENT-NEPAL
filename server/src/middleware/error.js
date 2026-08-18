export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Centralised error handler - never leaks stack traces or secrets to the client.
export function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on our end. Please try again.' : err.message;
  res.status(status).json({ message, ...(err.details ? { details: err.details } : {}) });
}

export function dbGuard(req, res, next) {
  // Attached per-route where DB access is essential; see routes for usage
  next();
}
