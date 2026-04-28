import { apiClient } from '../../lib/apiClient.js';

export async function fetchPublicParkings(params = {}) {
  const response = await apiClient.get('/parkings', { params });
  return response.data.data;
}

export async function fetchNearbyParkings(params = {}) {
  const response = await apiClient.get('/parkings/nearby', { params });
  return response.data.data;
}

export async function fetchParkingById(id) {
  const response = await apiClient.get(`/parkings/${id}`);
  return response.data.data.parking;
}

export async function fetchSearchSuggestions(q) {
  const response = await apiClient.get('/search/suggestions', { params: { q } });
  return response.data.data.suggestions;
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

export async function uploadParkingImages(id, files, onUploadProgress) {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const response = await apiClient.post(`/parkings/${id}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress
  });

  return response.data.data.parking;
}

export async function deleteParkingImage(id, imageId) {
  const response = await apiClient.delete(`/parkings/${id}/images/${imageId}`);
  return response.data.data.parking;
}

export async function setPrimaryParkingImage(id, imageId) {
  const response = await apiClient.patch(`/parkings/${id}/images/primary`, { imageId });
  return response.data.data.parking;
}

export async function deleteParking(id) {
  const response = await apiClient.delete(`/parkings/${id}`);
  return response.data.data.parking;
}
