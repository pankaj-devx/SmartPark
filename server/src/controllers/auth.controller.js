import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getSafeUser,
  loginUser,
  registerUser
} from '../services/auth.service.js';
import { authDebug } from '../utils/authDebug.js';

export const register = asyncHandler(async (req, res) => {
  authDebug('register controller received request', {
    email: req.body.email,
    role: req.body.role
  });

  const data = await registerUser(req.body);

  authDebug('register controller sending success response', {
    userId: data.user.id,
    role: data.user.role
  });

  res.status(201).json({
    success: true,
    data
  });
});

export const login = asyncHandler(async (req, res) => {
  authDebug('login controller received request', {
    email: req.body.email
  });

  const data = await loginUser(req.body);

  authDebug('login controller sending success response', {
    userId: data.user.id,
    role: data.user.role
  });

  res.status(200).json({
    success: true,
    data
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: getSafeUser(req.user)
    }
  });
});
