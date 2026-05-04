/**
 * Migration script to add bookingCode to existing bookings
 * Run this once to update old bookings that don't have a code
 */

import mongoose from 'mongoose';
import { Booking } from '../src/models/booking.model.js';
import { generateUniqueCode, CODE_PREFIXES } from '../src/utils/codeGenerator.js';
import { env } from '../src/config/env.js';

async function migrateBookingCodes() {
  try {
    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to database');

    // Find bookings without bookingCode
    const bookingsWithoutCode = await Booking.find({
      $or: [
        { bookingCode: { $exists: false } },
        { bookingCode: null },
        { bookingCode: '' }
      ]
    });

    console.log(`Found ${bookingsWithoutCode.length} bookings without codes`);

    if (bookingsWithoutCode.length === 0) {
      console.log('All bookings already have codes. Migration complete!');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    // Generate and assign codes
    for (const booking of bookingsWithoutCode) {
      try {
        // Generate unique code
        const bookingCode = await generateUniqueCode(
          CODE_PREFIXES.BOOKING,
          async (code) => {
            const existing = await Booking.findOne({ bookingCode: code });
            return !existing;
          }
        );

        // Update booking
        booking.bookingCode = bookingCode;
        await booking.save();

        successCount++;
        console.log(`✓ Updated booking ${booking._id}: ${bookingCode}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to update booking ${booking._id}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total bookings processed: ${bookingsWithoutCode.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log('========================\n');

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateBookingCodes();
