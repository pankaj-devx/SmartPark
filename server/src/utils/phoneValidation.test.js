import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizePhoneNumber,
  validatePhoneNumber,
  formatPhoneNumber,
  isValidPhoneNumber,
  assertValidPhone
} from './phoneValidation.js';

describe('Phone Validation', () => {
  describe('normalizePhoneNumber', () => {
    it('should normalize 10-digit numbers', () => {
      assert.strictEqual(normalizePhoneNumber('9876543210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('8765432109'), '8765432109');
      assert.strictEqual(normalizePhoneNumber('7654321098'), '7654321098');
      assert.strictEqual(normalizePhoneNumber('6543210987'), '6543210987');
    });

    it('should remove +91 prefix', () => {
      assert.strictEqual(normalizePhoneNumber('+919876543210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91 9876543210'), '9876543210');
    });

    it('should remove 91 prefix without +', () => {
      assert.strictEqual(normalizePhoneNumber('919876543210'), '9876543210');
    });

    it('should remove spaces', () => {
      assert.strictEqual(normalizePhoneNumber('98765 43210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('987 654 3210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91 98765 43210'), '9876543210');
    });

    it('should remove hyphens', () => {
      assert.strictEqual(normalizePhoneNumber('98765-43210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('987-654-3210'), '9876543210');
    });

    it('should remove parentheses', () => {
      assert.strictEqual(normalizePhoneNumber('(987) 654-3210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91 (98765) 43210'), '9876543210');
    });

    it('should handle leading zero (old format)', () => {
      assert.strictEqual(normalizePhoneNumber('09876543210'), '9876543210');
    });

    it('should return null for invalid inputs', () => {
      assert.strictEqual(normalizePhoneNumber(''), null);
      assert.strictEqual(normalizePhoneNumber('123'), null);
      assert.strictEqual(normalizePhoneNumber('12345678901'), null); // 11 digits
      assert.strictEqual(normalizePhoneNumber('abcdefghij'), null);
      assert.strictEqual(normalizePhoneNumber(null), null);
      assert.strictEqual(normalizePhoneNumber(undefined), null);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct Indian mobile numbers', () => {
      const validNumbers = [
        '9876543210',
        '8765432109',
        '7654321098',
        '6543210987',
        '+919876543210',
        '+91 9876543210',
        '98765 43210',
        '987-654-3210'
      ];

      validNumbers.forEach((phone) => {
        const result = validatePhoneNumber(phone);
        assert.strictEqual(result.valid, true, `${phone} should be valid`);
        assert.strictEqual(result.error, null);
        assert.ok(result.normalized);
        assert.match(result.normalized, /^[6-9]\d{9}$/);
      });
    });

    it('should reject numbers not starting with 6-9', () => {
      const invalidNumbers = [
        '5876543210', // starts with 5
        '4876543210', // starts with 4
        '1234567890', // starts with 1
        '0987654321'  // starts with 0
      ];

      invalidNumbers.forEach((phone) => {
        const result = validatePhoneNumber(phone);
        assert.strictEqual(result.valid, false, `${phone} should be invalid`);
        assert.strictEqual(result.error, 'Enter a valid Indian mobile number');
      });
    });

    it('should reject numbers with wrong length', () => {
      const invalidNumbers = [
        '987654321',    // 9 digits
        '98765432',     // 8 digits
        '98765432109',  // 11 digits
        '123'           // 3 digits
      ];

      invalidNumbers.forEach((phone) => {
        const result = validatePhoneNumber(phone);
        assert.strictEqual(result.valid, false, `${phone} should be invalid`);
      });
    });

    it('should accept empty phone (optional field)', () => {
      const result1 = validatePhoneNumber('');
      assert.strictEqual(result1.valid, true);
      assert.strictEqual(result1.normalized, '');

      const result2 = validatePhoneNumber('   ');
      assert.strictEqual(result2.valid, true);
      assert.strictEqual(result2.normalized, '');
    });

    it('should reject non-numeric input', () => {
      const invalidNumbers = [
        'abcdefghij',
        'phone number',
        '98765abcde'
      ];

      invalidNumbers.forEach((phone) => {
        const result = validatePhoneNumber(phone);
        assert.strictEqual(result.valid, false, `${phone} should be invalid`);
      });
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit numbers', () => {
      assert.strictEqual(formatPhoneNumber('9876543210'), '+91 98765 43210');
      assert.strictEqual(formatPhoneNumber('8765432109'), '+91 87654 32109');
      assert.strictEqual(formatPhoneNumber('7654321098'), '+91 76543 21098');
    });

    it('should format numbers with +91 prefix', () => {
      assert.strictEqual(formatPhoneNumber('+919876543210'), '+91 98765 43210');
      assert.strictEqual(formatPhoneNumber('+91 9876543210'), '+91 98765 43210');
    });

    it('should format numbers with spaces', () => {
      assert.strictEqual(formatPhoneNumber('98765 43210'), '+91 98765 43210');
    });

    it('should return original for invalid numbers', () => {
      assert.strictEqual(formatPhoneNumber('123'), '123');
      assert.strictEqual(formatPhoneNumber('invalid'), 'invalid');
    });

    it('should return empty string for null/undefined', () => {
      assert.strictEqual(formatPhoneNumber(null), '');
      assert.strictEqual(formatPhoneNumber(undefined), '');
      assert.strictEqual(formatPhoneNumber(''), '');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid numbers', () => {
      assert.strictEqual(isValidPhoneNumber('9876543210'), true);
      assert.strictEqual(isValidPhoneNumber('+919876543210'), true);
      assert.strictEqual(isValidPhoneNumber('98765 43210'), true);
    });

    it('should return false for invalid numbers', () => {
      assert.strictEqual(isValidPhoneNumber('123'), false);
      assert.strictEqual(isValidPhoneNumber('5876543210'), false);
      assert.strictEqual(isValidPhoneNumber('abcdefghij'), false);
    });

    it('should return true for empty (optional)', () => {
      assert.strictEqual(isValidPhoneNumber(''), true);
      assert.strictEqual(isValidPhoneNumber('   '), true);
    });
  });

  describe('assertValidPhone', () => {
    it('should return normalized phone for valid numbers', () => {
      assert.strictEqual(assertValidPhone('9876543210'), '9876543210');
      assert.strictEqual(assertValidPhone('+919876543210'), '9876543210');
      assert.strictEqual(assertValidPhone('98765 43210'), '9876543210');
    });

    it('should throw error for invalid numbers', () => {
      assert.throws(
        () => assertValidPhone('123'),
        /Enter a valid Indian mobile number/
      );

      assert.throws(
        () => assertValidPhone('5876543210'),
        /Enter a valid Indian mobile number/
      );
    });

    it('should return empty string for empty input', () => {
      assert.strictEqual(assertValidPhone(''), '');
      assert.strictEqual(assertValidPhone('   '), '');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed formatting', () => {
      const phone = '+91 (987) 654-3210';
      const result = validatePhoneNumber(phone);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, '9876543210');
    });

    it('should handle extra spaces', () => {
      const phone = '  +91   98765   43210  ';
      const result = validatePhoneNumber(phone);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, '9876543210');
    });

    it('should reject international numbers (non-Indian)', () => {
      const phone = '+1234567890'; // US format
      const result = validatePhoneNumber(phone);
      assert.strictEqual(result.valid, false);
    });
  });
});
