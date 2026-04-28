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
