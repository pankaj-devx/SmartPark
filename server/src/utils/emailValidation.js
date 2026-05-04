/**
 * Server-side email validation utilities
 * Provides comprehensive email validation with regex and domain checks
 */

// Comprehensive email regex that validates:
// - Username: alphanumeric, dots, hyphens, underscores, plus signs
// - @ symbol (required)
// - Domain: alphanumeric with hyphens, can have subdomains
// - TLD: 2-6 alphabetic characters
const EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Common trusted email domains
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'zoho.com',
  'aol.com',
  'mail.com',
  'yandex.com',
  'rediffmail.com'
];

/**
 * Validates email format with comprehensive checks
 * @param {string} email - Email address to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check basic format
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Split email into parts
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  const [username, domain] = parts;

  // Validate username part
  if (!username || username.length < 1 || username.length > 64) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Username cannot start or end with a dot
  if (username.startsWith('.') || username.endsWith('.')) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Username cannot have consecutive dots
  if (username.includes('..')) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Validate domain part
  if (!domain || domain.length < 3 || domain.length > 255) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Domain cannot start or end with dot or hyphen
  if (domain.startsWith('.') || domain.endsWith('.') || 
      domain.startsWith('-') || domain.endsWith('-')) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  // Domain cannot have consecutive dots
  if (domain.includes('..')) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Check domain structure (must have at least one dot)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Validate TLD (top-level domain)
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || tld.length > 6) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Check for valid characters in TLD (only letters)
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true, error: null };
}

/**
 * Check if email domain is in the common/trusted domains list
 * @param {string} email - Email address to check
 * @returns {boolean}
 */
export function isCommonEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  return COMMON_DOMAINS.includes(domain);
}

/**
 * Validate email and optionally require common domain
 * @param {string} email - Email address to validate
 * @param {object} options - { requireCommonDomain: boolean }
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateEmail(email, options = {}) {
  // First check format
  const formatValidation = validateEmailFormat(email);
  if (!formatValidation.valid) {
    return formatValidation;
  }

  // Optional: Check if domain is in common domains list
  if (options.requireCommonDomain && !isCommonEmailDomain(email)) {
    return {
      valid: false,
      error: 'Please use a common email provider (Gmail, Yahoo, Outlook, etc.)'
    };
  }

  return { valid: true, error: null };
}

/**
 * Middleware-friendly email validator
 * Throws error if email is invalid
 * @param {string} email - Email address to validate
 * @param {object} options - Validation options
 * @throws {Error} If email is invalid
 */
export function assertValidEmail(email, options = {}) {
  const result = validateEmail(email, options);
  if (!result.valid) {
    const error = new Error(result.error);
    error.statusCode = 400;
    throw error;
  }
}
