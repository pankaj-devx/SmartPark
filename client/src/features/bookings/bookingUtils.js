export function getMinutes(value) {
  if (!value) {
    return 0;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getBookingDurationHours(startTime, endTime) {
  const durationMinutes = getMinutes(endTime) - getMinutes(startTime);

  if (durationMinutes <= 0) {
    return 0;
  }

  return Math.ceil(durationMinutes / 60);
}

export function calculateEstimatedTotal({ endTime, hourlyPrice, slotCount, startTime }) {
  return getBookingDurationHours(startTime, endTime) * Number(hourlyPrice || 0) * Number(slotCount || 0);
}

export function validateBookingForm(form) {
  if (!form.bookingDate || !form.startTime || !form.endTime || !form.vehicleType || !form.slotCount) {
    return 'Complete all booking fields before reserving.';
  }

  if (form.endTime <= form.startTime) {
    return 'End time must be after start time.';
  }

  if (Number(form.slotCount) < 1) {
    return 'Slot count must be at least 1.';
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
