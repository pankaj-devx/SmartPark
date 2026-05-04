import { Router } from 'express';
import { getMe, googleAuth, login, register, updateMe, updateMyPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginSchema, registerSchema, updatePasswordSchema, updateProfileSchema } from '../validators/auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/register', requireDatabase, validateRequest(registerSchema), register);
authRoutes.post('/login', requireDatabase, validateRequest(loginSchema), login);
authRoutes.post('/google', requireDatabase, googleAuth);
authRoutes.get('/me', requireDatabase, authenticate, getMe);
authRoutes.patch('/me', requireDatabase, authenticate, validateRequest(updateProfileSchema), updateMe);
authRoutes.patch('/me/password', requireDatabase, authenticate, validateRequest(updatePasswordSchema), updateMyPassword);
