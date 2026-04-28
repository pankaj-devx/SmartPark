import { apiClient } from '../../lib/apiClient.js';

export async function fetchPublicParkings(params = {}) {
  const response = await apiClient.get('/parkings', { params });
  return response.data.data;
}

export async function fetchMyParkings() {
  const response = await apiClient.get('/parkings/mine');
  return response.data.data.parkings;
}

export async function createParking(payload) {
  const response = await apiClient.post('/parkings', payload);
  return response.data.data.parking;
}

export async function updateParking(id, payload) {
  const response = await apiClient.patch(`/parkings/${id}`, payload);
  return response.data.data.parking;
}

export async function deleteParking(id) {
  const response = await apiClient.delete(`/parkings/${id}`);
  return response.data.data.parking;
}

