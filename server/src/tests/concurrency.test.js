/**
 * CONCURRENCY UNIT TEST
 * 
 * Tests that simultaneous booking attempts for the last available slot
 * result in only ONE success and the other getting a 409 conflict error.
 * 
 * This test uses mocks to simulate the concurrency scenario.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmedBooking } from '../services/booking.service.js';

test('CONCURRENCY TEST: Two simultaneous bookings for last slot - only one succeeds', async () => {
  console.log('\n=== CONCURRENCY TEST START ===');
  console.log('Scenario: 1 slot available, 2 simultaneous booking attempts');
  
  let bookingCount = 0;
  let lockAcquired = false;

  // Mock models that simulate real MongoDB behavior
  const mockParking = {
    _id: 'parking123',
    title: 'Test Parking',
    totalSlots: 1,
    availableSlots: 1,
    vehicleTypes: ['4-wheeler'],
    hourlyPrice: 50,
    verificationStatus: 'approved',
    isActive: true
  };

  const mockUser1 = { _id: 'user1', name: 'User 1', status: 'active' };
  const mockUser2 = { _id: 'user2', name: 'User 2', status: 'active' };

  // Mock ParkingModel that simulates pessimistic locking
  const ParkingModel = {
    findOne: async (query) => {
      if (query._id === mockParking._id) {
        return { ...mockParking, session: () => mockParking };
      }
      return null;
    },
    findOneAndUpdate: async (query, update, options) => {
      // Simulate pessimistic lock - only one can acquire at a time
      if (lockAcquired) {
        // Second request waits for lock
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      lockAcquired = true;
      
      if (query._id === mockParking._id) {
        return {
          ...mockParking,
          session: () => mockParking
        };
      }
      return null;
    }
  };

  // Mock BookingModel that tracks booking count
  const BookingModel = {
    create: async (bookings, options) => {
      bookingCount++;
      return [{
        _id: `booking${bookingCount}`,
        ...bookings[0],
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    },
    aggregate: async (pipeline) => {
      // Simulate occupancy calculation
      // First request: 0 occupied
      // Second request: 1 occupied (first booking created)
      const occupiedSlots = bookingCount;
      return [{ totalSlots: occupiedSlots }];
    },
    findOne: async () => null
  };

  // Mock code generator
  const generateUniqueCode = async () => `BOOK-${Date.now()}`;

  const bookingInput = {
    parking: 'parking123',
    vehicleType: '4-wheeler',
    bookingDate: '2026-06-01',
    startTime: '14:00',
    endTime: '16:00',
    slotCount: 1
  };

  const deps = {
    ParkingModel,
    BookingModel,
    paymentStatus: 'paid',
    status: 'confirmed',
    bookingStatus: 'confirmed',
    razorpayOrderId: 'test_order',
    razorpayPaymentId: 'test_payment'
  };

  console.log('Attempting 2 SIMULTANEOUS bookings...\n');

  // Execute TWO booking attempts SIMULTANEOUSLY
  const results = await Promise.allSettled([
    createConfirmedBooking(bookingInput, mockUser1, { ...deps, razorpayOrderId: 'order1' }),
    createConfirmedBooking(bookingInput, mockUser2, { ...deps, razorpayOrderId: 'order2' })
  ]);

  // Analyze results
  const successes = results.filter(r => r.status === 'fulfilled');
  const failures = results.filter(r => r.status === 'rejected');

  console.log('=== RESULTS ===');
  console.log('Successes:', successes.length);
  console.log('Failures:', failures.length);

  if (successes.length > 0) {
    console.log('\nSuccessful Booking:');
    console.log('  User:', successes[0].value.user);
    console.log('  Booking ID:', successes[0].value.id);
  }

  if (failures.length > 0) {
    console.log('\nFailed Booking:');
    console.log('  Error:', failures[0].reason.message);
    console.log('  Status Code:', failures[0].reason.statusCode);
  }

  console.log('\n=== CONCURRENCY TEST END ===\n');

  // ASSERTIONS
  assert.equal(successes.length, 1, 'Expected exactly 1 successful booking');
  assert.equal(failures.length, 1, 'Expected exactly 1 failed booking');
  assert.equal(failures[0].reason.statusCode, 409, 'Expected 409 Conflict error');
  assert.match(failures[0].reason.message, /slot|available/i, 'Expected slot availability error message');

  console.log('✅ CONCURRENCY TEST PASSED: Only one booking succeeded, other got 409 conflict\n');
});
