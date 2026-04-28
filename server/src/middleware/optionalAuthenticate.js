import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch {
    // Public detail pages should still work when an optional token is missing or stale.
  }

  next();
});

