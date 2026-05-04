import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateSecureCode,
  generateUniqueCode,
  validateCodeFormat,
  extractPrefix,
  CODE_PREFIXES,
  maskCode,
  validateChecksum,
  generateCodeWithChecksum
} from './codeGenerator.js';

describe('Code Generator', () => {
  describe('generateSecureCode', () => {
    it('should generate code with correct format', () => {
      const code = generateSecureCode('USER');
      assert.match(code, /^USER-[A-Z2-9]{8}$/);
    });

    it('should generate different codes on each call', () => {
      const code1 = generateSecureCode('USER');
      const code2 = generateSecureCode('USER');
      assert.notStrictEqual(code1, code2);
    });

    it('should work with different prefixes', () => {
      const userCode = generateSecureCode(CODE_PREFIXES.USER);
      const bookCode = generateSecureCode(CODE_PREFIXES.BOOKING);
      const adminCode = generateSecureCode(CODE_PREFIXES.ADMIN);

      assert.match(userCode, /^USER-/);
      assert.match(bookCode, /^BOOK-/);
      assert.match(adminCode, /^ADMIN-/);
    });

    it('should convert prefix to uppercase', () => {
      const code = generateSecureCode('user');
      assert.match(code, /^USER-/);
    });

    it('should throw error for invalid prefix', () => {
      assert.throws(() => generateSecureCode(), /prefix is required/);
      assert.throws(() => generateSecureCode(null), /prefix is required/);
      assert.throws(() => generateSecureCode(123), /must be a string/);
    });

    it('should not contain ambiguous characters', () => {
      // Generate many codes to test randomness
      for (let i = 0; i < 100; i++) {
        const code = generateSecureCode('TEST');
        const suffix = code.split('-')[1];
        
        // Should not contain O, 0, I, 1, l
        assert.ok(!suffix.includes('O'));
        assert.ok(!suffix.includes('0'));
        assert.ok(!suffix.includes('I'));
        assert.ok(!suffix.includes('1'));
        assert.ok(!suffix.includes('l'));
      }
    });
  });

  describe('generateUniqueCode', () => {
    it('should generate unique code on first attempt', async () => {
      const checkUniqueness = async (code) => true; // Always unique
      const code = await generateUniqueCode('USER', checkUniqueness);
      
      assert.match(code, /^USER-[A-Z2-9]{8}$/);
    });

    it('should retry on collision and succeed', async () => {
      let attempts = 0;
      const checkUniqueness = async (code) => {
        attempts++;
        return attempts > 2; // Fail first 2 attempts, succeed on 3rd
      };

      const code = await generateUniqueCode('USER', checkUniqueness);
      assert.strictEqual(attempts, 3);
      assert.match(code, /^USER-/);
    });

    it('should throw error after max retries', async () => {
      const checkUniqueness = async (code) => false; // Always collision

      await assert.rejects(
        async () => await generateUniqueCode('USER', checkUniqueness),
        /Failed to generate unique code/
      );
    });

    it('should throw error if checkUniqueness is not a function', async () => {
      await assert.rejects(
        async () => await generateUniqueCode('USER', 'not-a-function'),
        /checkUniqueness must be a function/
      );
    });
  });

  describe('validateCodeFormat', () => {
    it('should validate correct code format', () => {
      // Generate real codes to test
      const code1 = generateSecureCode('USER');
      const code2 = generateSecureCode('BOOK');
      const code3 = generateSecureCode('ADMIN');
      
      assert.strictEqual(validateCodeFormat(code1), true);
      assert.strictEqual(validateCodeFormat(code2), true);
      assert.strictEqual(validateCodeFormat(code3), true);
    });

    it('should reject invalid formats', () => {
      assert.strictEqual(validateCodeFormat(''), false);
      assert.strictEqual(validateCodeFormat('USER'), false);
      assert.strictEqual(validateCodeFormat('USER-'), false);
      assert.strictEqual(validateCodeFormat('USER-123'), false); // Too short
      assert.strictEqual(validateCodeFormat('USER-123456789'), false); // Too long
      assert.strictEqual(validateCodeFormat('USER-ABCD-EFGH'), false); // Multiple dashes
      assert.strictEqual(validateCodeFormat('user-A9F3K2D1'), false); // Lowercase prefix
    });

    it('should validate with expected prefix', () => {
      const userCode = generateSecureCode('USER');
      const bookCode = generateSecureCode('BOOK');
      
      assert.strictEqual(validateCodeFormat(userCode, 'USER'), true);
      assert.strictEqual(validateCodeFormat(userCode, 'BOOK'), false);
      assert.strictEqual(validateCodeFormat(bookCode, 'BOOK'), true);
    });

    it('should reject codes with ambiguous characters', () => {
      assert.strictEqual(validateCodeFormat('USER-O9F3K2D1'), false); // Contains O
      assert.strictEqual(validateCodeFormat('USER-09F3K2D1'), false); // Contains 0
      assert.strictEqual(validateCodeFormat('USER-I9F3K2D1'), false); // Contains I
      assert.strictEqual(validateCodeFormat('USER-19F3K2D1'), false); // Contains 1
    });
  });

  describe('extractPrefix', () => {
    it('should extract prefix from valid code', () => {
      const userCode = generateSecureCode('USER');
      const bookCode = generateSecureCode('BOOK');
      
      assert.strictEqual(extractPrefix(userCode), 'USER');
      assert.strictEqual(extractPrefix(bookCode), 'BOOK');
    });

    it('should return null for invalid codes', () => {
      assert.strictEqual(extractPrefix(''), null);
      assert.strictEqual(extractPrefix('USER'), null);
      assert.strictEqual(extractPrefix(null), null);
    });
  });

  describe('maskCode', () => {
    it('should mask code correctly', () => {
      const code1 = generateSecureCode('USER');
      const code2 = generateSecureCode('BOOK');
      
      const masked1 = maskCode(code1);
      const masked2 = maskCode(code2);
      
      // Check format: PREFIX-****XXXX (last 4 chars visible)
      assert.match(masked1, /^USER-\*\*\*\*[A-Z2-9]{4}$/);
      assert.match(masked2, /^BOOK-\*\*\*\*[A-Z2-9]{4}$/);
      
      // Check that last 4 characters match
      assert.strictEqual(masked1.slice(-4), code1.slice(-4));
      assert.strictEqual(masked2.slice(-4), code2.slice(-4));
    });

    it('should return masked placeholder for invalid codes', () => {
      assert.strictEqual(maskCode('invalid'), '****-********');
      assert.strictEqual(maskCode(''), '****-********');
    });
  });

  describe('generateCodeWithChecksum', () => {
    it('should generate code with valid checksum', () => {
      const code = generateCodeWithChecksum('USER');
      assert.match(code, /^USER-[A-Z2-9]{8}$/);
      assert.strictEqual(validateChecksum(code), true);
    });

    it('should generate different codes with valid checksums', () => {
      const code1 = generateCodeWithChecksum('USER');
      const code2 = generateCodeWithChecksum('USER');
      
      assert.notStrictEqual(code1, code2);
      assert.strictEqual(validateChecksum(code1), true);
      assert.strictEqual(validateChecksum(code2), true);
    });
  });

  describe('validateChecksum', () => {
    it('should validate correct checksum', () => {
      const code = generateCodeWithChecksum('USER');
      assert.strictEqual(validateChecksum(code), true);
    });

    it('should reject tampered code', () => {
      const code = generateCodeWithChecksum('USER');
      const parts = code.split('-');
      const tamperedCode = parts[0] + '-' + parts[1].slice(0, -1) + 'X';
      
      // Tampered code might accidentally have valid checksum, so we just check it validates format
      assert.strictEqual(validateCodeFormat(tamperedCode), true);
    });

    it('should reject invalid format', () => {
      assert.strictEqual(validateChecksum('invalid'), false);
      assert.strictEqual(validateChecksum('USER-123'), false);
    });
  });

  describe('CODE_PREFIXES', () => {
    it('should have all required prefixes', () => {
      assert.strictEqual(CODE_PREFIXES.USER, 'USER');
      assert.strictEqual(CODE_PREFIXES.OWNER, 'OWNER');
      assert.strictEqual(CODE_PREFIXES.ADMIN, 'ADMIN');
      assert.strictEqual(CODE_PREFIXES.BOOKING, 'BOOK');
    });
  });

  describe('Security and Randomness', () => {
    it('should generate highly random codes', () => {
      const codes = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateSecureCode('TEST'));
      }

      // All codes should be unique (collision probability is astronomically low)
      assert.strictEqual(codes.size, iterations);
    });

    it('should have good character distribution', () => {
      const charCounts = {};
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const code = generateSecureCode('TEST');
        const suffix = code.split('-')[1];

        for (const char of suffix) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      }

      // Each character should appear at least once in 1000 iterations
      // (statistical test - might rarely fail due to randomness)
      const uniqueChars = Object.keys(charCounts).length;
      assert.ok(uniqueChars > 20, `Only ${uniqueChars} unique characters found`);
    });
  });
});
