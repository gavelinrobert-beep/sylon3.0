/**
 * SYLON Field App - Theme Service
 * Handles dark mode and theme preferences
 */

import * as offlineStorage from './offline-storage';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'sylon_theme';

// Get current theme preference
export async function getTheme(): Promise<Theme> {
  const theme = await offlineStorage.getSetting<Theme>(THEME_KEY);
  return theme || 'system';
}

// Set theme preference
export async function setTheme(theme: Theme): Promise<void> {
  await offlineStorage.setSetting(THEME_KEY, theme);
  applyTheme(theme);
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  let effectiveTheme: 'light' | 'dark';
  
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  } else {
    effectiveTheme = theme;
  }
  
  root.setAttribute('data-theme', effectiveTheme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0f172a' : '#ffffff');
  }
}

// Initialize theme on app load
export async function initializeTheme(): Promise<void> {
  const theme = await getTheme();
  applyTheme(theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const currentTheme = await getTheme();
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}
