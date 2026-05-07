/**
 * localStorage utilities for persisting user data and presentations
 * SSR-safe with typeof window checks
 */

import { User, Presentation, AuthToken } from '../types';

const STORAGE_KEYS = {
  USER: 'psp_user',
  AUTH_TOKEN: 'psp_auth_token',
  PRESENTATIONS: 'psp_presentations',
} as const;

/**
 * Check if we're in a browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

// Simple locking mechanism to prevent race conditions in read-modify-write operations
let presentationsLock = false;
const lockQueue: Array<() => void> = [];

/**
 * Acquire lock for presentations operations
 */
const acquireLock = async (): Promise<void> => {
  return new Promise((resolve) => {
    if (!presentationsLock) {
      presentationsLock = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
};

/**
 * Release lock and process queue
 */
const releaseLock = (): void => {
  const next = lockQueue.shift();
  if (next) {
    next();
  } else {
    presentationsLock = false;
  }
};

// ============================================================================
// User Storage
// ============================================================================

export const getUserFromStorage = (): User | null => {
  if (!isBrowser()) return null;

  try {
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userJson) return null;

    const user = JSON.parse(userJson);
    // Convert date strings back to Date objects
    user.createdAt = new Date(user.createdAt);
    return user as User;
  } catch (error) {
    console.error('Error reading user from storage:', error);
    return null;
  }
};

export const saveUserToStorage = (user: User): void => {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

export const removeUserFromStorage = (): void => {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Error removing user from storage:', error);
  }
};

// ============================================================================
// Auth Token Storage
// ============================================================================

export const getAuthToken = (): AuthToken | null => {
  if (!isBrowser()) return null;

  try {
    const tokenJson = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!tokenJson) return null;

    const authToken = JSON.parse(tokenJson);
    authToken.expiresAt = new Date(authToken.expiresAt);

    // Check if token is expired
    if (authToken.expiresAt < new Date()) {
      removeAuthToken();
      return null;
    }

    return authToken as AuthToken;
  } catch (error) {
    console.error('Error reading auth token from storage:', error);
    return null;
  }
};

export const saveAuthToken = (token: string, expiresAt: Date): void => {
  if (!isBrowser()) return;

  try {
    const authToken: AuthToken = { token, expiresAt };
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(authToken));
  } catch (error) {
    console.error('Error saving auth token to storage:', error);
  }
};

export const removeAuthToken = (): void => {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error removing auth token from storage:', error);
  }
};

// ============================================================================
// Presentations Storage
// ============================================================================

export const getPresentationsFromStorage = (): Presentation[] => {
  if (!isBrowser()) return [];

  try {
    const presentationsJson = localStorage.getItem(STORAGE_KEYS.PRESENTATIONS);
    if (!presentationsJson) return [];

    const presentations = JSON.parse(presentationsJson);
    // Convert date strings back to Date objects
    return presentations.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
    })) as Presentation[];
  } catch (error) {
    console.error('Error reading presentations from storage:', error);
    return [];
  }
};

export const savePresentationToStorage = async (presentation: Presentation): Promise<void> => {
  if (!isBrowser()) return;

  await acquireLock();
  try {
    const presentations = getPresentationsFromStorage();
    const existingIndex = presentations.findIndex((p) => p.id === presentation.id);

    if (existingIndex >= 0) {
      // Update existing presentation
      presentations[existingIndex] = {
        ...presentation,
        updatedAt: new Date(),
      };
    } else {
      // Add new presentation
      presentations.push(presentation);
    }

    localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(presentations));
  } catch (error) {
    console.error('Error saving presentation to storage:', error);
  } finally {
    releaseLock();
  }
};

export const getPresentationById = (id: string): Presentation | null => {
  if (!isBrowser()) return null;

  try {
    const presentations = getPresentationsFromStorage();
    return presentations.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('Error getting presentation by id:', error);
    return null;
  }
};

export const updatePresentationStatus = async (
  id: string,
  status: Presentation['status']
): Promise<void> => {
  if (!isBrowser()) return;

  await acquireLock();
  try {
    const presentations = getPresentationsFromStorage();
    const presentation = presentations.find((p) => p.id === id);

    if (presentation) {
      presentation.status = status;
      presentation.updatedAt = new Date();
      localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(presentations));
    }
  } catch (error) {
    console.error('Error updating presentation status:', error);
  } finally {
    releaseLock();
  }
};

export const deletePresentationFromStorage = async (id: string): Promise<void> => {
  if (!isBrowser()) return;

  await acquireLock();
  try {
    const presentations = getPresentationsFromStorage();
    const filtered = presentations.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting presentation from storage:', error);
  } finally {
    releaseLock();
  }
};
