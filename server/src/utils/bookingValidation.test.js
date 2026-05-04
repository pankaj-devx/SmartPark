import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateBookingTime,
  doTimesOverlap,
  buildOverlapQuery,
  validateSlotAvailability,
  calculateDuration,
  validateBookingDate,
  validateBookingInput,
  formatValidationErrors
} from './bookingValidation.js';

describe('Booking Validation', () => {
  describe('validateBookingTime', () => {
    it('should validate correct booking time', () => {
      // Future date, valid times
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateStr = futureDate.toISOString().slice(0, 10);
      
      const result = validateBookingTime(dateStr, '10:00', '12:00');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
    });

    it('should reject end time before start time', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateStr = futureDate.toISOString().slice(0, 10);
      
      const result = validateBookingTime(dateStr, '12:00', '10:00');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /after start time/);
    });

    it('should reject booking less than 30 minutes duration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateStr = futureDate.toISOString().slice(0, 10);
      
      const result = validateBookingTime(dateStr, '10:00', '10:15');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Minimum booking duration/);
    });

    it('should accept booking up to 24 hours', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days ahead to ensure it's > 30 min
      const dateStr = futureDate.toISOString().slice(0, 10);
      
      // 23 hours 59 minutes is valid (just under 24 hours)
      const result = validateBookingTime(dateStr, '00:00', '23:59');
      assert.strictEqual(result.valid, true);
    });

    it('should reject booking less than 30 minutes from now', () => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 15).padStart(2, '0')}`;
      
      const result = validateBookingTime(dateStr, timeStr, '23:59');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /minimum 30 minutes required/);
    });

    it('should reject invalid date format', () => {
      const result = validateBookingTime('2024/01/01', '10:00', '12:00');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Invalid date format/);
    });

    it('should reject invalid time format', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateStr = futureDate.toISOString().slice(0, 10);
      
      const result1 = validateBookingTime(dateStr, '25:00', '12:00');
      assert.strictEqual(result1.valid, false);
      
      const result2 = validateBookingTime(dateStr, '10:00', '12:70');
      assert.strictEqual(result2.valid, false);
    });
  });

  describe('doTimesOverlap', () => {
    it('should detect overlapping times', () => {
      // Complete overlap
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '10:00', '12:00'), true);
      
      // Partial overlap (start)
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '09:00', '11:00'), true);
      
      // Partial overlap (end)
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '11:00', '13:00'), true);
      
      // One contains the other
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '09:00', '13:00'), true);
      assert.strictEqual(doTimesOverlap('09:00', '13:00', '10:00', '12:00'), true);
    });

    it('should not detect non-overlapping times', () => {
      // Before
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '08:00', '09:00'), false);
      
      // After
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '13:00', '14:00'), false);
      
      // Adjacent (end = start)
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '12:00', '14:00'), false);
    });

    it('should handle edge cases', () => {
      // Same start time
      assert.strictEqual(doTimesOverlap('10:00', '11:00', '10:00', '10:30'), true);
      
      // Same end time
      assert.strictEqual(doTimesOverlap('10:00', '12:00', '11:00', '12:00'), true);
      
      // One minute overlap
      assert.strictEqual(doTimesOverlap('10:00', '11:00', '10:59', '12:00'), true);
    });
  });

  describe('buildOverlapQuery', () => {
    it('should build correct overlap query', () => {
      const input = {
        parking: 'parking123',
        bookingDate: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      };
      
      const query = buildOverlapQuery(input);
      
      assert.strictEqual(query.parking, 'parking123');
      assert.strictEqual(query.bookingDate, '2024-01-15');
      assert.deepStrictEqual(query.status, { $in: ['pending', 'confirmed'] });
      assert.deepStrictEqual(query.startTime, { $lt: '12:00' });
      assert.deepStrictEqual(query.endTime, { $gt: '10:00' });
    });

    it('should use custom active statuses', () => {
      const input = {
        parking: 'parking123',
        bookingDate: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      };
      
      const query = buildOverlapQuery(input, ['confirmed']);
      assert.deepStrictEqual(query.status, { $in: ['confirmed'] });
    });
  });

  describe('validateSlotAvailability', () => {
    it('should validate available slots', () => {
      const result = validateSlotAvailability(2, 10, 5);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
      assert.strictEqual(result.availableSlots, 5);
    });

    it('should reject when not enough slots', () => {
      const result = validateSlotAvailability(6, 10, 5);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Only 5 slot/);
    });

    it('should reject when no slots available', () => {
      const result = validateSlotAvailability(1, 10, 10);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /No slots available/);
    });

    it('should reject when requesting less than 1 slot', () => {
      const result = validateSlotAvailability(0, 10, 5);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /At least one slot/);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      assert.strictEqual(calculateDuration('10:00', '12:00'), 120);
      assert.strictEqual(calculateDuration('09:30', '10:45'), 75);
      assert.strictEqual(calculateDuration('00:00', '23:59'), 1439);
    });
  });

  describe('validateBookingDate', () => {
    it('should validate correct date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      
      const result = validateBookingDate(dateStr);
      assert.strictEqual(result.valid, true);
    });

    it('should reject invalid format', () => {
      const result = validateBookingDate('2024/01/01');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Invalid date format/);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);
      
      const result = validateBookingDate(dateStr);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Cannot book for past dates/);
    });
  });

  describe('validateBookingInput', () => {
    it('should validate complete valid input', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      
      const input = {
        parking: 'parking123',
        vehicleType: '4-wheeler',
        bookingDate: dateStr,
        startTime: '10:00',
        endTime: '12:00',
        slotCount: 2
      };
      
      const result = validateBookingInput(input);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject missing required fields', () => {
      const input = {
        parking: 'parking123'
      };
      
      const result = validateBookingInput(input);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some(e => e.includes('Vehicle type')));
      assert.ok(result.errors.some(e => e.includes('Booking date')));
    });

    it('should reject invalid slot count', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      
      const input = {
        parking: 'parking123',
        vehicleType: '4-wheeler',
        bookingDate: dateStr,
        startTime: '10:00',
        endTime: '12:00',
        slotCount: 0
      };
      
      const result = validateBookingInput(input);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('At least one slot')));
    });
  });

  describe('formatValidationErrors', () => {
    it('should format single error', () => {
      const result = formatValidationErrors(['Error 1']);
      assert.strictEqual(result, 'Error 1');
    });

    it('should format multiple errors', () => {
      const result = formatValidationErrors(['Error 1', 'Error 2']);
      assert.match(result, /Multiple validation errors/);
      assert.match(result, /Error 1/);
      assert.match(result, /Error 2/);
    });

    it('should handle empty errors', () => {
      const result = formatValidationErrors([]);
      assert.strictEqual(result, 'Validation failed');
    });
  });
});
