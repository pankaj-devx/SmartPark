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
