import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/register', requireDatabase, validateRequest(registerSchema), register);
authRoutes.post('/login', requireDatabase, validateRequest(loginSchema), login);
authRoutes.get('/me', requireDatabase, authenticate, getMe);
