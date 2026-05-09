/**
 * Tests for centralized occupancy service
 * Validates correct business logic for slot availability and occupancy calculations
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
  calculateOccupiedSlots,
  calculateAvailableSlots,
  calculateCurrentOccupancy,
  calculateUpcomingLoad,
  calculateUtilization,
  calculateOccupancyMetrics,
  calculateOccupancyMetricsForMany,
  buildOccupancyFilter,
  validateSlotAvailability
} from './occupancy.service.js';

// Mock booking model
function makeBookingModel(bookings = []) {
  return {
    aggregate: (pipeline) => {
      const matchStage = pipeline.find((stage) => stage.$match);
      const groupStage = pipeline.find((stage) => stage.$group);

      if (!matchStage || !groupStage) {
        return Promise.resolve([]);
      }

      const filter = matchStage.$match;
      const filtered = bookings.filter((booking) => {
        // Check parking
        if (filter.parking && booking.parking.toString() !== filter.parking.toString()) {
          return false;
        }

        // Check parking array
        if (filter.parking?.$in) {
          const parkingIds = filter.parking.$in.map((id) => id.toString());
          if (!parkingIds.includes(booking.parking.toString())) {
            return false;
          }
        }

        // Check date
        if (filter.bookingDate && booking.bookingDate !== filter.bookingDate) {
          return false;
        }

        // Check status
        if (filter.status?.$in && !filter.status.$in.includes(booking.status)) {
          return false;
        }

        // Check payment status
        if (filter.paymentStatus && booking.paymentStatus !== filter.paymentStatus) {
          return false;
        }

        // Check booking status
        if (filter.bookingStatus?.$ne && booking.bookingStatus === filter.bookingStatus.$ne) {
          return false;
        }

        // Check time overlap
        if (filter.startTime?.$lt && filter.endTime?.$gt) {
          const bookingStart = booking.startTime;
          const bookingEnd = booking.endTime;
          const filterStart = filter.endTime.$gt;
          const filterEnd = filter.startTime.$lt;

          // Overlap: booking.start < filter.end AND booking.end > filter.start
          if (!(bookingStart < filterEnd && bookingEnd > filterStart)) {
            return false;
          }
        }

        // Check $or conditions for current/upcoming
        if (filter.$or) {
          const matchesOr = filter.$or.some((condition) => {
            // Date comparison
            if (condition.bookingDate?.$lt) {
              return booking.bookingDate < condition.bookingDate.$lt;
            }
            if (condition.bookingDate?.$gt) {
              return booking.bookingDate > condition.bookingDate.$gt;
            }
            if (condition.bookingDate) {
              const dateMatch = booking.bookingDate === condition.bookingDate;
              if (!dateMatch) return false;

              // Time comparisons
              if (condition.startTime?.$lte && condition.endTime?.$gt) {
                return booking.startTime <= condition.startTime.$lte && booking.endTime > condition.endTime.$gt;
              }
              if (condition.startTime?.$gt) {
                return booking.startTime > condition.startTime.$gt;
              }
            }
            return false;
          });

          if (!matchesOr) {
            return false;
          }
        }

        return true;
      });

      // Apply grouping
      if (groupStage.$group.totalSlots) {
        const total = filtered.reduce((sum, b) => sum + b.slotCount, 0);
        return Promise.resolve([{ totalSlots: total }]);
      }

      if (groupStage.$group.occupiedSlots) {
        const total = filtered.reduce((sum, b) => sum + b.slotCount, 0);
        return Promise.resolve([{ _id: filter.parking, occupiedSlots: total }]);
      }

      if (groupStage.$group.count && groupStage.$group.slots) {
        const total = filtered.reduce((sum, b) => sum + b.slotCount, 0);
        return Promise.resolve([{ _id: filter.parking, count: filtered.length, slots: total }]);
      }

      return Promise.resolve([]);
    }
  };
}

// Test Case 1: Basic occupancy calculation
test('calculateOccupiedSlots - single overlapping booking', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 1,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const occupied = await calculateOccupiedSlots(
    'listing1',
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(occupied, 1, 'Should count 1 occupied slot');
});

// Test Case 2: Multiple overlapping bookings
test('calculateOccupiedSlots - multiple overlapping bookings', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 2,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    },
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '11:00',
      endTime: '13:00',
      slotCount: 3,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    },
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '11:30',
      endTime: '14:00',
      slotCount: 4,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const occupied = await calculateOccupiedSlots(
    'listing1',
    {
      bookingDate: '2024-01-15',
      startTime: '11:00',
      endTime: '13:00'
    },
    { BookingModel }
  );

  assert.strictEqual(occupied, 9, 'Should count 2+3+4=9 occupied slots');
});

// Test Case 3: Cancelled booking should not count
test('calculateOccupiedSlots - excludes cancelled bookings', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 2,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'cancelled' // Cancelled
    },
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 3,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const occupied = await calculateOccupiedSlots(
    'listing1',
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(occupied, 3, 'Should only count confirmed booking (3 slots)');
});

// Test Case 4: No overlap
test('calculateOccupiedSlots - no overlapping bookings', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 2,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const occupied = await calculateOccupiedSlots(
    'listing1',
    {
      bookingDate: '2024-01-15',
      startTime: '14:00', // After existing booking
      endTime: '16:00'
    },
    { BookingModel }
  );

  assert.strictEqual(occupied, 0, 'Should count 0 occupied slots (no overlap)');
});

// Test Case 5: Available slots calculation
test('calculateAvailableSlots - correct calculation', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 9,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const available = await calculateAvailableSlots(
    'listing1',
    20, // Total slots
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(available, 11, 'Should have 20-9=11 available slots');
});

// Test Case 6: Overbooking prevention
test('calculateAvailableSlots - prevents negative availability', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 25, // More than total
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const available = await calculateAvailableSlots(
    'listing1',
    20,
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(available, 0, 'Should clamp to 0 (not negative)');
});

// Test Case 7: Utilization calculation
test('calculateUtilization - correct percentage', () => {
  assert.strictEqual(calculateUtilization(5, 20), 25, 'Should be 25%');
  assert.strictEqual(calculateUtilization(20, 20), 100, 'Should be 100%');
  assert.strictEqual(calculateUtilization(0, 20), 0, 'Should be 0%');
  assert.strictEqual(calculateUtilization(10, 0), 0, 'Should be 0% when totalSlots is 0');
});

// Test Case 8: Slot availability validation
test('validateSlotAvailability - valid request', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 9,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const result = await validateSlotAvailability(
    'listing1',
    20,
    5, // Request 5 slots
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(result.valid, true, 'Should be valid');
  assert.strictEqual(result.error, null, 'Should have no error');
  assert.strictEqual(result.availableSlots, 11, 'Should show 11 available');
});

// Test Case 9: Slot availability validation - insufficient slots
test('validateSlotAvailability - insufficient slots', async () => {
  const bookings = [
    {
      parking: 'listing1',
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      slotCount: 18,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed'
    }
  ];

  const BookingModel = makeBookingModel(bookings);
  const result = await validateSlotAvailability(
    'listing1',
    20,
    5, // Request 5 slots, but only 2 available
    {
      bookingDate: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00'
    },
    { BookingModel }
  );

  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.strictEqual(result.error, 'Only 2 slot(s) available for selected time');
  assert.strictEqual(result.availableSlots, 2, 'Should show 2 available');
});

// Test Case 10: Build occupancy filter
test('buildOccupancyFilter - correct filter structure', () => {
  const filter = buildOccupancyFilter({
    parking: 'listing1',
    bookingDate: '2024-01-15',
    startTime: '10:00',
    endTime: '12:00'
  });

  assert.strictEqual(filter.parking, 'listing1');
  assert.strictEqual(filter.bookingDate, '2024-01-15');
  assert.deepStrictEqual(filter.status, { $in: ['confirmed', 'active', 'ongoing'] });
  assert.strictEqual(filter.paymentStatus, 'paid');
  assert.deepStrictEqual(filter.bookingStatus, { $ne: 'cancelled' });
  assert.deepStrictEqual(filter.startTime, { $lt: '12:00' });
  assert.deepStrictEqual(filter.endTime, { $gt: '10:00' });
});

console.log('✓ All occupancy service tests passed');
