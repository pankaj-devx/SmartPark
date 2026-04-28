import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { authDebug } from '../utils/authDebug.js';
import { signAuthToken } from '../utils/jwt.js';

export function getSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    status: user.status
  };
}

export async function registerUser(input) {
  authDebug('register service checking existing user', {
    email: input.email
  });

  const existingUser = await User.findOne({ email: input.email });

  if (existingUser) {
    authDebug('register service found duplicate email', {
      email: input.email
    });
    throw createHttpError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    phone: input.phone ?? ''
  });
  const token = signAuthToken(user);

  authDebug('register service created user', {
    userId: user._id.toString(),
    role: user.role
  });

  return {
    user: getSafeUser(user),
    token
  };
}

export async function loginUser(input) {
  authDebug('login service looking up user', {
    email: input.email
  });

  const user = await User.findOne({ email: input.email }).select('+passwordHash');

  if (!user) {
    authDebug('login service user not found', {
      email: input.email
    });
    throw createHttpError(401, 'Invalid email or password');
  }

  if (user.status !== 'active') {
    throw createHttpError(403, 'This account is suspended');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    authDebug('login service password mismatch', {
      userId: user._id.toString()
    });
    throw createHttpError(401, 'Invalid email or password');
  }

  const token = signAuthToken(user);

  authDebug('login service authenticated user', {
    userId: user._id.toString(),
    role: user.role
  });

  return {
    user: getSafeUser(user),
    token
  };
}
