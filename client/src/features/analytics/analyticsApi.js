import { apiClient } from '../../lib/apiClient.js';

export async function fetchDriverAnalytics() {
  const response = await apiClient.get('/analytics/driver');
  return response.data.data;
}

export async function fetchOwnerAnalytics() {
  const response = await apiClient.get('/analytics/owner');
  return response.data.data;
}

export async function fetchAdminAnalytics() {
  const response = await apiClient.get('/analytics/admin');
  return response.data.data;
}
