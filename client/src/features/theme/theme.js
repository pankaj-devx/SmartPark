export const THEME_STORAGE_KEY = 'smartpark_theme';
export const themeOptions = ['light', 'dark', 'system'];

export function getStoredTheme() {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return themeOptions.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function getResolvedTheme(theme, prefersDark) {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return theme;
}

export function applyThemeToDocument(theme, prefersDark) {
  if (typeof document === 'undefined') {
    return getResolvedTheme(theme, prefersDark);
  }

  const resolvedTheme = getResolvedTheme(theme, prefersDark);
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');

  return resolvedTheme;
}
