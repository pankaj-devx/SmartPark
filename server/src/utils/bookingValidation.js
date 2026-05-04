/**
 * Production-grade booking validation utilities
 * Prevents double booking, overlapping bookings, and race conditions
 */

/**
 * Validate booking time constraints
 * 
 * @param {string} bookingDate - "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateBookingTime(bookingDate, startTime, endTime) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Validate time format
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { valid: false, error: 'Invalid start time format' };
  }
  
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    return { valid: false, error: 'Invalid end time format' };
  }
  
  // Parse times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // End time must be after start time
  if (endMinutes <= startMinutes) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  // Minimum booking duration (e.g., 30 minutes)
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes < 30) {
    return { valid: false, error: 'Minimum booking duration is 30 minutes' };
  }
  
  // Maximum booking duration (e.g., 24 hours)
  if (durationMinutes > 24 * 60) {
    return { valid: false, error: 'Maximum booking duration is 24 hours' };
  }
  
  // Check if booking is at least 30 minutes in the future
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const bookingDateTime = new Date(`${bookingDate}T${startTime}:00`);
  
  if (bookingDateTime <= now) {
    return { valid: false, error: 'Selected time is invalid (minimum 30 minutes required)' };
  }
  
  // Check if booking is not too far in the future (e.g., 90 days)
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 90);
  
  if (bookingDateTime > maxFutureDate) {
    return { valid: false, error: 'Bookings can only be made up to 90 days in advance' };
  }
  
  return { valid: true, error: null };
}

/**
 * Check if two time ranges overlap
 * Overlap condition: (startTime1 < endTime2) AND (endTime1 > startTime2)
 * 
 * @param {string} start1 - "HH:mm"
 * @param {string} end1 - "HH:mm"
 * @param {string} start2 - "HH:mm"
 * @param {string} end2 - "HH:mm"
 * @returns {boolean}
 */
export function doTimesOverlap(start1, end1, start2, end2) {
  const [start1Hour, start1Min] = start1.split(':').map(Number);
  const [end1Hour, end1Min] = end1.split(':').map(Number);
  const [start2Hour, start2Min] = start2.split(':').map(Number);
  const [end2Hour, end2Min] = end2.split(':').map(Number);
  
  const start1Minutes = start1Hour * 60 + start1Min;
  const end1Minutes = end1Hour * 60 + end1Min;
  const start2Minutes = start2Hour * 60 + start2Min;
  const end2Minutes = end2Hour * 60 + end2Min;
  
  // Overlap condition: (start1 < end2) AND (end1 > start2)
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
}

/**
 * Build optimized query filter for finding overlapping bookings
 * Uses indexed fields for performance
 * 
 * @param {object} input - Booking input
 * @param {string[]} activeStatuses - Active booking statuses
 * @returns {object} - MongoDB query filter
 */
export function buildOverlapQuery(input, activeStatuses = ['pending', 'confirmed']) {
  return {
    parking: input.parking,
    bookingDate: input.bookingDate,
    status: { $in: activeStatuses },
    // Overlap condition: (startTime < input.endTime) AND (endTime > input.startTime)
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime }
  };
}

/**
 * Validate slot availability
 * 
 * @param {number} requestedSlots - Number of slots requested
 * @param {number} totalSlots - Total parking slots
 * @param {number} occupiedSlots - Currently occupied slots
 * @returns {{ valid: boolean, error: string | null, availableSlots: number }}
 */
export function validateSlotAvailability(requestedSlots, totalSlots, occupiedSlots) {
  const availableSlots = totalSlots - occupiedSlots;
  
  if (requestedSlots < 1) {
    return {
      valid: false,
      error: 'At least one slot must be requested',
      availableSlots
    };
  }
  
  if (requestedSlots > availableSlots) {
    return {
      valid: false,
      error: availableSlots === 0 
        ? 'No slots available for selected time'
        : `Only ${availableSlots} slot(s) available for selected time`,
      availableSlots
    };
  }
  
  return {
    valid: true,
    error: null,
    availableSlots
  };
}

/**
 * Calculate booking duration in minutes
 * 
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @returns {number} - Duration in minutes
 */
export function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
}

/**
 * Check if booking date is valid
 * 
 * @param {string} bookingDate - "YYYY-MM-DD"
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateBookingDate(bookingDate) {
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  const date = new Date(bookingDate);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }
  
  // Check if date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, error: 'Cannot book for past dates' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate complete booking input
 * 
 * @param {object} input - Booking input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingInput(input) {
  const errors = [];
  
  // Validate required fields
  if (!input.parking) {
    errors.push('Parking ID is required');
  }
  
  if (!input.vehicleType) {
    errors.push('Vehicle type is required');
  }
  
  if (!input.bookingDate) {
    errors.push('Booking date is required');
  }
  
  if (!input.startTime) {
    errors.push('Start time is required');
  }
  
  if (!input.endTime) {
    errors.push('End time is required');
  }
  
  if (!input.slotCount || input.slotCount < 1) {
    errors.push('At least one slot must be requested');
  }
  
  // If basic validation fails, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Validate date
  const dateValidation = validateBookingDate(input.bookingDate);
  if (!dateValidation.valid) {
    errors.push(dateValidation.error);
  }
  
  // Validate time
  const timeValidation = validateBookingTime(
    input.bookingDate,
    input.startTime,
    input.endTime
  );
  if (!timeValidation.valid) {
    errors.push(timeValidation.error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format validation errors for API response
 * 
 * @param {string[]} errors - Array of error messages
 * @returns {string} - Formatted error message
 */
export function formatValidationErrors(errors) {
  if (errors.length === 0) {
    return 'Validation failed';
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `Multiple validation errors: ${errors.join('; ')}`;
}
