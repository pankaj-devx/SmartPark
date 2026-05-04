import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEmail, validateEmailFormat, isCommonEmailDomain } from './emailValidation.js';

describe('Email Validation', () => {
  describe('validateEmailFormat', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.in',
        'test+tag@gmail.com',
        'user_name@domain.org',
        'first.last@sub.domain.com',
        'a@b.co'
      ];

      validEmails.forEach((email) => {
        const result = validateEmailFormat(email);
        assert.strictEqual(result.valid, true, `${email} should be valid`);
        assert.strictEqual(result.error, null);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '.user@example.com',
        'user.@example.com',
        'user..name@example.com',
        'user@.example.com',
        'user@example..com',
        'user@-example.com',
        'user@example.com-',
        'user@example.c',
        'user@example.toolongtld'
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmailFormat(email);
        assert.strictEqual(result.valid, false, `${email} should be invalid`);
        assert.strictEqual(result.error, 'Please enter a valid email address');
      });
      
      // Empty string has a different error message
      const emptyResult = validateEmailFormat('');
      assert.strictEqual(emptyResult.valid, false);
      assert.strictEqual(emptyResult.error, 'Email is required');
    });

    it('should handle edge cases', () => {
      // Username too long (>64 chars)
      const longUsername = 'a'.repeat(65) + '@example.com';
      assert.strictEqual(validateEmailFormat(longUsername).valid, false);

      // Domain too long (>255 chars)
      const longDomain = 'user@' + 'a'.repeat(256) + '.com';
      assert.strictEqual(validateEmailFormat(longDomain).valid, false);

      // Multiple @ symbols
      assert.strictEqual(validateEmailFormat('user@@example.com').valid, false);
      assert.strictEqual(validateEmailFormat('user@domain@example.com').valid, false);
    });
  });

  describe('isCommonEmailDomain', () => {
    it('should recognize common email domains', () => {
      const commonEmails = [
        'user@gmail.com',
        'test@yahoo.com',
        'john@outlook.com',
        'jane@hotmail.com',
        'admin@icloud.com'
      ];

      commonEmails.forEach((email) => {
        assert.strictEqual(isCommonEmailDomain(email), true, `${email} should be recognized as common`);
      });
    });

    it('should not recognize uncommon domains', () => {
      const uncommonEmails = [
        'user@mycompany.com',
        'test@custom-domain.org',
        'admin@startup.io'
      ];

      uncommonEmails.forEach((email) => {
        assert.strictEqual(isCommonEmailDomain(email), false, `${email} should not be recognized as common`);
      });
    });
  });

  describe('validateEmail with options', () => {
    it('should accept common domains when requireCommonDomain is true', () => {
      const result = validateEmail('user@gmail.com', { requireCommonDomain: true });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
    });

    it('should reject uncommon domains when requireCommonDomain is true', () => {
      const result = validateEmail('user@mycompany.com', { requireCommonDomain: true });
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('common email provider'));
    });

    it('should accept any valid domain when requireCommonDomain is false', () => {
      const result = validateEmail('user@mycompany.com', { requireCommonDomain: false });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
    });
  });
});
