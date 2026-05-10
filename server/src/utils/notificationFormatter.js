/**
 * notificationFormatter.js
 * ------------------------
 * Utility functions for formatting notification messages with improved UX.
 * Provides human-friendly, readable notification content with proper spacing,
 * emojis, and locale-aware date/time formatting.
 */

/**
 * Format a date string (YYYY-MM-DD) to human-friendly format.
 * Example: "2026-05-10" → "10 May 2026"
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date like "10 May 2026"
 */
function formatFriendlyDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr; // Fallback to original if parsing fails
  }
}

/**
 * Format a time string (HH:mm) to human-friendly 12-hour format.
 * Example: "17:03" → "5:03 PM"
 * 
 * @param {string} timeStr - Time in HH:mm format (24-hour)
 * @returns {string} - Formatted time like "5:03 PM"
 */
function formatFriendlyTime(timeStr) {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeStr; // Fallback to original if parsing fails
  }
}

/**
 * Format a time range with friendly formatting.
 * Example: "17:03" – "19:03" → "5:03 PM – 7:03 PM"
 * 
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {string} - Formatted time range
 */
function formatTimeRange(startTime, endTime) {
  return `${formatFriendlyTime(startTime)} – ${formatFriendlyTime(endTime)}`;
}

/**
 * Capitalize first letter of each word in a string.
 * Example: "station parking" → "Station Parking"
 * 
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeWords(str) {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format a booking created notification for the user (driver).
 * 
 * @param {object} booking - Booking object
 * @param {object} parking - Parking object
 * @returns {string} - Formatted notification message
 */
export function formatBookingCreatedNotification(booking, parking) {
  const friendlyDate = formatFriendlyDate(booking.bookingDate);
  const timeRange = formatTimeRange(booking.startTime, booking.endTime);
  const parkingName = capitalizeWords(parking.title);
  const location = capitalizeWords(`${parking.address}, ${parking.city}`);

  return `Your booking has been confirmed.

📍 Parking: ${parkingName}
📌 Location: ${location}
📅 Date: ${friendlyDate}
🕒 Time: ${timeRange}
🚗 Slots Booked: ${booking.slotCount}
💰 Amount Paid: ₹${booking.totalAmount}
🆔 Booking ID: ${booking.bookingCode}

Thank you for choosing SmartPark.`;
}

/**
 * Format a new booking notification for the owner.
 * 
 * @param {object} booking - Booking object
 * @param {object} parking - Parking object
 * @param {string} customerName - Customer name
 * @returns {string} - Formatted notification message
 */
export function formatOwnerNewBookingNotification(booking, parking, customerName) {
  const friendlyDate = formatFriendlyDate(booking.bookingDate);
  const timeRange = formatTimeRange(booking.startTime, booking.endTime);
  const parkingName = capitalizeWords(parking.title);

  return `You have received a new parking reservation.

👤 Customer: ${customerName}
📍 Parking: ${parkingName}
📅 Date: ${friendlyDate}
🕒 Time: ${timeRange}
🚗 Slots Reserved: ${booking.slotCount}
💰 Booking Amount: ₹${booking.totalAmount}
🆔 Booking ID: ${booking.bookingCode}`;
}

/**
 * Format a new booking notification for admins.
 * 
 * @param {object} booking - Booking object
 * @param {object} parking - Parking object
 * @param {string} customerName - Customer name
 * @param {string} ownerName - Owner name
 * @returns {string} - Formatted notification message
 */
export function formatAdminNewBookingNotification(booking, parking, customerName, ownerName) {
  const friendlyDate = formatFriendlyDate(booking.bookingDate);
  const timeRange = formatTimeRange(booking.startTime, booking.endTime);
  const parkingName = capitalizeWords(parking.title);
  const location = capitalizeWords(`${parking.address}, ${parking.city}`);

  return `A new booking was created on SmartPark.

👤 Customer: ${customerName}
🏢 Owner: ${ownerName}
📍 Parking: ${parkingName}
📌 Location: ${location}
📅 Date: ${friendlyDate}
🕒 Time: ${timeRange}
🚗 Slots: ${booking.slotCount}
💰 Amount: ₹${booking.totalAmount}
🆔 Booking ID: ${booking.bookingCode}`;
}

/**
 * Format a booking cancelled notification.
 * 
 * @param {object} booking - Booking object
 * @param {object} parking - Parking object
 * @param {string} cancelledBy - Who cancelled (User/Admin/Owner)
 * @returns {string} - Formatted notification message
 */
export function formatBookingCancelledNotification(booking, parking, cancelledBy) {
  const friendlyDate = formatFriendlyDate(booking.bookingDate);
  const timeRange = formatTimeRange(booking.startTime, booking.endTime);
  const parkingName = capitalizeWords(parking.title);
  const location = capitalizeWords(`${parking.address}, ${parking.city}`);

  return `A parking booking has been cancelled.

📍 Parking: ${parkingName}
📌 Location: ${location}
📅 Date: ${friendlyDate}
🕒 Time: ${timeRange}
🚗 Slots: ${booking.slotCount}
💰 Amount: ₹${booking.totalAmount}
👤 Cancelled By: ${cancelledBy}
🆔 Booking ID: ${booking.bookingCode}`;
}

/**
 * Format a booking completed notification.
 * 
 * @param {object} booking - Booking object
 * @param {object} parking - Parking object
 * @returns {string} - Formatted notification message
 */
export function formatBookingCompletedNotification(booking, parking) {
  const friendlyDate = formatFriendlyDate(booking.bookingDate);
  const timeRange = formatTimeRange(booking.startTime, booking.endTime);
  const parkingName = capitalizeWords(parking.title);

  return `Your parking session has been completed.

📍 Parking: ${parkingName}
📅 Date: ${friendlyDate}
🕒 Time: ${timeRange}
🚗 Slots Used: ${booking.slotCount}
💰 Amount: ₹${booking.totalAmount}

Thank you for using SmartPark.`;
}
