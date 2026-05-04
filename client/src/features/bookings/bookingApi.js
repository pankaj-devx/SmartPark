import { apiClient } from '../../lib/apiClient.js';

export async function createBooking(payload) {
  const response = await apiClient.post('/bookings', payload);
  return response.data.data.booking;
}

export async function createPaymentOrder(payload) {
  const response = await apiClient.post('/payments/create-order', payload);
  return response.data.data;
}

export async function verifyPayment(payload) {
  const response = await apiClient.post('/payments/verify', payload);
  return response.data.data.booking;
}

export async function fetchMyBookings() {
  const response = await apiClient.get('/bookings/my-bookings');
  return response.data.data.bookings;
}

export async function cancelBooking(id) {
  const response = await apiClient.patch(`/bookings/${id}/cancel`);
  return response.data.data.booking;
}
