import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts'
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
