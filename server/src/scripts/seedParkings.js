/**
 * seedParkings.js
 * ---------------
 * Seed script for Phase 7A — Geospatial Support.
 *
 * Creates:
 *   - 3 owner accounts (if they don't already exist)
 *   - 12 parking listings spread across 4 Indian cities,
 *     each with real-world coordinates so the /nearby endpoint
 *     can be tested immediately.
 *
 * Usage:
 *   node server/src/scripts/seedParkings.js
 *
 * Options (environment variables):
 *   SEED_CLEAR=true   — drop existing parkings + seed users before inserting
 *   MONGODB_URI       — override the default connection string
 *
 * The script is idempotent when SEED_CLEAR is not set: it skips
 * parkings whose title already exists in the database.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';

// ---------------------------------------------------------------------------
// Seed owners
// ---------------------------------------------------------------------------
// Three fictional parking owners. Passwords are hashed with bcrypt (cost 10).
// ---------------------------------------------------------------------------
const SEED_OWNERS = [
  {
    name: 'Ravi Kumar',
    email: 'ravi.owner@smartpark.dev',
    password: 'Owner@1234',
    role: 'owner',
    ownerProfile: { businessName: 'Ravi Parking Solutions', businessType: 'individual' }
  },
  {
    name: 'Priya Sharma',
    email: 'priya.owner@smartpark.dev',
    password: 'Owner@1234',
    role: 'owner',
    ownerProfile: { businessName: 'Sharma Parking Pvt Ltd', businessType: 'company' }
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.owner@smartpark.dev',
    password: 'Owner@1234',
    role: 'owner',
    ownerProfile: { businessName: 'Mehta Urban Parking', businessType: 'company' }
  }
];

// ---------------------------------------------------------------------------
// Seed parkings
// ---------------------------------------------------------------------------
// 12 listings across Mumbai, Bengaluru, Delhi, and Hyderabad.
// Each entry uses real-world coordinates so $geoNear queries work correctly.
//
// Coordinate format: [longitude, latitude]  ← GeoJSON / MongoDB convention
// ---------------------------------------------------------------------------
function buildSeedParkings(ownerIds) {
  const [owner1, owner2, owner3] = ownerIds;

  return [
    // ── Mumbai ──────────────────────────────────────────────────────────────
    {
      title: 'Bandra Kurla Complex Parking',
      description:
        'Secure multi-level parking in the heart of BKC. Ideal for corporate visitors and daily commuters. CCTV monitored 24/7.',
      address: 'Plot C-68, G Block, Bandra Kurla Complex',
      city: 'Mumbai',
      district: 'Bandra',
      area: 'BKC',
      state: 'Maharashtra',
      pincode: '400051',
      // GeoJSON: [longitude, latitude]
      location: { type: 'Point', coordinates: [72.8656, 19.0596] },
      totalSlots: 120,
      availableSlots: 80,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 60,
      amenities: ['covered', 'cctv', 'security', 'ev charging'],
      parkingType: 'basement',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 85,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner1,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Andheri West Station Parking',
      description:
        'Open-air parking lot adjacent to Andheri railway station. Perfect for commuters. Easy entry and exit.',
      address: 'Station Road, Andheri West',
      city: 'Mumbai',
      district: 'Andheri',
      area: 'Andheri West',
      state: 'Maharashtra',
      pincode: '400058',
      location: { type: 'Point', coordinates: [72.8369, 19.1197] },
      totalSlots: 60,
      availableSlots: 25,
      vehicleTypes: ['2-wheeler', '4-wheeler'],
      hourlyPrice: 30,
      amenities: ['cctv', 'security'],
      parkingType: 'open',
      isOpen24x7: false,
      operatingHours: { open: '06:00', close: '23:00' },
      popularityScore: 70,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner1,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Powai Lake View Parking',
      description:
        'Covered parking near Powai Lake. Serves Hiranandani Gardens residents and visitors. Valet available on weekends.',
      address: 'Hiranandani Gardens, Powai',
      city: 'Mumbai',
      district: 'Powai',
      area: 'Hiranandani Gardens',
      state: 'Maharashtra',
      pincode: '400076',
      location: { type: 'Point', coordinates: [72.9081, 19.1176] },
      totalSlots: 45,
      availableSlots: 20,
      vehicleTypes: ['4-wheeler'],
      hourlyPrice: 50,
      amenities: ['covered', 'cctv', 'valet', 'security'],
      parkingType: 'covered',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 60,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner2,
      verificationStatus: 'approved',
      isActive: true
    },

    // ── Bengaluru ────────────────────────────────────────────────────────────
    {
      title: 'Koramangala Forum Mall Parking',
      description:
        'Basement parking below Forum Mall, Koramangala. Spacious bays, EV charging stations, and 24-hour security.',
      address: '21, Hosur Road, Koramangala',
      city: 'Bengaluru',
      district: 'Koramangala',
      area: 'Forum Mall',
      state: 'Karnataka',
      pincode: '560095',
      location: { type: 'Point', coordinates: [77.6101, 12.9352] },
      totalSlots: 200,
      availableSlots: 140,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 40,
      amenities: ['covered', 'cctv', 'ev charging', 'security', 'accessible'],
      parkingType: 'basement',
      isOpen24x7: false,
      operatingHours: { open: '09:00', close: '22:00' },
      popularityScore: 90,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner2,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Indiranagar 100 Feet Road Parking',
      description:
        'Street-level parking on 100 Feet Road, Indiranagar. Close to restaurants, pubs, and shopping. Pay-per-hour.',
      address: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      district: 'Indiranagar',
      area: '100 Feet Road',
      state: 'Karnataka',
      pincode: '560038',
      location: { type: 'Point', coordinates: [77.6408, 12.9784] },
      totalSlots: 30,
      availableSlots: 10,
      vehicleTypes: ['2-wheeler', '4-wheeler'],
      hourlyPrice: 20,
      amenities: ['cctv'],
      parkingType: 'street',
      isOpen24x7: false,
      operatingHours: { open: '08:00', close: '23:59' },
      popularityScore: 55,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner3,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Whitefield IT Park Parking',
      description:
        'Large open parking lot serving the Whitefield IT corridor. Monthly passes available. Shuttle to ITPL gate.',
      address: 'ITPL Main Road, Whitefield',
      city: 'Bengaluru',
      district: 'Whitefield',
      area: 'ITPL',
      state: 'Karnataka',
      pincode: '560066',
      location: { type: 'Point', coordinates: [77.7480, 12.9698] },
      totalSlots: 300,
      availableSlots: 180,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 25,
      amenities: ['cctv', 'security'],
      parkingType: 'lot',
      isOpen24x7: false,
      operatingHours: { open: '07:00', close: '22:00' },
      popularityScore: 75,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner3,
      verificationStatus: 'approved',
      isActive: true
    },

    // ── Delhi ────────────────────────────────────────────────────────────────
    {
      title: 'Connaught Place Underground Parking',
      description:
        'Multi-level underground parking in the iconic Connaught Place. Centrally located, close to metro. Fully covered.',
      address: 'Block A, Connaught Place',
      city: 'Delhi',
      district: 'New Delhi',
      area: 'Connaught Place',
      state: 'Delhi',
      pincode: '110001',
      location: { type: 'Point', coordinates: [77.2167, 28.6315] },
      totalSlots: 250,
      availableSlots: 100,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 50,
      amenities: ['covered', 'cctv', 'security', 'accessible'],
      parkingType: 'basement',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 95,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner1,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Lajpat Nagar Market Parking',
      description:
        'Open parking lot behind Lajpat Nagar Central Market. Convenient for shoppers. Attendant on duty.',
      address: 'Central Market, Lajpat Nagar II',
      city: 'Delhi',
      district: 'South Delhi',
      area: 'Lajpat Nagar',
      state: 'Delhi',
      pincode: '110024',
      location: { type: 'Point', coordinates: [77.2373, 28.5672] },
      totalSlots: 80,
      availableSlots: 35,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 30,
      amenities: ['cctv', 'security'],
      parkingType: 'open',
      isOpen24x7: false,
      operatingHours: { open: '09:00', close: '21:00' },
      popularityScore: 65,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner2,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Saket Select City Walk Parking',
      description:
        'Covered parking garage attached to Select City Walk mall. EV charging bays on Level 2. Valet service available.',
      address: 'A-3, District Centre, Saket',
      city: 'Delhi',
      district: 'South Delhi',
      area: 'Saket',
      state: 'Delhi',
      pincode: '110017',
      location: { type: 'Point', coordinates: [77.2167, 28.5274] },
      totalSlots: 400,
      availableSlots: 220,
      vehicleTypes: ['4-wheeler'],
      hourlyPrice: 60,
      amenities: ['covered', 'cctv', 'ev charging', 'valet', 'security', 'accessible'],
      parkingType: 'garage',
      isOpen24x7: false,
      operatingHours: { open: '10:00', close: '22:00' },
      popularityScore: 88,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner3,
      verificationStatus: 'approved',
      isActive: true
    },

    // ── Hyderabad ────────────────────────────────────────────────────────────
    {
      title: 'HITEC City Cyber Towers Parking',
      description:
        'Dedicated parking for Cyber Towers, HITEC City. Serves IT professionals. 24/7 access with RFID entry.',
      address: 'Cyber Towers, HITEC City',
      city: 'Hyderabad',
      district: 'Madhapur',
      area: 'HITEC City',
      state: 'Telangana',
      pincode: '500081',
      location: { type: 'Point', coordinates: [78.3741, 17.4435] },
      totalSlots: 500,
      availableSlots: 300,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 35,
      amenities: ['covered', 'cctv', 'security', 'ev charging'],
      parkingType: 'basement',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 92,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner1,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Banjara Hills Road No. 12 Parking',
      description:
        'Open parking near the popular restaurant strip on Road No. 12, Banjara Hills. Ideal for evening outings.',
      address: 'Road No. 12, Banjara Hills',
      city: 'Hyderabad',
      district: 'Banjara Hills',
      area: 'Road No. 12',
      state: 'Telangana',
      pincode: '500034',
      location: { type: 'Point', coordinates: [78.4483, 17.4239] },
      totalSlots: 50,
      availableSlots: 20,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 20,
      amenities: ['cctv'],
      parkingType: 'open',
      isOpen24x7: false,
      operatingHours: { open: '11:00', close: '23:59' },
      popularityScore: 58,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner2,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Gachibowli Stadium Parking',
      description:
        'Large surface parking adjacent to Gachibowli Indoor Stadium. Great for events and daily IT park commuters.',
      address: 'Gachibowli Indoor Stadium Road',
      city: 'Hyderabad',
      district: 'Gachibowli',
      area: 'Stadium',
      state: 'Telangana',
      pincode: '500032',
      location: { type: 'Point', coordinates: [78.3496, 17.4401] },
      totalSlots: 150,
      availableSlots: 90,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 15,
      amenities: ['cctv', 'security'],
      parkingType: 'lot',
      isOpen24x7: false,
      operatingHours: { open: '06:00', close: '22:00' },
      popularityScore: 72,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: owner3,
      verificationStatus: 'approved',
      isActive: true
    }
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertOwner(ownerData) {
  const existing = await User.findOne({ email: ownerData.email });

  if (existing) {
    console.log(`  ↳ Owner already exists: ${ownerData.email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(ownerData.password, 10);
  const user = await User.create({
    name: ownerData.name,
    email: ownerData.email,
    passwordHash,
    role: ownerData.role,
    ownerProfile: ownerData.ownerProfile,
    status: 'active'
  });

  console.log(`  ↳ Created owner: ${ownerData.email}`);
  return user;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  const shouldClear = process.env.SEED_CLEAR === 'true';

  console.log('\n🌱  SmartPark — Geospatial Seed Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   MongoDB URI : ${env.MONGODB_URI}`);
  console.log(`   Clear first : ${shouldClear}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Connect to MongoDB
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  // 2. Optionally clear existing seed data
  if (shouldClear) {
    const emails = SEED_OWNERS.map((o) => o.email);
    const owners = await User.find({ email: { $in: emails } });
    const ownerIds = owners.map((o) => o._id);

    const deletedParkings = await Parking.deleteMany({ owner: { $in: ownerIds } });
    const deletedUsers = await User.deleteMany({ email: { $in: emails } });

    console.log(`🗑️   Cleared ${deletedParkings.deletedCount} parkings and ${deletedUsers.deletedCount} seed owners\n`);
  }

  // 3. Upsert owners
  console.log('👤  Upserting seed owners…');
  const owners = await Promise.all(SEED_OWNERS.map(upsertOwner));
  const ownerIds = owners.map((o) => o._id);
  console.log();

  // 4. Insert parkings (skip titles that already exist)
  console.log('🅿️   Inserting seed parkings…');
  const seedData = buildSeedParkings(ownerIds);
  let inserted = 0;
  let skipped = 0;

  for (const data of seedData) {
    const exists = await Parking.findOne({ title: data.title });

    if (exists) {
      console.log(`  ↳ Skipped (already exists): ${data.title}`);
      skipped++;
      continue;
    }

    await Parking.create(data);
    console.log(`  ↳ Created: ${data.title} [${data.location.coordinates}]`);
    inserted++;
  }

  console.log(`\n✅  Done — inserted ${inserted}, skipped ${skipped} parkings\n`);

  // 5. Disconnect
  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB\n');
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
