import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
  apiClient.interceptors.request.use((config) => {
    console.debug('[api request]', config.method?.toUpperCase(), config.baseURL, config.url);
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.debug('[api response]', response.status, response.config.url, response.data);
      return response;
    },
    (error) => {
      console.debug('[api error]', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data
      });
      return Promise.reject(error);
    }
  );
}

export function setAuthToken(token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete apiClient.defaults.headers.common.Authorization;
}
