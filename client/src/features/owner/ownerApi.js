import { apiClient } from '../../lib/apiClient.js';

export async function fetchOwnerBookings(params = {}) {
  const response = await apiClient.get('/owner/bookings', { params });
  return response.data.data;
}

export async function completeOwnerBooking(id) {
  const response = await apiClient.patch(`/owner/bookings/${id}/complete`);
  return response.data.data.booking;
}

export async function verifyOwnerBooking(bookingCode) {
  const response = await apiClient.post('/owner/bookings/verify', { bookingCode });
  return response.data.data.booking;
}
