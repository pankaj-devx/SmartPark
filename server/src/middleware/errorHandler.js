import { env } from '../config/env.js';

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    errors: error.errors ?? []
  });
}
