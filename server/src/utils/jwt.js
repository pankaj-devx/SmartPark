import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAuthToken(user) {
  return jwt.sign(
    {
      role: user.role
    },
    env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
}

