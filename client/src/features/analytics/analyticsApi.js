import { apiClient } from '../../lib/apiClient.js';

export async function fetchDriverAnalytics() {
  const response = await apiClient.get('/analytics/driver');
  return response.data.data;
}

export async function fetchOwnerAnalytics(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.dateRange) {
    params.append('dateRange', filters.dateRange);
  }
  if (filters.startDate && filters.endDate) {
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
  }
  if (filters.parkingId) {
    params.append('parkingId', filters.parkingId);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/analytics/owner?${queryString}` : '/analytics/owner';
  
  const response = await apiClient.get(url);
  return response.data.data;
}

export async function fetchAdminAnalytics() {
  const response = await apiClient.get('/analytics/admin');
  return response.data.data;
}
