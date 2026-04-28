const GUEST_SESSION_KEY = 'smartpark_guest_session_id';
const GUEST_BOOKING_DRAFT_KEY = 'smartpark_guest_booking_draft';

export function getGuestSessionId() {
  if (typeof sessionStorage === 'undefined') {
    return 'guest-session-unavailable';
  }

  try {
    const current = sessionStorage.getItem(GUEST_SESSION_KEY);

    if (current) {
      return current;
    }

    const next = createGuestSessionId();
    sessionStorage.setItem(GUEST_SESSION_KEY, next);
    return next;
  } catch {
    return 'guest-session-unavailable';
  }
}

export function getGuestBookingIntent(parkingId) {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(scopedGuestDraftKey());
    const draft = raw ? JSON.parse(raw) : null;

    if (!draft) {
      return null;
    }

    if (parkingId && draft.parkingId !== parkingId) {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function saveGuestBookingIntent(intent) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(
      scopedGuestDraftKey(),
      JSON.stringify({
        ...intent,
        createdAt: new Date().toISOString()
      })
    );
  } catch {
    // Ignore storage failures and keep the in-memory flow working.
  }
}

export function clearGuestBookingIntent(parkingId) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (!parkingId) {
      sessionStorage.removeItem(scopedGuestDraftKey());
      return;
    }

    const current = getGuestBookingIntent(parkingId);

    if (current?.parkingId === parkingId) {
      sessionStorage.removeItem(scopedGuestDraftKey());
    }
  } catch {
    // Ignore cleanup failures.
  }
}

function scopedGuestDraftKey() {
  return `${GUEST_BOOKING_DRAFT_KEY}_${getGuestSessionId()}`;
}

function createGuestSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
