import { formatPhoneNumber } from '../auth/authValidation.js';

/**
 * Component to display phone numbers in formatted style
 * Converts 9876543210 to +91 98765 43210
 */
export function PhoneDisplay({ phone, className = '' }) {
  if (!phone) {
    return <span className={className}>—</span>;
  }
  
  const formatted = formatPhoneNumber(phone);
  
  return (
    <span className={className}>
      {formatted}
    </span>
  );
}

/**
 * Hook to format phone number
 */
export function useFormattedPhone(phone) {
  if (!phone) return '';
  return formatPhoneNumber(phone);
}
