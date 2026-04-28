import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import { approveParking, rejectParking, serializeParking, toggleParkingActive } from './parking.service.js';

export async function getAdminDashboard(deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const BookingModel = deps.BookingModel ?? Booking;
  const UserModel = deps.UserModel ?? User;

  const [pendingApprovals, approvedListings, rejectedListings, totalBookings, totalUsers, parkings, users] =
    await Promise.all([
      ParkingModel.countDocuments({ verificationStatus: 'pending' }),
      ParkingModel.countDocuments({ verificationStatus: 'approved' }),
      ParkingModel.countDocuments({ verificationStatus: 'rejected' }),
      BookingModel.countDocuments({}),
      UserModel.countDocuments({}),
      ParkingModel.find({}).sort({ createdAt: -1, _id: 1 }).lean(),
      resolveAdminUsers(UserModel)
    ]);
  const serializedParkings = parkings.map(serializeParking);

  return {
    summary: {
      pendingApprovals,
      approvedListings,
      rejectedListings,
      totalBookings,
      totalUsers,
      inactiveListings: serializedParkings.filter((parking) => !parking.isActive).length
    },
    parkings: groupParkingsByStatus(serializedParkings),
    users,
    userMetrics: {
      drivers: users.filter((user) => user.role === 'driver').length,
      owners: users.filter((user) => user.role === 'owner').length,
      admins: users.filter((user) => user.role === 'admin').length,
      suspended: users.filter((user) => user.status === 'suspended').length
    }
  };
}

export async function listAdminParkings(deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parkings = await ParkingModel.find({}).sort({ createdAt: -1, _id: 1 }).lean();

  return groupParkingsByStatus(parkings.map(serializeParking));
}

export async function approveAdminParking(id, deps = {}) {
  return approveParking(id, deps);
}

export async function rejectAdminParking(id, reason, deps = {}) {
  return rejectParking(id, reason, deps);
}

export async function toggleAdminParkingActive(id, deps = {}) {
  return toggleParkingActive(id, deps);
}

export async function listAdminBookings(query = {}, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.parking) {
    filter.parking = query.parking;
  }

  if (query.user) {
    filter.user = query.user;
  }

  let bookingsQuery = BookingModel.find(filter);

  if (typeof bookingsQuery.populate === 'function') {
    bookingsQuery = bookingsQuery
      .populate('user', 'name email role')
      .populate('parking', 'title city state');
  }

  const bookings = await bookingsQuery.sort({ createdAt: -1, _id: 1 }).lean();

  return bookings.map(serializeAdminBooking);
}

function groupParkingsByStatus(parkings) {
  return {
    pending: parkings.filter((parking) => parking.verificationStatus === 'pending'),
    approved: parkings.filter((parking) => parking.verificationStatus === 'approved'),
    rejected: parkings.filter((parking) => parking.verificationStatus === 'rejected')
  };
}

async function resolveAdminUsers(UserModel) {
  if (typeof UserModel.find !== 'function') {
    return [];
  }

  const query = UserModel.find({});
  const users = typeof query.sort === 'function' ? await query.sort({ createdAt: -1, _id: 1 }).lean() : await query;

  return users.map(serializeAdminUser);
}

function serializeAdminUser(user) {
  return {
    id: user._id?.toString?.() ?? user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? '',
    status: user.status,
    createdAt: user.createdAt
  };
}

function serializeAdminBooking(booking) {
  return {
    id: booking._id?.toString?.() ?? booking.id,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}
