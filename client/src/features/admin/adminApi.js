import { apiClient } from '../../lib/apiClient.js';

export async function fetchAdminDashboard() {
  const response = await apiClient.get('/admin/dashboard');
  return response.data.data;
}

export async function approveAdminParking(id) {
  const response = await apiClient.patch(`/admin/parkings/${id}/approve`);
  return response.data.data.parking;
}

export async function rejectAdminParking(id, reason) {
  const response = await apiClient.patch(`/admin/parkings/${id}/reject`, { reason });
  return response.data.data.parking;
}

export async function toggleAdminParkingActive(id) {
  const response = await apiClient.patch(`/admin/parkings/${id}/toggle-active`);
  return response.data.data.parking;
}

export async function fetchAdminBookings(params = {}) {
  const response = await apiClient.get('/admin/bookings', { params });
  return response.data.data.bookings;
}

export async function fetchAdminUsers() {
  const response = await apiClient.get('/admin/users');
  return response.data.data.users;
}

export async function blockAdminUser(id) {
  const response = await apiClient.patch(`/admin/users/${id}/block`);
  return response.data.data.user;
}

export async function unblockAdminUser(id) {
  const response = await apiClient.patch(`/admin/users/${id}/unblock`);
  return response.data.data.user;
}

export async function deleteAdminParking(id) {
  const response = await apiClient.delete(`/admin/parkings/${id}`);
  return response.data.data;
}

export async function cancelAdminBooking(id) {
  const response = await apiClient.patch(`/admin/bookings/${id}/cancel`);
  return response.data.data.booking;
}

export async function verifyAdminBooking(bookingCode) {
  const response = await apiClient.post('/admin/bookings/verify', { bookingCode });
  return response.data.data.booking;
}
