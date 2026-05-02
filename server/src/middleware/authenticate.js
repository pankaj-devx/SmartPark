import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createHttpError } from '../utils/createHttpError.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw createHttpError(401, 'Authentication token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      throw createHttpError(401, 'User account not found');
    }

    if (user.status === 'suspended') {
      throw createHttpError(403, 'Account suspended. Contact admin.');
    }

    if (user.status !== 'active') {
      throw createHttpError(401, 'User account is not active');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(401, 'Invalid or expired authentication token');
  }
});

