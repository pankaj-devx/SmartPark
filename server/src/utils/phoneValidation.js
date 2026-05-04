/**
 * Server-side phone number validation for Indian mobile numbers
 * Handles normalization, validation, and formatting
 */

// Indian mobile number regex: starts with 6-9, exactly 10 digits
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalize phone number to standard 10-digit format
 * Removes +91, spaces, hyphens, and other formatting
 * 
 * @param {string} phone - Phone number in any format
 * @returns {string|null} - Normalized 10-digit number or null if invalid
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all spaces, hyphens, parentheses, and other non-digit characters except +
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Remove +91 country code if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Handle case where user enters 91XXXXXXXXXX without +
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Handle case where user enters 0XXXXXXXXXX (old format)
    cleaned = cleaned.substring(1);
  }
  
  // Remove any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Should be exactly 10 digits
  if (cleaned.length !== 10) {
    return null;
  }
  
  return cleaned;
}

/**
 * Validate Indian mobile number format
 * 
 * @param {string} phone - Phone number to validate
 * @returns {{ valid: boolean, error: string | null, normalized: string | null }}
 */
export function validatePhoneNumber(phone) {
  // Empty phone is valid (optional field)
  if (!phone || phone.trim() === '') {
    return { valid: true, error: null, normalized: '' };
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return {
      valid: false,
      error: 'Enter a valid Indian mobile number',
      normalized: null
    };
  }
  
  // Validate format: must start with 6-9 and be exactly 10 digits
  if (!INDIAN_MOBILE_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Enter a valid Indian mobile number',
      normalized: null
    };
  }
  
  return {
    valid: true,
    error: null,
    normalized
  };
}

/**
 * Format phone number for display
 * Converts 9876543210 to +91 98765 43210
 * 
 * @param {string} phone - 10-digit phone number
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized || normalized.length !== 10) {
    return phone; // Return original if can't normalize
  }
  
  // Format as +91 XXXXX XXXXX
  return `+91 ${normalized.substring(0, 5)} ${normalized.substring(5)}`;
}

/**
 * Validate and normalize phone number (throws on error)
 * Use this in services where you want to throw errors
 * 
 * @param {string} phone - Phone number to validate
 * @returns {string} - Normalized phone number
 * @throws {Error} - If phone number is invalid
 */
export function assertValidPhone(phone) {
  const result = validatePhoneNumber(phone);
  
  if (!result.valid) {
    const error = new Error(result.error);
    error.statusCode = 400;
    throw error;
  }
  
  return result.normalized;
}

/**
 * Check if phone number is valid (boolean check)
 * 
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
export function isValidPhoneNumber(phone) {
  const result = validatePhoneNumber(phone);
  return result.valid;
}
