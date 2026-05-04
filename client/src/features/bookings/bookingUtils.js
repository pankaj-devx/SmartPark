export function getMinutes(value) {
  if (!value) {
    return 0;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getBookingDurationHours(startTime, endTime) {
  // Neither time entered yet — nothing to compute
  if (!startTime || !endTime) return null;

  let durationMinutes = getMinutes(endTime) - getMinutes(startTime);

  // Cross-day booking: end time is on the next day
  if (durationMinutes <= 0) {
    durationMinutes += 24 * 60;
  }

  // Still zero after adjustment means same time — invalid
  if (durationMinutes === 0) return 0;

  return durationMinutes / 60; // exact hours (not ceiled) for display
}

/**
 * Format a fractional hour count into a human-readable duration string.
 * e.g. 1.5 → "1 hr 30 min"  |  25 → "1 day 1 hr"  |  0.5 → "30 min"
 */
export function formatDuration(hours) {
  if (!hours || hours <= 0) return '—';

  const totalMinutes = Math.round(hours * 60);
  const days    = Math.floor(totalMinutes / (24 * 60));
  const remMins = totalMinutes % (24 * 60);
  const hrs     = Math.floor(remMins / 60);
  const mins    = remMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hrs  > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min`);

  return parts.join(' ') || '—';
}

export function calculateEstimatedTotal({ endTime, hourlyPrice, pricing, slotCount, startTime, vehicleType }) {
  const hours = getBookingDurationHours(startTime, endTime);
  if (!hours || hours <= 0) return 0;

  // Use vehicle-specific rate when available, fall back to hourlyPrice
  const rate = (vehicleType && pricing?.[vehicleType]) ? pricing[vehicleType] : Number(hourlyPrice || 0);
  const billableHours = Math.ceil(hours); // bill in whole hours

  return billableHours * rate * Number(slotCount || 0);
}

export function validateBookingForm(form) {
  const slots = Number(form.slotCount);

  if (!form.bookingDate?.trim()) {
    return 'Please select a booking date.';
  }

  if (!form.startTime?.trim()) {
    return 'Please select a start time.';
  }

  if (!form.endTime?.trim()) {
    return 'Please select an end time.';
  }

  if (!form.vehicleType?.trim()) {
    return 'Please select a vehicle type.';
  }

  if (!Number.isFinite(slots) || slots < 1) {
    return 'Slot count must be at least 1.';
  }

  // Same time = zero duration — invalid
  if (form.startTime === form.endTime) {
    return 'End time must be different from start time.';
  }

  // Reject if the selected date + start time is not in the future.
  const bookingDateTime = new Date(`${form.bookingDate}T${form.startTime}:00`);
  if (bookingDateTime <= new Date()) {
    return 'Start time must be in the future.';
  }

  return '';
}

/**
 * Client-side mirror of the server's computeBookingStatus.
 * Uses the server-provided computedStatus when available (preferred),
 * and falls back to local time-based computation for resilience.
 */
export function getComputedStatus(booking) {
  // Trust the server value when present
  if (booking.computedStatus) return booking.computedStatus;

  // Cancelled/completed keep their stored status
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return booking.status;
  }

  try {
    const now   = new Date();
    const start = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    const end   = new Date(`${booking.bookingDate}T${booking.endTime}:00`);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  } catch {
    return booking.status;
  }
}

/**
 * Format a 24-hour "HH:MM" string to 12-hour AM/PM.
 * e.g. "13:30" → "1:30 PM"
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return timeStr;
  try {
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour   = Number(hourStr);
    const minute = Number(minuteStr);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

/**
 * Format a "YYYY-MM-DD" date string to a readable form.
 * e.g. "2026-05-02" → "May 2, 2026"
 */
export function formatBookingDate(dateStr) {
  if (!dateStr) return dateStr;
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Group bookings by their computed (time-aware) status.
 * Uses computedStatus from the server when available.
 */
export function groupBookingsByStatus(bookings) {
  return {
    upcoming:  bookings.filter((b) => getComputedStatus(b) === 'upcoming'),
    ongoing:   bookings.filter((b) => getComputedStatus(b) === 'ongoing'),
    completed: bookings.filter((b) => getComputedStatus(b) === 'completed'),
    cancelled: bookings.filter((b) => getComputedStatus(b) === 'cancelled')
  };
}
