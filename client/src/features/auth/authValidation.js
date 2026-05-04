/**
 * Shared client-side validation helpers for auth forms.
 * These run before any API call to give instant feedback.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns an error string if the email is invalid, otherwise ''.
 * @param {string} email
 * @returns {string}
 */
export function validateEmail(email) {
  if (!email?.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
  return '';
}

/**
 * Indian mobile number: starts with 6-9, exactly 10 digits.
 * Returns an error string if invalid, otherwise ''.
 * Phone is optional — only validated when a value is provided.
 *
 * @param {string} phone
 * @returns {string}
 */
export function validatePhone(phone) {
  if (!phone?.trim()) return ''; // optional field
  if (!/^[6-9]\d{9}$/.test(phone.trim())) {
    return 'Enter a valid 10-digit mobile number starting with 6–9.';
  }
  return '';
}
