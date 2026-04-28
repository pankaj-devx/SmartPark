const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  compactMode: false
};

const DEFAULT_DRIVER_PROFILE = {
  vehicleDetails: [{ label: '', registrationNumber: '', vehicleType: '4-wheeler', color: '' }],
  savedAddresses: [{ label: '', address: '' }],
  preferredParking: {
    vehicleType: '4-wheeler',
    maxHourlyPrice: 0,
    coveredOnly: false,
    evPreferred: false
  }
};

const DEFAULT_OWNER_PROFILE = {
  businessName: '',
  businessType: '',
  taxId: '',
  supportEmail: '',
  supportPhone: ''
};

const DEFAULT_ADMIN_PROFILE = {
  notificationChannel: 'email',
  notes: ''
};

export function getInitialProfileForm(user) {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    profilePhotoUrl: user?.profilePhotoUrl ?? '',
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...user?.preferences
    },
    driverProfile: {
      vehicleDetails: cloneRows(user?.driverProfile?.vehicleDetails?.length ? user.driverProfile.vehicleDetails : DEFAULT_DRIVER_PROFILE.vehicleDetails),
      savedAddresses: cloneRows(user?.driverProfile?.savedAddresses?.length ? user.driverProfile.savedAddresses : DEFAULT_DRIVER_PROFILE.savedAddresses),
      preferredParking: {
        ...DEFAULT_DRIVER_PROFILE.preferredParking,
        ...user?.driverProfile?.preferredParking
      }
    },
    ownerProfile: {
      ...DEFAULT_OWNER_PROFILE,
      ...user?.ownerProfile
    },
    adminProfile: {
      ...DEFAULT_ADMIN_PROFILE,
      ...user?.adminProfile
    }
  };
}

export function buildProfilePayload(form, role) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    profilePhotoUrl: form.profilePhotoUrl,
    preferences: form.preferences
  };

  if (role === 'driver') {
    payload.driverProfile = {
      vehicleDetails: sanitizeRows(form.driverProfile.vehicleDetails, ['label', 'registrationNumber', 'vehicleType', 'color']),
      savedAddresses: sanitizeRows(form.driverProfile.savedAddresses, ['label', 'address']),
      preferredParking: {
        vehicleType: form.driverProfile.preferredParking.vehicleType,
        maxHourlyPrice: Number(form.driverProfile.preferredParking.maxHourlyPrice) || 0,
        coveredOnly: Boolean(form.driverProfile.preferredParking.coveredOnly),
        evPreferred: Boolean(form.driverProfile.preferredParking.evPreferred)
      }
    };
  }

  if (role === 'owner') {
    payload.ownerProfile = trimObject(form.ownerProfile);
  }

  if (role === 'admin') {
    payload.adminProfile = trimObject(form.adminProfile);
  }

  return payload;
}

export function validateProfileImageFile(file) {
  if (!file) {
    return '';
  }

  if (!file.type.startsWith('image/')) {
    return 'Choose an image file for your profile photo';
  }

  if (file.size > 1_500_000) {
    return 'Profile photo must be 1.5 MB or smaller';
  }

  return '';
}

export function validateProfileForm(form) {
  if (!form.name.trim()) {
    return 'Enter your full name';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Enter a valid email address';
  }

  if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
    return 'Enter a valid phone number';
  }

  return '';
}

function sanitizeRows(rows, keys) {
  return rows
    .map((row) =>
      Object.fromEntries(
        keys.map((key) => [key, typeof row[key] === 'string' ? row[key].trim() : row[key]])
      )
    )
    .filter((row) => keys.some((key) => String(row[key] ?? '').trim() !== ''));
}

function trimObject(input) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}
