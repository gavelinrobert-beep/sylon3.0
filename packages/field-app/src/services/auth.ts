/**
 * SYLON Field App - Authentication Service
 * Handles JWT token management and device-level login
 */

import * as offlineStorage from './offline-storage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'dispatcher' | 'supervisor' | 'operator' | 'driver';
  companyId: string;
  companyName: string;
  assignedResourceId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceId: string;
}

// Storage keys
const AUTH_STORAGE_KEY = 'sylon_auth_state';
const DEVICE_ID_KEY = 'sylon_device_id';

// Generate unique device ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get stored auth state
export async function getAuthState(): Promise<AuthState> {
  try {
    const stored = await offlineStorage.getSetting<AuthState>(AUTH_STORAGE_KEY);
    if (stored && stored.accessToken) {
      // Check if token is expired
      if (stored.expiresAt && stored.expiresAt < Date.now()) {
        // Token expired, try to refresh
        if (stored.refreshToken) {
          const refreshed = await refreshTokens(stored.refreshToken);
          if (refreshed) {
            return refreshed;
          }
        }
        // Refresh failed, clear auth
        await clearAuthState();
        return getDefaultAuthState();
      }
      return stored;
    }
  } catch (error) {
    console.error('Failed to get auth state:', error);
  }
  return getDefaultAuthState();
}

function getDefaultAuthState(): AuthState {
  return {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  };
}

// Save auth state
export async function saveAuthState(state: AuthState): Promise<void> {
  await offlineStorage.setSetting(AUTH_STORAGE_KEY, state);
}

// Clear auth state
export async function clearAuthState(): Promise<void> {
  await offlineStorage.setSetting(AUTH_STORAGE_KEY, getDefaultAuthState());
}

// Login
export async function login(credentials: LoginCredentials): Promise<AuthState> {
  // For demo purposes, accept any login with demo credentials
  // In production, this would call the actual API
  if (credentials.email === 'demo@sylon.se' || credentials.email === 'demo') {
    const demoUser: AuthUser = {
      id: 'user-demo-001',
      email: 'demo@sylon.se',
      firstName: 'Demo',
      lastName: 'Förare',
      role: 'driver',
      companyId: 'demo-company-001',
      companyName: 'SYLON Demo Contractors AB',
      assignedResourceId: 'res-plow-1',
    };

    const state: AuthState = {
      isAuthenticated: true,
      user: demoUser,
      accessToken: `demo-token-${Date.now()}`,
      refreshToken: `demo-refresh-${Date.now()}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    await saveAuthState(state);
    return state;
  }

  // Try actual API login
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const data = await response.json();
      const state: AuthState = {
        isAuthenticated: true,
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
      };
      await saveAuthState(state);
      return state;
    }
  } catch (error) {
    console.error('Login API error:', error);
  }

  throw new Error('Inloggning misslyckades. Kontrollera dina uppgifter.');
}

// Refresh tokens
async function refreshTokens(refreshToken: string): Promise<AuthState | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      const currentState = await getAuthState();
      const newState: AuthState = {
        ...currentState,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || currentState.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
      };
      await saveAuthState(newState);
      return newState;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
  }
  return null;
}

// Logout
export async function logout(): Promise<void> {
  const state = await getAuthState();
  
  if (state.accessToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.accessToken}`,
        },
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }

  await clearAuthState();
}

// Get authorization header
export async function getAuthHeader(): Promise<Record<string, string>> {
  const state = await getAuthState();
  if (state.accessToken) {
    return { 'Authorization': `Bearer ${state.accessToken}` };
  }
  return {};
}
