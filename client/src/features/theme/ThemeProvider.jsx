import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext.js';
import { applyThemeToDocument, getResolvedTheme, getStoredTheme } from './theme.js';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getStoredTheme());
  const [prefersDark, setPrefersDark] = useState(() => readPrefersDark());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setPrefersDark(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme, prefersDark);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('smartpark_theme', theme);
    } catch {
      // Ignore storage failures and keep the in-memory theme active.
    }
  }, [prefersDark, theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: getResolvedTheme(theme, prefersDark),
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((current) => (getResolvedTheme(current, prefersDark) === 'dark' ? 'light' : 'dark'))
    }),
    [prefersDark, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function readPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
