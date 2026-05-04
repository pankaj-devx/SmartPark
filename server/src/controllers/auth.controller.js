import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getSafeUser,
  googleAuthUser,
  loginUser,
  registerUser,
  updateCurrentUser,
  updateCurrentUserPassword
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

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateCurrentUser(req.user, req.body);

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

export const updateMyPassword = asyncHandler(async (req, res) => {
  const user = await updateCurrentUserPassword(req.user, req.body);

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const data = await googleAuthUser(req.body);

  res.status(200).json({
    success: true,
    data
  });
});
