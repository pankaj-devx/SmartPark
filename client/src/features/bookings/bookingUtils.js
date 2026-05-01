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

  const durationMinutes = getMinutes(endTime) - getMinutes(startTime);

  // Both times present but range is invalid
  if (durationMinutes <= 0) return 0;

  return Math.ceil(durationMinutes / 60);
}

export function calculateEstimatedTotal({ endTime, hourlyPrice, slotCount, startTime }) {
  const hours = getBookingDurationHours(startTime, endTime);
  // Return 0 for null (incomplete) or 0 (invalid range) — no negative totals
  if (!hours) return 0;
  return hours * Number(hourlyPrice || 0) * Number(slotCount || 0);
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

  // Compare as minutes so the check is numeric, not lexicographic
  if (getMinutes(form.endTime) <= getMinutes(form.startTime)) {
    return 'End time must be after start time.';
  }

  return '';
}

export function groupBookingsByStatus(bookings) {
  return {
    upcoming: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed'),
    cancelled: bookings.filter((booking) => booking.status === 'cancelled'),
    completed: bookings.filter((booking) => booking.status === 'completed')
  };
}
