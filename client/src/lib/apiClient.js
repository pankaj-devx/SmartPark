import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Restore the auth token synchronously at module load time.
// This ensures the Authorization header is present on the very first request
// (e.g. GET /auth/me during bootstrapping) without waiting for a useEffect.
try {
  const stored = localStorage.getItem('smartpark_auth');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed?.token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
    }
  }
} catch {
  // localStorage unavailable (SSR, private browsing restrictions) — safe to ignore
}

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
