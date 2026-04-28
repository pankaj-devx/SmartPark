import mongoose from 'mongoose';
import { createHttpError } from '../utils/createHttpError.js';

export function requireDatabase(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) {
    next(createHttpError(503, 'Database connection is not ready'));
    return;
  }

  next();
}

