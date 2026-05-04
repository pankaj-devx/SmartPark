/**
 * Production-grade secure code generation system
 * Generates unique, non-predictable codes for entities using crypto module
 */

import crypto from 'node:crypto';

// Character set excluding ambiguous characters (O, 0, I, 1, l)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Valid code prefixes for different entities
 */
export const CODE_PREFIXES = {
  USER: 'USER',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  BOOKING: 'BOOK',
  PARKING: 'PARK',
  PAYMENT: 'PAY',
  REVIEW: 'REV'
};

/**
 * Generate a cryptographically secure random code suffix
 * Uses crypto.randomBytes for strong randomness
 * 
 * @param {number} length - Length of the code suffix (default: 8)
 * @returns {string} - Random code suffix (e.g., "A9F3K2D1")
 */
function generateSecureSuffix(length = CODE_LENGTH) {
  // Generate enough random bytes (each byte gives us ~1.6 chars in base36)
  const bytesNeeded = Math.ceil(length * 1.5);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  
  let result = '';
  let byteIndex = 0;
  
  // Convert random bytes to safe characters
  while (result.length < length && byteIndex < randomBytes.length) {
    const byte = randomBytes[byteIndex];
    // Use modulo to map byte value to our safe character set
    result += SAFE_CHARS[byte % SAFE_CHARS.length];
    byteIndex++;
  }
  
  return result.substring(0, length);
}

/**
 * Generate a secure code with prefix
 * Format: PREFIX-XXXXXXXX
 * 
 * @param {string} prefix - Code prefix (e.g., 'USER', 'BOOK')
 * @returns {string} - Complete code (e.g., "USER-A9F3K2D1")
 */
export function generateSecureCode(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Code prefix is required and must be a string');
  }
  
  const upperPrefix = prefix.toUpperCase();
  const suffix = generateSecureSuffix(CODE_LENGTH);
  
  return `${upperPrefix}-${suffix}`;
}

/**
 * Generate a unique code with database uniqueness check
 * Retries up to MAX_RETRY_ATTEMPTS times if collision occurs
 * 
 * @param {string} prefix - Code prefix
 * @param {Function} checkUniqueness - Async function that returns true if code is unique
 * @returns {Promise<string>} - Unique code
 * @throws {Error} - If unable to generate unique code after max retries
 */
export async function generateUniqueCode(prefix, checkUniqueness) {
  if (typeof checkUniqueness !== 'function') {
    throw new Error('checkUniqueness must be a function');
  }
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const code = generateSecureCode(prefix);
    
    try {
      const isUnique = await checkUniqueness(code);
      
      if (isUnique) {
        return code;
      }
      
      // Log collision for monitoring (rare but possible)
      console.warn(`Code collision detected on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${code}`);
    } catch (error) {
      console.error(`Error checking code uniqueness on attempt ${attempt}:`, error);
      
      // On last attempt, throw the error
      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw error;
      }
    }
  }
  
  // Failed to generate unique code after all retries
  const error = new Error(`Failed to generate unique code with prefix ${prefix} after ${MAX_RETRY_ATTEMPTS} attempts`);
  error.statusCode = 500;
  throw error;
}

/**
 * Validate code format
 * Checks if code matches expected format: PREFIX-XXXXXXXX
 * 
 * @param {string} code - Code to validate
 * @param {string} expectedPrefix - Expected prefix (optional)
 * @returns {boolean} - True if valid format
 */
export function validateCodeFormat(code, expectedPrefix = null) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Check basic format: PREFIX-XXXXXXXX
  const parts = code.split('-');
  if (parts.length !== 2) {
    return false;
  }
  
  const [prefix, suffix] = parts;
  
  // Validate prefix (must be uppercase)
  if (!prefix || prefix.length < 2 || prefix.length > 10) {
    return false;
  }
  
  // Prefix must be uppercase
  if (prefix !== prefix.toUpperCase()) {
    return false;
  }
  
  // Check if prefix matches expected (if provided)
  if (expectedPrefix && prefix !== expectedPrefix.toUpperCase()) {
    return false;
  }
  
  // Validate suffix length
  if (suffix.length !== CODE_LENGTH) {
    return false;
  }
  
  // Validate suffix contains only safe characters
  for (const char of suffix) {
    if (!SAFE_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract prefix from code
 * 
 * @param {string} code - Code to extract prefix from
 * @returns {string|null} - Prefix or null if invalid
 */
export function extractPrefix(code) {
  if (!code || typeof code !== 'string') {
    return null;
  }
  
  const parts = code.split('-');
  return parts.length === 2 ? parts[0] : null;
}

/**
 * Generate code with timestamp encoding (optional enhancement)
 * Encodes creation timestamp in first 4 characters for sortability
 * 
 * @param {string} prefix - Code prefix
 * @returns {string} - Code with timestamp encoding
 */
export function generateTimestampCode(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Code prefix is required and must be a string');
  }
  
  const upperPrefix = prefix.toUpperCase();
  
  // Encode timestamp in base36 (4 chars = ~1.6M seconds = ~18 days resolution)
  const timestamp = Math.floor(Date.now() / 1000);
  const timestampEncoded = timestamp.toString(36).toUpperCase().slice(-4).padStart(4, '0');
  
  // Generate 4 random characters for uniqueness
  const randomSuffix = generateSecureSuffix(4);
  
  return `${upperPrefix}-${timestampEncoded}${randomSuffix}`;
}

/**
 * Generate code with checksum validation (advanced enhancement)
 * Adds a checksum character for validation
 * 
 * @param {string} prefix - Code prefix
 * @returns {string} - Code with checksum
 */
export function generateCodeWithChecksum(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Code prefix is required and must be a string');
  }
  
  const upperPrefix = prefix.toUpperCase();
  const suffix = generateSecureSuffix(CODE_LENGTH - 1); // 7 chars + 1 checksum
  
  // Calculate checksum using simple algorithm
  const checksum = calculateChecksum(upperPrefix + suffix);
  
  return `${upperPrefix}-${suffix}${checksum}`;
}

/**
 * Calculate checksum character for validation
 * 
 * @param {string} input - Input string to calculate checksum for
 * @returns {string} - Single checksum character
 */
function calculateChecksum(input) {
  let sum = 0;
  
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i) * (i + 1);
  }
  
  return SAFE_CHARS[sum % SAFE_CHARS.length];
}

/**
 * Validate code with checksum
 * 
 * @param {string} code - Code to validate
 * @returns {boolean} - True if checksum is valid
 */
export function validateChecksum(code) {
  if (!validateCodeFormat(code)) {
    return false;
  }
  
  const parts = code.split('-');
  const prefix = parts[0];
  const suffix = parts[1];
  
  if (suffix.length !== CODE_LENGTH) {
    return false;
  }
  
  const dataWithoutChecksum = prefix + suffix.slice(0, -1);
  const providedChecksum = suffix.slice(-1);
  const calculatedChecksum = calculateChecksum(dataWithoutChecksum);
  
  return providedChecksum === calculatedChecksum;
}

/**
 * Mask code for public display (security)
 * Shows only prefix and last 4 characters
 * 
 * @param {string} code - Code to mask
 * @returns {string} - Masked code (e.g., "USER-****K2D1")
 */
export function maskCode(code) {
  if (!validateCodeFormat(code)) {
    return '****-********';
  }
  
  const parts = code.split('-');
  const prefix = parts[0];
  const suffix = parts[1];
  
  const maskedSuffix = '****' + suffix.slice(-4);
  
  return `${prefix}-${maskedSuffix}`;
}
