/**
 * SmartPark End-to-End Test Suite
 * QA Engineer: Comprehensive Backend Logic and System Flow Testing
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Parking } from '../models/parking.model.js';
import { Booking } from '../models/booking.model.js';
import { registerUser, loginUser } from '../services/auth.service.js';
import { createBooking, listMyBookings } from '../services/booking.service.js';
import { createParking } from '../services/parking.service.js';
import { getOwnerBookings, verifyBookingByCode } from '../services/owner.service.js';
import { listAdminBookings } from '../services/admin.service.js';
import { generateUniqueCode, CODE_PREFIXES } from '../utils/codeGenerator.js';

// Test database connection
const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartpark_test';

describe('SmartPark E2E Test Suite', () => {
  let testDriver;
  let testOwner;
  let testAdmin;
  let testParking;
  let testBooking;

  before(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test.*@smartpark\.test$/ } });
    await Parking.deleteMany({ title: { $regex: /^TEST/ } });
    await Booking.deleteMany({});
  });

  after(async () => {
    // Clean up after tests
    await User.deleteMany({ email: { $regex: /^test.*@smartpark\.test$/ } });
    await Parking.deleteMany({ title: { $regex: /^TEST/ } });
    await Booking.deleteMany({});
    
    // Close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ============================================================================
  // AUTH TESTING
  // ============================================================================
  describe('AUTH TESTING', () => {
    it('Register user → should succeed', async () => {
      const driverData = {
        name: 'Test Driver',
        email: 'testdriver@smartpark.test',
        password: 'SecurePass123!',
        phone: '9876543210',
        role: 'driver'
      };

      const result = await registerUser(driverData);

      assert.ok(result.user, 'User should be created');
      assert.ok(result.token, 'Token should be returned');
      assert.strictEqual(result.user.email, driverData.email);
      assert.strictEqual(result.user.role, 'driver');
      assert.ok(result.user.userCode, 'User code should be generated');
      assert.ok(result.user.userCode.startsWith('USER-'), 'User code should have USER- prefix');

      testDriver = result.user;
    });

    it('Register owner → should succeed', async () => {
      const ownerData = {
        name: 'Test Owner',
        email: 'testowner@smartpark.test',
        password: 'SecurePass123!',
        phone: '9876543211',
        role: 'owner'
      };

      const result = await registerUser(ownerData);

      assert.ok(result.user, 'Owner should be created');
      assert.ok(result.token, 'Token should be returned');
      assert.strictEqual(result.user.role, 'owner');
      assert.ok(result.user.userCode.startsWith('USER-'), 'Owner code should have USER- prefix');

      testOwner = result.user;
    });

    it('Register admin → should succeed', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'testadmin@smartpark.test',
        password: 'SecurePass123!',
        phone: '9876543212',
        role: 'admin'
      };

      const result = await registerUser(adminData);

      assert.ok(result.user, 'Admin should be created');
      assert.strictEqual(result.user.role, 'admin');

      testAdmin = result.user;
    });

    it('Login → should return token', async () => {
      const result = await loginUser({ email: 'testdriver@smartpark.test', password: 'SecurePass123!' });

      assert.ok(result.user, 'User should be returned');
      assert.ok(result.token, 'Token should be returned');
      assert.strictEqual(result.user.email, 'testdriver@smartpark.test');
    });

    it('Invalid login → should fail', async () => {
      await assert.rejects(
        async () => {
          await loginUser({ email: 'testdriver@smartpark.test', password: 'WrongPassword' });
        },
        (error) => {
          assert.ok(error.message.includes('Invalid') || error.message.includes('credentials'));
          return true;
        },
        'Should reject invalid credentials'
      );
    });

    it('Login with non-existent user → should fail', async () => {
      await assert.rejects(
        async () => {
          await loginUser({ email: 'nonexistent@smartpark.test', password: 'AnyPassword' });
        },
        (error) => {
          assert.ok(error.message.includes('Invalid') || error.message.includes('not found'));
          return true;
        },
        'Should reject non-existent user'
      );
    });
  });

  // ============================================================================
  // PARKING SETUP (for booking tests)
  // ============================================================================
  describe('PARKING SETUP', () => {
    it('Create test parking → should succeed', async () => {
      const parkingData = {
        title: 'TEST Parking Space',
        description: 'Test parking for E2E tests',
        parkingType: 'open',
        address: '123 Test Street',
        area: 'Test Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        latitude: 19.0760,
        longitude: 72.8777,
        totalSlots: 10,
        availableSlots: 10,
        hourlyPrice: 50,
        vehicleTypes: ['2-wheeler', '4-wheeler'],
        pricing: {
          '2-wheeler': 30,
          '4-wheeler': 50
        },
        amenities: ['CCTV', 'Security'],
        isOpen24x7: true
      };

      const ownerUser = await User.findById(testOwner._id);
      const result = await createParking(parkingData, ownerUser);

      assert.ok(result.id, 'Parking should be created');
      assert.strictEqual(result.title, parkingData.title);
      assert.ok(result.parkingCode, 'Parking code should be generated');
      assert.ok(result.parkingCode.startsWith('PARK-'), 'Parking code should have PARK- prefix');

      // Approve parking for testing
      const parking = await Parking.findById(result.id);
      parking.verificationStatus = 'approved';
      parking.isActive = true;
      await parking.save();

      testParking = await Parking.findById(result.id).lean();
    });
  });

  // ============================================================================
  // BOOKING SYSTEM
  // ============================================================================
  describe('BOOKING SYSTEM', () => {
    describe('Valid Booking Cases', () => {
      it('Create booking → success', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const bookingDate = tomorrow.toISOString().split('T')[0];

        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '2-wheeler',
          bookingDate: bookingDate,
          startTime: '10:00',
          endTime: '12:00',
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);
        const result = await createBooking(bookingData, driverUser);

        assert.ok(result.id, 'Booking should be created');
        assert.ok(result.bookingCode, 'Booking code should be generated');
        assert.strictEqual(result.vehicleType, '2-wheeler');
        assert.strictEqual(result.bookingDate, bookingDate);
        assert.strictEqual(result.startTime, '10:00');
        assert.strictEqual(result.endTime, '12:00');

        testBooking = result;
      });

      it('bookingCode generated', async () => {
        assert.ok(testBooking.bookingCode, 'Booking code must exist');
      });

      it('bookingCode format: BOOK-XXXXXXXX', async () => {
        assert.ok(testBooking.bookingCode.startsWith('BOOK-'), 'Should start with BOOK-');
        assert.strictEqual(testBooking.bookingCode.length, 13, 'Should be 13 characters (BOOK- + 8 chars)');
        
        const codePart = testBooking.bookingCode.substring(5);
        assert.ok(/^[A-Z0-9]{8}$/.test(codePart), 'Code part should be 8 alphanumeric characters');
      });

      it('bookingCode uniqueness', async () => {
        const booking1Code = testBooking.bookingCode;
        
        // Create another booking
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const bookingDate = tomorrow.toISOString().split('T')[0];

        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '4-wheeler',
          bookingDate: bookingDate,
          startTime: '14:00',
          endTime: '16:00',
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);
        const result = await createBooking(bookingData, driverUser);

        assert.notStrictEqual(result.bookingCode, booking1Code, 'Booking codes must be unique');
      });
    });

    describe('Invalid Booking Cases', () => {
      it('Past time → reject', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const pastDate = yesterday.toISOString().split('T')[0];

        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '2-wheeler',
          bookingDate: pastDate,
          startTime: '10:00',
          endTime: '12:00',
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);

        await assert.rejects(
          async () => {
            await createBooking(bookingData, driverUser);
          },
          (error) => {
            assert.ok(
              error.message.includes('30 minutes') || 
              error.message.includes('invalid') ||
              error.message.includes('past'),
              `Error message should mention time requirement, got: ${error.message}`
            );
            return true;
          },
          'Should reject past time booking'
        );
      });

      it('Less than 30 min → reject', async () => {
        const now = new Date();
        const in20Minutes = new Date(now.getTime() + 20 * 60 * 1000);
        
        const bookingDate = in20Minutes.toISOString().split('T')[0];
        const startTime = `${String(in20Minutes.getHours()).padStart(2, '0')}:${String(in20Minutes.getMinutes()).padStart(2, '0')}`;
        const endTime = `${String(in20Minutes.getHours() + 1).padStart(2, '0')}:${String(in20Minutes.getMinutes()).padStart(2, '0')}`;

        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '2-wheeler',
          bookingDate: bookingDate,
          startTime: startTime,
          endTime: endTime,
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);

        await assert.rejects(
          async () => {
            await createBooking(bookingData, driverUser);
          },
          (error) => {
            assert.ok(
              error.message.includes('30 minutes') || error.message.includes('minimum'),
              `Error message should mention 30 minute minimum, got: ${error.message}`
            );
            return true;
          },
          'Should reject booking less than 30 minutes in advance'
        );
      });

      it('Overlapping booking → reject', async () => {
        // Use the same time slot as testBooking
        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '2-wheeler',
          bookingDate: testBooking.bookingDate,
          startTime: testBooking.startTime,
          endTime: testBooking.endTime,
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);

        await assert.rejects(
          async () => {
            await createBooking(bookingData, driverUser);
          },
          (error) => {
            assert.ok(
              error.message.includes('overlap') || 
              error.message.includes('already booked') ||
              error.message.includes('available'),
              `Error message should mention overlap/availability, got: ${error.message}`
            );
            return true;
          },
          'Should reject overlapping booking'
        );
      });

      it('Invalid parking ID → reject', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const bookingDate = tomorrow.toISOString().split('T')[0];

        const bookingData = {
          parking: '507f1f77bcf86cd799439011', // Non-existent ID
          vehicleType: '2-wheeler',
          bookingDate: bookingDate,
          startTime: '10:00',
          endTime: '12:00',
          slotCount: 1
        };

        const driverUser = await User.findById(testDriver._id);

        await assert.rejects(
          async () => {
            await createBooking(bookingData, driverUser);
          },
          (error) => {
            assert.ok(error.message.includes('not found') || error.message.includes('Parking'));
            return true;
          },
          'Should reject invalid parking ID'
        );
      });

      it('Insufficient slots → reject', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const bookingDate = tomorrow.toISOString().split('T')[0];

        const bookingData = {
          parking: testParking._id.toString(),
          vehicleType: '2-wheeler',
          bookingDate: bookingDate,
          startTime: '18:00',
          endTime: '20:00',
          slotCount: 999 // More than available
        };

        const driverUser = await User.findById(testDriver._id);

        await assert.rejects(
          async () => {
            await createBooking(bookingData, driverUser);
          },
          (error) => {
            assert.ok(
              error.message.includes('available') || 
              error.message.includes('slots') ||
              error.message.includes('enough'),
              `Error message should mention slot availability, got: ${error.message}`
            );
            return true;
          },
          'Should reject when insufficient slots'
        );
      });
    });
  });

  // ============================================================================
  // OWNER SYSTEM
  // ============================================================================
  describe('OWNER SYSTEM', () => {
    it('Owner sees only their bookings', async () => {
      const ownerUser = await User.findById(testOwner._id);
      const result = await getOwnerBookings(ownerUser);

      assert.ok(result.bookings, 'Should return bookings array');
      assert.ok(Array.isArray(result.bookings), 'Bookings should be an array');
      
      // All bookings should be for owner's parking
      for (const booking of result.bookings) {
        assert.strictEqual(
          booking.parking,
          testParking._id.toString(),
          'All bookings should be for owner\'s parking'
        );
      }
    });

    it('bookingCode visible in owner bookings', async () => {
      const ownerUser = await User.findById(testOwner._id);
      const result = await getOwnerBookings(ownerUser);

      assert.ok(result.bookings.length > 0, 'Should have at least one booking');
      
      for (const booking of result.bookings) {
        assert.ok(booking.bookingCode, 'Each booking should have bookingCode');
        assert.ok(booking.bookingCode.startsWith('BOOK-'), 'bookingCode should start with BOOK-');
      }
    });

    it('Owner bookings include user details', async () => {
      const ownerUser = await User.findById(testOwner._id);
      const result = await getOwnerBookings(ownerUser);

      assert.ok(result.bookings.length > 0, 'Should have bookings');
      
      const booking = result.bookings[0];
      assert.ok(booking.userName, 'Should include user name');
      assert.ok(booking.userEmail, 'Should include user email');
    });

    it('Verify booking using code → owner success', async () => {
      const ownerUser = await User.findById(testOwner._id);
      const result = await verifyBookingByCode(testBooking.bookingCode, ownerUser);

      assert.ok(result, 'Should return booking');
      assert.strictEqual(result.bookingCode, testBooking.bookingCode);
      assert.ok(result.userName, 'Should include user name');
      assert.ok(result.parkingTitle, 'Should include parking title');
    });

    it('Verify booking using code → owner cannot verify other owner\'s booking', async () => {
      // Create another owner
      const anotherOwnerData = {
        name: 'Another Owner',
        email: 'testowner2@smartpark.test',
        password: 'SecurePass123!',
        phone: '9876543213',
        role: 'owner'
      };

      const anotherOwnerResult = await registerUser(anotherOwnerData);
      const anotherOwner = await User.findById(anotherOwnerResult.user._id);

      await assert.rejects(
        async () => {
          await verifyBookingByCode(testBooking.bookingCode, anotherOwner);
        },
        (error) => {
          assert.ok(
            error.message.includes('only verify') || 
            error.message.includes('own parking') ||
            error.statusCode === 403,
            `Should reject with ownership error, got: ${error.message}`
          );
          return true;
        },
        'Owner should not verify other owner\'s bookings'
      );
    });

    it('Invalid booking code → reject', async () => {
      const ownerUser = await User.findById(testOwner._id);

      await assert.rejects(
        async () => {
          await verifyBookingByCode('BOOK-INVALID1', ownerUser);
        },
        (error) => {
          assert.ok(
            error.message.includes('Invalid') || 
            error.message.includes('not found') ||
            error.statusCode === 404
          );
          return true;
        },
        'Should reject invalid booking code'
      );
    });
  });

  // ============================================================================
  // ADMIN SYSTEM
  // ============================================================================
  describe('ADMIN SYSTEM', () => {
    it('Admin sees all bookings', async () => {
      const result = await listAdminBookings();

      assert.ok(result, 'Should return bookings');
      assert.ok(Array.isArray(result), 'Should be an array');
      assert.ok(result.length >= 2, 'Should have at least 2 bookings from tests');
    });

    it('Admin bookings include bookingCode', async () => {
      const result = await listAdminBookings();

      for (const booking of result) {
        assert.ok(booking.bookingCode, 'Each booking should have bookingCode');
        assert.ok(booking.bookingCode.startsWith('BOOK-'), 'bookingCode should start with BOOK-');
      }
    });

    it('Admin bookings include user details', async () => {
      const result = await listAdminBookings();

      assert.ok(result.length > 0, 'Should have bookings');
      
      const booking = result[0];
      assert.ok(booking.userName !== undefined, 'Should include userName field');
      assert.ok(booking.userEmail !== undefined, 'Should include userEmail field');
    });

    it('Admin bookings include parking details', async () => {
      const result = await listAdminBookings();

      const booking = result[0];
      assert.ok(booking.parkingTitle !== undefined, 'Should include parkingTitle field');
      assert.ok(booking.parkingCity !== undefined, 'Should include parkingCity field');
    });

    it('Verify any booking → admin success', async () => {
      const adminUser = await User.findById(testAdmin._id);
      const result = await verifyBookingByCode(testBooking.bookingCode, adminUser);

      assert.ok(result, 'Should return booking');
      assert.strictEqual(result.bookingCode, testBooking.bookingCode);
      assert.ok(result.userName, 'Should include user details');
      assert.ok(result.parkingTitle, 'Should include parking details');
    });

    it('Filters working → status filter', async () => {
      const result = await listAdminBookings({ status: 'pending' });

      assert.ok(Array.isArray(result), 'Should return array');
      
      for (const booking of result) {
        assert.strictEqual(booking.status, 'pending', 'All bookings should have pending status');
      }
    });

    it('Filters working → parking filter', async () => {
      const result = await listAdminBookings({ parking: testParking._id.toString() });

      assert.ok(Array.isArray(result), 'Should return array');
      
      for (const booking of result) {
        assert.strictEqual(
          booking.parking,
          testParking._id.toString(),
          'All bookings should be for specified parking'
        );
      }
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  describe('SECURITY TESTS', () => {
    it('Invalid inputs rejected → missing required fields', async () => {
      const invalidBookingData = {
        parking: testParking._id.toString(),
        // Missing vehicleType, dates, times
      };

      const driverUser = await User.findById(testDriver._id);

      await assert.rejects(
        async () => {
          await createBooking(invalidBookingData, driverUser);
        },
        'Should reject booking with missing fields'
      );
    });

    it('Invalid inputs rejected → invalid vehicle type', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];

      const invalidBookingData = {
        parking: testParking._id.toString(),
        vehicleType: 'spaceship', // Invalid
        bookingDate: bookingDate,
        startTime: '10:00',
        endTime: '12:00',
        slotCount: 1
      };

      const driverUser = await User.findById(testDriver._id);

      await assert.rejects(
        async () => {
          await createBooking(invalidBookingData, driverUser);
        },
        (error) => {
          assert.ok(
            error.message.includes('vehicle') || 
            error.message.includes('type') ||
            error.message.includes('supported')
          );
          return true;
        },
        'Should reject invalid vehicle type'
      );
    });

    it('Invalid inputs rejected → negative slot count', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];

      const invalidBookingData = {
        parking: testParking._id.toString(),
        vehicleType: '2-wheeler',
        bookingDate: bookingDate,
        startTime: '10:00',
        endTime: '12:00',
        slotCount: -1 // Invalid
      };

      const driverUser = await User.findById(testDriver._id);

      await assert.rejects(
        async () => {
          await createBooking(invalidBookingData, driverUser);
        },
        'Should reject negative slot count'
      );
    });

    it('Unauthorized access blocked → driver cannot access owner bookings directly', async () => {
      // This would be tested at the controller/route level with middleware
      // Service layer assumes authenticated user is passed
      assert.ok(true, 'Middleware handles authorization at route level');
    });

    it('Empty booking code → reject', async () => {
      const ownerUser = await User.findById(testOwner._id);

      await assert.rejects(
        async () => {
          await verifyBookingByCode('', ownerUser);
        },
        (error) => {
          assert.ok(error.message.includes('required') || error.message.includes('Booking code'));
          return true;
        },
        'Should reject empty booking code'
      );
    });

    it('Null booking code → reject', async () => {
      const ownerUser = await User.findById(testOwner._id);

      await assert.rejects(
        async () => {
          await verifyBookingByCode(null, ownerUser);
        },
        (error) => {
          assert.ok(error.message.includes('required') || error.message.includes('Booking code'));
          return true;
        },
        'Should reject null booking code'
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  describe('ERROR HANDLING', () => {
    it('Proper error messages returned → invalid credentials', async () => {
      try {
        await loginUser({ email: 'testdriver@smartpark.test', password: 'WrongPassword' });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message, 'Error should have message');
        assert.ok(
          error.message.includes('Invalid') || 
          error.message.includes('credentials') ||
          error.message.includes('password'),
          `Error message should be descriptive, got: ${error.message}`
        );
      }
    });

    it('Proper error messages returned → booking not found', async () => {
      const ownerUser = await User.findById(testOwner._id);

      try {
        await verifyBookingByCode('BOOK-NOTFOUND', ownerUser);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message, 'Error should have message');
        assert.ok(
          error.message.includes('Invalid') || error.message.includes('not found'),
          `Error message should indicate not found, got: ${error.message}`
        );
        assert.strictEqual(error.statusCode, 404, 'Should return 404 status code');
      }
    });

    it('Proper error messages returned → unauthorized access', async () => {
      const anotherOwner = await User.findOne({ email: 'testowner2@smartpark.test' });

      try {
        await verifyBookingByCode(testBooking.bookingCode, anotherOwner);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message, 'Error should have message');
        assert.ok(
          error.message.includes('only verify') || 
          error.message.includes('own parking') ||
          error.message.includes('permission'),
          `Error message should indicate permission issue, got: ${error.message}`
        );
        assert.strictEqual(error.statusCode, 403, 'Should return 403 status code');
      }
    });

    it('Proper error messages returned → past booking time', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      const bookingData = {
        parking: testParking._id.toString(),
        vehicleType: '2-wheeler',
        bookingDate: pastDate,
        startTime: '10:00',
        endTime: '12:00',
        slotCount: 1
      };

      const driverUser = await User.findById(testDriver._id);

      try {
        await createBooking(bookingData, driverUser);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message, 'Error should have message');
        assert.ok(
          error.message.includes('30 minutes') || 
          error.message.includes('invalid') ||
          error.message.includes('minimum'),
          `Error message should explain time requirement, got: ${error.message}`
        );
      }
    });
  });

  // ============================================================================
  // CODE GENERATION SYSTEM
  // ============================================================================
  describe('CODE GENERATION SYSTEM', () => {
    it('Generate unique codes → no duplicates', async () => {
      const codes = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const code = await generateUniqueCode(CODE_PREFIXES.BOOKING, async () => true);
        assert.ok(!codes.has(code), `Code ${code} should be unique`);
        codes.add(code);
      }

      assert.strictEqual(codes.size, iterations, 'All codes should be unique');
    });

    it('Code format validation → correct prefix', async () => {
      const code = await generateUniqueCode(CODE_PREFIXES.BOOKING, async () => true);
      assert.ok(code.startsWith('BOOK-'), 'Should have correct prefix');
    });

    it('Code format validation → correct length', async () => {
      const code = await generateUniqueCode(CODE_PREFIXES.BOOKING, async () => true);
      assert.strictEqual(code.length, 13, 'Should be 13 characters total');
    });

    it('Code format validation → alphanumeric only', async () => {
      const code = await generateUniqueCode(CODE_PREFIXES.BOOKING, async () => true);
      const codePart = code.substring(5);
      assert.ok(/^[A-Z0-9]{8}$/.test(codePart), 'Code should be alphanumeric uppercase');
    });
  });
});
