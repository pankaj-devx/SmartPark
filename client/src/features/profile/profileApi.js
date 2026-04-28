import { apiClient } from '../../lib/apiClient.js';

export async function updateMyProfile(payload) {
  const response = await apiClient.patch('/auth/me', payload);
  return response.data.data.user;
}

export async function updateMyPassword(payload) {
  const response = await apiClient.patch('/auth/me/password', payload);
  return response.data.data.user;
}
