import { getExperienceScope, getScopedStorageKey } from './experienceScope.js';

const STORAGE_KEYS = {
  savedParkings: 'smartpark_saved_parkings',
  recentlyViewed: 'smartpark_recently_viewed',
  recentSearches: 'smartpark_recent_searches',
  recentActivity: 'smartpark_recent_activity',
  dashboardSections: 'smartpark_dashboard_sections'
};

export function getSavedParkings() {
  return readList(STORAGE_KEYS.savedParkings);
}

export function isSavedParking(id) {
  return getSavedParkings().some((parking) => parking.id === id);
}

export function toggleSavedParking(parking) {
  const current = getSavedParkings();
  const exists = current.some((item) => item.id === parking.id);
  const next = exists ? current.filter((item) => item.id !== parking.id) : limitList([serializeParkingCard(parking), ...current], 8);
  writeList(STORAGE_KEYS.savedParkings, next);
  writeActivity({
    type: exists ? 'favorite_removed' : 'favorite_added',
    title: exists ? 'Removed saved parking' : 'Saved parking',
    detail: parking.title
  });
  return next;
}

export function getRecentlyViewedParkings() {
  return readList(STORAGE_KEYS.recentlyViewed);
}

export function recordRecentlyViewedParking(parking) {
  const next = dedupeById([serializeParkingCard(parking), ...getRecentlyViewedParkings()]);
  writeList(STORAGE_KEYS.recentlyViewed, limitList(next, 8));
  writeActivity({
    type: 'viewed_parking',
    title: 'Viewed parking',
    detail: parking.title
  });
}

export function getRecentSearches() {
  return readList(STORAGE_KEYS.recentSearches);
}

export function recordRecentSearch(search) {
  if (!search?.label) {
    return;
  }

  const next = dedupeByLabel([{ ...search, createdAt: new Date().toISOString() }, ...getRecentSearches()]);
  writeList(STORAGE_KEYS.recentSearches, limitList(next, 6));
  writeActivity({
    type: 'recent_search',
    title: 'Searched for parking',
    detail: search.label
  });
}

export function getRecentActivity() {
  return readList(STORAGE_KEYS.recentActivity);
}

export function getDashboardSection(role, fallback) {
  const sections = readObject(STORAGE_KEYS.dashboardSections);
  return sections[role] ?? fallback;
}

export function setDashboardSection(role, section) {
  const current = readObject(STORAGE_KEYS.dashboardSections);
  writeObject(STORAGE_KEYS.dashboardSections, {
    ...current,
    [role]: section
  });
}

export function getProfileCompletionScore(user) {
  const checks = [
    Boolean(user?.name),
    Boolean(user?.email),
    Boolean(user?.phone),
    Boolean(user?.profilePhotoUrl),
    user?.role !== 'driver' || Boolean(user?.driverProfile?.vehicleDetails?.length),
    user?.role !== 'driver' || Boolean(user?.driverProfile?.savedAddresses?.length),
    user?.role !== 'owner' || Boolean(user?.ownerProfile?.businessName),
    user?.role !== 'admin' || Boolean(user?.adminProfile?.notes)
  ];
  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

export function getReminderPlaceholders(bookings = []) {
  return bookings
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
    .slice(0, 2)
    .map((booking) => ({
      id: booking.id,
      title: `Reminder for ${booking.bookingDate}`,
      detail: `${booking.startTime}-${booking.endTime} booking window is coming up soon`
    }));
}

export function buildQuickRebookLink(booking) {
  const params = new URLSearchParams({
    date: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime
  });

  return `/parkings/${booking.parking}?${params.toString()}`;
}

function serializeParkingCard(parking) {
  return {
    id: parking.id,
    title: parking.title,
    city: parking.city ?? '',
    state: parking.state ?? '',
    area: parking.area ?? '',
    hourlyPrice: parking.hourlyPrice ?? 0,
    coverImage: parking.coverImage ?? null,
    availableSlots: parking.availableSlots ?? 0,
    parkingType: parking.parkingType ?? 'lot'
  };
}

function writeActivity(entry) {
  const next = limitList(
    [
      {
        ...entry,
        createdAt: new Date().toISOString()
      },
      ...getRecentActivity()
    ],
    12
  );
  writeList(STORAGE_KEYS.recentActivity, next);
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function dedupeByLabel(items) {
  const seen = new Set();
  return items.filter((item) => {
    const label = item.label.toLowerCase();

    if (seen.has(label)) {
      return false;
    }

    seen.add(label);
    return true;
  });
}

function limitList(items, limit) {
  return items.slice(0, limit);
}

function readList(key) {
  const scope = getExperienceScope();
  const storage = scope.storage;

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(getScopedStorageKey(key, scope));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(key, value) {
  const scope = getExperienceScope();
  const storage = scope.storage;

  if (!storage) {
    return;
  }

  storage.setItem(getScopedStorageKey(key, scope), JSON.stringify(value));
}

function readObject(key) {
  const scope = getExperienceScope();
  const storage = scope.storage;

  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(getScopedStorageKey(key, scope));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeObject(key, value) {
  const scope = getExperienceScope();
  const storage = scope.storage;

  if (!storage) {
    return;
  }

  storage.setItem(getScopedStorageKey(key, scope), JSON.stringify(value));
}
