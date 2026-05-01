/**
 * seedDefaultParkings.js
 * ----------------------
 * Auto-seeds the database with Bhopal-region parking data when the
 * Parking collection is empty.
 *
 * Called once after MongoDB connects — safe to run on every startup:
 *   - Checks document count first (single fast query)
 *   - Inserts only when count === 0
 *   - Creates a dedicated system owner if one doesn't exist
 *   - Never touches existing data
 */

import bcrypt from 'bcryptjs';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';

// ── System seed owner ────────────────────────────────────────────────────────
// A single internal owner account used only to satisfy the Parking.owner
// required field. Not exposed to end users.
const SEED_OWNER = {
  name: 'SmartPark System',
  email: 'system.seed@smartpark.internal',
  password: 'Seed@Internal99!',
  role: 'owner',
  ownerProfile: { businessName: 'SmartPark Demo Lots', businessType: 'company' }
};

// ── Bhopal-region seed data ──────────────────────────────────────────────────
// 10 listings spread across central Bhopal.
// Coordinates: [longitude, latitude] — GeoJSON / MongoDB convention.
// Centre reference: lat 23.2599, lng 77.4126 (MP Nagar, Bhopal)
function buildBhopalParkings(ownerId) {
  return [
    {
      title: 'MP Nagar Zone-I Parking',
      description:
        'Covered multi-level parking in the commercial heart of MP Nagar. CCTV monitored, 24/7 access, EV charging on Level 2.',
      address: 'Zone-I, MP Nagar, Bhopal',
      city: 'Bhopal',
      district: 'MP Nagar',
      area: 'Zone I',
      state: 'Madhya Pradesh',
      pincode: '462011',
      location: { type: 'Point', coordinates: [77.4126, 23.2599] },
      totalSlots: 120,
      availableSlots: 75,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 30,
      amenities: ['covered', 'cctv', 'security', 'ev charging'],
      parkingType: 'basement',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 88,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'DB Mall Surface Parking',
      description:
        'Open surface lot adjacent to DB Mall. Ideal for shoppers and cinema-goers. Attendant on duty during mall hours.',
      address: 'DB City Mall, Arera Hills, Bhopal',
      city: 'Bhopal',
      district: 'Arera Hills',
      area: 'DB Mall',
      state: 'Madhya Pradesh',
      pincode: '462016',
      location: { type: 'Point', coordinates: [77.4305, 23.2473] },
      totalSlots: 200,
      availableSlots: 130,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 20,
      amenities: ['cctv', 'security'],
      parkingType: 'open',
      isOpen24x7: false,
      operatingHours: { open: '10:00', close: '22:00' },
      popularityScore: 82,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'New Market Basement Parking',
      description:
        'Underground parking beneath New Market shopping district. Closest lot to the main retail strip. Pay-per-hour.',
      address: 'New Market, T.T. Nagar, Bhopal',
      city: 'Bhopal',
      district: 'T.T. Nagar',
      area: 'New Market',
      state: 'Madhya Pradesh',
      pincode: '462003',
      location: { type: 'Point', coordinates: [77.4001, 23.2330] },
      totalSlots: 80,
      availableSlots: 40,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 15,
      amenities: ['covered', 'cctv'],
      parkingType: 'basement',
      isOpen24x7: false,
      operatingHours: { open: '08:00', close: '22:00' },
      popularityScore: 74,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Habibganj Railway Station Parking',
      description:
        'Secure parking lot next to Rani Kamlapati (Habibganj) Railway Station. Perfect for travellers. 24-hour security.',
      address: 'Habibganj Railway Station Road, Bhopal',
      city: 'Bhopal',
      district: 'Habibganj',
      area: 'Railway Station',
      state: 'Madhya Pradesh',
      pincode: '462024',
      location: { type: 'Point', coordinates: [77.4389, 23.2295] },
      totalSlots: 150,
      availableSlots: 90,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 25,
      amenities: ['cctv', 'security'],
      parkingType: 'lot',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 79,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Bittan Market Covered Parking',
      description:
        'Covered parking facility in Bittan Market, Shymala Hills. Serves the upscale residential and dining area.',
      address: 'Bittan Market, Shymala Hills, Bhopal',
      city: 'Bhopal',
      district: 'Shymala Hills',
      area: 'Bittan Market',
      state: 'Madhya Pradesh',
      pincode: '462013',
      location: { type: 'Point', coordinates: [77.4210, 23.2680] },
      totalSlots: 60,
      availableSlots: 35,
      vehicleTypes: ['4-wheeler'],
      hourlyPrice: 40,
      amenities: ['covered', 'cctv', 'valet'],
      parkingType: 'covered',
      isOpen24x7: false,
      operatingHours: { open: '09:00', close: '23:00' },
      popularityScore: 65,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Roshanpura Square Parking',
      description:
        'Street-level parking at Roshanpura Square, a busy commercial junction. Quick in-and-out access.',
      address: 'Roshanpura Square, Bhopal',
      city: 'Bhopal',
      district: 'Roshanpura',
      area: 'Roshanpura Square',
      state: 'Madhya Pradesh',
      pincode: '462001',
      location: { type: 'Point', coordinates: [77.4072, 23.2615] },
      totalSlots: 40,
      availableSlots: 18,
      vehicleTypes: ['2-wheeler', '4-wheeler'],
      hourlyPrice: 10,
      amenities: ['cctv'],
      parkingType: 'street',
      isOpen24x7: false,
      operatingHours: { open: '07:00', close: '21:00' },
      popularityScore: 55,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Arera Colony E-5 Parking',
      description:
        'Gated parking compound in Arera Colony Sector E-5. Residential and visitor parking. Monthly passes available.',
      address: 'E-5, Arera Colony, Bhopal',
      city: 'Bhopal',
      district: 'Arera Colony',
      area: 'E-5',
      state: 'Madhya Pradesh',
      pincode: '462016',
      location: { type: 'Point', coordinates: [77.4450, 23.2190] },
      totalSlots: 50,
      availableSlots: 22,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 20,
      amenities: ['cctv', 'security'],
      parkingType: 'lot',
      isOpen24x7: false,
      operatingHours: { open: '06:00', close: '23:00' },
      popularityScore: 60,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Govindpura Industrial Parking',
      description:
        'Large open parking area serving Govindpura industrial zone. Suitable for heavy vehicles and staff cars.',
      address: 'Govindpura Industrial Area, Bhopal',
      city: 'Bhopal',
      district: 'Govindpura',
      area: 'Industrial Area',
      state: 'Madhya Pradesh',
      pincode: '462023',
      location: { type: 'Point', coordinates: [77.4700, 23.2750] },
      totalSlots: 300,
      availableSlots: 200,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 10,
      amenities: ['cctv', 'security'],
      parkingType: 'open',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 50,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Lalghati Bus Stand Parking',
      description:
        'Parking lot adjacent to Lalghati Bus Stand. Convenient for intercity travellers. Affordable hourly rates.',
      address: 'Lalghati Bus Stand, Bhopal',
      city: 'Bhopal',
      district: 'Lalghati',
      area: 'Bus Stand',
      state: 'Madhya Pradesh',
      pincode: '462030',
      location: { type: 'Point', coordinates: [77.3850, 23.2700] },
      totalSlots: 100,
      availableSlots: 60,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 15,
      amenities: ['cctv'],
      parkingType: 'lot',
      isOpen24x7: true,
      operatingHours: { open: '00:00', close: '23:59' },
      popularityScore: 68,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    },
    {
      title: 'Manasarovar Complex Parking',
      description:
        'Covered parking inside Manasarovar Complex. Serves government offices and nearby commercial establishments.',
      address: 'Manasarovar Complex, Shivaji Nagar, Bhopal',
      city: 'Bhopal',
      district: 'Shivaji Nagar',
      area: 'Manasarovar Complex',
      state: 'Madhya Pradesh',
      pincode: '462016',
      location: { type: 'Point', coordinates: [77.4180, 23.2540] },
      totalSlots: 90,
      availableSlots: 55,
      vehicleTypes: ['4-wheeler', '2-wheeler'],
      hourlyPrice: 20,
      amenities: ['covered', 'cctv', 'security', 'accessible'],
      parkingType: 'covered',
      isOpen24x7: false,
      operatingHours: { open: '08:00', close: '20:00' },
      popularityScore: 72,
      images: [],
      coverImage: {},
      imageCount: 0,
      owner: ownerId,
      verificationStatus: 'approved',
      isActive: true
    }
  ];
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Seed default Bhopal-region parking data when the collection is empty.
 *
 * Safe to call on every server startup:
 *   - Exits immediately if any parking documents already exist
 *   - Creates a system owner account if needed (idempotent via findOneAndUpdate)
 *   - Never modifies or deletes existing data
 *
 * @returns {Promise<void>}
 */
export async function seedDefaultParkings() {
  try {
    const count = await Parking.countDocuments();

    if (count > 0) {
      return; // DB already has data — nothing to do
    }

    console.log('[seed] Database is empty — seeding default Bhopal parking data…');

    // Ensure the system seed owner exists (upsert by email)
    const passwordHash = await bcrypt.hash(SEED_OWNER.password, 10);
    const owner = await User.findOneAndUpdate(
      { email: SEED_OWNER.email },
      {
        $setOnInsert: {
          name: SEED_OWNER.name,
          email: SEED_OWNER.email,
          passwordHash,
          role: SEED_OWNER.role,
          ownerProfile: SEED_OWNER.ownerProfile,
          status: 'active'
        }
      },
      { upsert: true, new: true }
    );

    const parkings = buildBhopalParkings(owner._id);
    await Parking.insertMany(parkings, { ordered: false });

    console.log(`[seed] Inserted ${parkings.length} default parking listings (Bhopal region).`);
  } catch (err) {
    // Non-fatal — log and continue. The app works fine without seed data.
    console.warn('[seed] seedDefaultParkings failed (non-fatal):', err.message);
  }
}
