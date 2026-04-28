import { getGuestSessionId } from './guestSession.js';

const AUTH_STORAGE_KEY = 'smartpark_auth';

export function getExperienceScope() {
  const authUserId = readAuthenticatedUserId();

  if (authUserId) {
    return {
      kind: 'user',
      id: authUserId,
      storage: getSafeStorage('localStorage')
    };
  }

  return {
    kind: 'guest',
    id: getGuestSessionId(),
    storage: getSafeStorage('sessionStorage')
  };
}

export function getScopedStorageKey(baseKey, scope = getExperienceScope()) {
  return `${baseKey}_${scope.kind}_${scope.id}`;
}

function readAuthenticatedUserId() {
  const storage = getSafeStorage('localStorage');

  if (!storage) {
    return '';
  }

  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    const auth = raw ? JSON.parse(raw) : null;
    return auth?.user?.id ?? auth?.user?._id ?? '';
  } catch {
    return '';
  }
}

function getSafeStorage(name) {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  return globalThis[name] ?? null;
}
