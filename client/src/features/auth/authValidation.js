/**
 * Shared client-side validation helpers for auth forms.
 * These run before any API call to give instant feedback.
 */

// Comprehensive email regex that validates:
// - Username part (alphanumeric, dots, hyphens, underscores)
// - @ symbol
// - Domain name (alphanumeric, hyphens)
// - Valid TLD (2-6 characters)
const EMAIL_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Common trusted email domains (optional whitelist)
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'zoho.com',
  'aol.com',
  'mail.com',
  'yandex.com'
];

/**
 * Returns an error string if the email is invalid, otherwise ''.
 * Validates:
 * - Email format (username@domain.tld)
 * - Proper username (no leading/trailing dots or special chars)
 * - Valid domain structure
 * - Valid TLD (.com, .in, etc.)
 * 
 * @param {string} email
 * @param {object} options - { requireCommonDomain: boolean }
 * @returns {string}
 */
export function validateEmail(email, options = {}) {
  if (!email?.trim()) return 'Email is required.';
  
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format check
  if (!EMAIL_RE.test(trimmedEmail)) {
    return 'Invalid email format';
  }
  
  // Additional validation checks
  const [username, domain] = trimmedEmail.split('@');
  
  // Username validation
  if (!username || username.length < 1) {
    return 'Invalid email format';
  }
  
  if (username.startsWith('.') || username.endsWith('.')) {
    return 'Invalid email format';
  }
  
  if (username.includes('..')) {
    return 'Invalid email format';
  }
  
  // Domain validation
  if (!domain || domain.length < 3) {
    return 'Invalid email format';
  }
  
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
    return 'Invalid email format';
  }
  
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return 'Invalid email format';
  }
  
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return 'Invalid email format';
  }
  
  // Optional: Check if domain is in common domains list
  if (options.requireCommonDomain && !COMMON_DOMAINS.includes(domain)) {
    return `Please use a common email provider (${COMMON_DOMAINS.slice(0, 3).join(', ')}, etc.)`;
  }
  
  return '';
}

/**
 * Check if email domain is in the common domains list
 * @param {string} email
 * @returns {boolean}
 */
export function isCommonEmailDomain(email) {
  if (!email?.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return COMMON_DOMAINS.includes(domain);
}

/**
 * Indian mobile number: starts with 6-9, exactly 10 digits.
 * Accepts formats:
 * - 9876543210
 * - +919876543210
 * - +91 9876543210
 * - 98765 43210
 * 
 * Returns an error string if invalid, otherwise ''.
 * Phone is optional — only validated when a value is provided.
 *
 * @param {string} phone
 * @returns {string}
 */
export function validatePhone(phone) {
  if (!phone?.trim()) return ''; // optional field
  
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return 'Enter a valid Indian mobile number';
  }
  
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return 'Enter a valid Indian mobile number';
  }
  
  return '';
}

/**
 * Normalize phone number to standard 10-digit format
 * Removes +91, spaces, hyphens, and other formatting
 * 
 * @param {string} phone
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
