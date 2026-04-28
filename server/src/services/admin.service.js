import { Booking } from '../models/booking.model.js';
import { Parking } from '../models/parking.model.js';
import { User } from '../models/user.model.js';
import { approveParking, rejectParking, serializeParking, toggleParkingActive } from './parking.service.js';
import { listAllBookings } from './booking.service.js';

export async function getAdminDashboard(deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const BookingModel = deps.BookingModel ?? Booking;
  const UserModel = deps.UserModel ?? User;

  const [pendingApprovals, approvedListings, rejectedListings, totalBookings, totalUsers, parkings] =
    await Promise.all([
      ParkingModel.countDocuments({ verificationStatus: 'pending' }),
      ParkingModel.countDocuments({ verificationStatus: 'approved' }),
      ParkingModel.countDocuments({ verificationStatus: 'rejected' }),
      BookingModel.countDocuments({}),
      UserModel.countDocuments({}),
      ParkingModel.find({}).sort({ createdAt: -1, _id: 1 }).lean()
    ]);

  return {
    summary: {
      pendingApprovals,
      approvedListings,
      rejectedListings,
      totalBookings,
      totalUsers
    },
    parkings: groupParkingsByStatus(parkings.map(serializeParking))
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
  return listAllBookings(query, deps);
}

function groupParkingsByStatus(parkings) {
  return {
    pending: parkings.filter((parking) => parking.verificationStatus === 'pending'),
    approved: parkings.filter((parking) => parking.verificationStatus === 'approved'),
    rejected: parkings.filter((parking) => parking.verificationStatus === 'rejected')
  };
}
