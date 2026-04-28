import { useEffect, useMemo, useState } from 'react';
import { apiClient, clearAuthToken, setAuthToken } from '../../lib/apiClient.js';
import { AuthContext } from './AuthContext.js';

const STORAGE_KEY = 'smartpark_auth';

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(auth.token));

  useEffect(() => {
    if (auth.token) {
      setAuthToken(auth.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      clearAuthToken();
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!auth.token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');

        if (isMounted) {
          setAuth((current) => ({
            ...current,
            user: response.data.data.user
          }));
        }
      } catch {
        if (isMounted) {
          setAuth({ user: null, token: null });
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [auth.token]);

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAuthenticated: Boolean(auth.token && auth.user),
      isBootstrapping,
      login(authData) {
        setAuth(authData);
      },
      updateUser(user) {
        setAuth((current) => ({
          ...current,
          user
        }));
      },
      logout() {
        setAuth({ user: null, token: null });
      }
    }),
    [auth, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
