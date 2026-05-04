import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/user.model.js';
import { createHttpError } from '../utils/createHttpError.js';
import { authDebug } from '../utils/authDebug.js';
import { signAuthToken } from '../utils/jwt.js';
import { env } from '../config/env.js';

export function getSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    status: user.status,
    profilePhotoUrl: user.profilePhotoUrl ?? '',
    preferences: {
      emailNotifications: user.preferences?.emailNotifications ?? true,
      smsNotifications: user.preferences?.smsNotifications ?? false,
      marketingEmails: user.preferences?.marketingEmails ?? false,
      compactMode: user.preferences?.compactMode ?? false
    },
    driverProfile: {
      vehicleDetails: user.driverProfile?.vehicleDetails ?? [],
      savedAddresses: user.driverProfile?.savedAddresses ?? [],
      preferredParking: {
        vehicleType: user.driverProfile?.preferredParking?.vehicleType ?? '4-wheeler',
        maxHourlyPrice: user.driverProfile?.preferredParking?.maxHourlyPrice ?? 0,
        coveredOnly: user.driverProfile?.preferredParking?.coveredOnly ?? false,
        evPreferred: user.driverProfile?.preferredParking?.evPreferred ?? false
      }
    },
    ownerProfile: {
      businessName: user.ownerProfile?.businessName ?? '',
      businessType: user.ownerProfile?.businessType ?? '',
      taxId: user.ownerProfile?.taxId ?? '',
      supportEmail: user.ownerProfile?.supportEmail ?? '',
      supportPhone: user.ownerProfile?.supportPhone ?? ''
    },
    adminProfile: {
      notificationChannel: user.adminProfile?.notificationChannel ?? 'email',
      notes: user.adminProfile?.notes ?? ''
    }
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

export async function updateCurrentUser(user, input, deps = {}) {
  const UserModel = deps.UserModel ?? User;
  const nextEmail = input.email.toLowerCase();

  if (nextEmail !== user.email) {
    const existingUser = await UserModel.findOne({ email: nextEmail });

    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw createHttpError(409, 'An account with this email already exists');
    }
  }

  user.name = input.name;
  user.email = nextEmail;
  user.phone = input.phone ?? '';
  user.profilePhotoUrl = input.profilePhotoUrl ?? '';
  user.preferences = {
    ...user.preferences,
    ...input.preferences
  };

  if (user.role === 'driver' && input.driverProfile) {
    user.driverProfile = input.driverProfile;
  }

  if (user.role === 'owner' && input.ownerProfile) {
    user.ownerProfile = input.ownerProfile;
  }

  if (user.role === 'admin' && input.adminProfile) {
    user.adminProfile = input.adminProfile;
  }

  await user.save();

  return getSafeUser(user);
}

export async function updateCurrentUserPassword(user, input, deps = {}) {
  const UserModel = deps.UserModel ?? User;
  const fullUser = await UserModel.findById(user._id).select('+passwordHash');

  if (!fullUser) {
    throw createHttpError(404, 'User not found');
  }

  const passwordMatches = await bcrypt.compare(input.currentPassword, fullUser.passwordHash);

  if (!passwordMatches) {
    throw createHttpError(401, 'Current password is incorrect');
  }

  fullUser.passwordHash = await bcrypt.hash(input.newPassword, 12);
  await fullUser.save();

  return getSafeUser(fullUser);
}

/**
 * Verify a Google ID token and sign in or create the user.
 *
 * Flow:
 *  1. Verify the credential with Google's OAuth2Client.
 *  2. Look up an existing user by googleId or email.
 *  3. If found by email but no googleId yet, link the Google account.
 *  4. If not found, create a new driver account (no password).
 *  5. Return the same { user, token } shape as loginUser / registerUser.
 *
 * @param {{ credential: string }} input
 * @param {object} deps - injectable for testing
 */
export async function googleAuthUser(input, deps = {}) {
  const UserModel = deps.UserModel ?? User;

  if (!env.GOOGLE_CLIENT_ID) {
    throw createHttpError(503, 'Google authentication is not configured');
  }

  if (!input?.credential) {
    throw createHttpError(400, 'Google credential is required');
  }

  // Verify the token with Google
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let payload;

  try {
    const ticket = await client.verifyIdToken({
      idToken: input.credential,
      audience: env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    throw createHttpError(401, 'Invalid Google credential');
  }

  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    throw createHttpError(400, 'Google account must have a verified email');
  }

  // Try to find by googleId first, then fall back to email
  let user = await UserModel.findOne({ googleId });

  if (!user) {
    user = await UserModel.findOne({ email: email.toLowerCase() });

    if (user) {
      // Link Google account to existing email-based account
      user.googleId = googleId;
      if (!user.profilePhotoUrl && picture) {
        user.profilePhotoUrl = picture;
      }
      await user.save();
    } else {
      // Create a new driver account — no password needed
      user = await UserModel.create({
        name: name ?? email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        role: 'driver',
        profilePhotoUrl: picture ?? '',
        phone: ''
      });
    }
  }

  if (user.status !== 'active') {
    throw createHttpError(403, 'This account is suspended');
  }

  const token = signAuthToken(user);

  authDebug('google auth service authenticated user', {
    userId: user._id.toString(),
    role: user.role
  });

  return {
    user: getSafeUser(user),
    token
  };
}
