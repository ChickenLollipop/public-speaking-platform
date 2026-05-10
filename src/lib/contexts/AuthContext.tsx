'use client';

import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User, SkillLevel } from '../types';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signup: (data: SignupData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const signup = useCallback(async (data: SignupData): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if user already exists
    const existingUsers = localStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];

    if (users.find((u: any) => u.email === data.email)) {
      throw new Error('User with this email already exists');
    }

    // Hash password before storing
    const passwordHash = await hashPassword(data.password);

    // Create new user with 50 initial credits
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      creditBalance: 50,
      skillLevel: data.skillLevel as SkillLevel,
      createdAt: new Date(),
    };

    // Store user credentials for login with hashed password
    const userCredentials = {
      email: data.email,
      password: passwordHash,
      userId: newUser.id,
    };

    users.push(userCredentials);
    localStorage.setItem('users', JSON.stringify(users));

    // Store user data for future logins
    const allStoredUsers = localStorage.getItem('allUsers');
    const allUsers = allStoredUsers ? JSON.parse(allStoredUsers) : {};
    allUsers[newUser.id] = newUser;
    localStorage.setItem('allUsers', JSON.stringify(allUsers));

    setUser(newUser);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Hash password for comparison
    const passwordHash = await hashPassword(password);

    const existingUsers = localStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];

    const userCredentials = users.find(
      (u: any) => u.email === email && u.password === passwordHash
    );

    if (!userCredentials) {
      throw new Error('Invalid email or password');
    }

    // Retrieve user data from stored users list
    const allStoredUsers = localStorage.getItem('allUsers');
    const allUsers = allStoredUsers ? JSON.parse(allStoredUsers) : {};

    let userData: User;

    // Check if we have stored data for this user
    if (allUsers[userCredentials.userId]) {
      userData = allUsers[userCredentials.userId];
    } else {
      // Create new user data - try to get name from signup or use email prefix
      const storedUser = localStorage.getItem('user');
      let storedName = email.split('@')[0];

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id === userCredentials.userId && parsed.name) {
            storedName = parsed.name;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      userData = {
        id: userCredentials.userId,
        name: storedName,
        email: userCredentials.email,
        creditBalance: 50,
        skillLevel: 'beginner' as SkillLevel,
        createdAt: new Date(),
      };

      // Store user data for future logins
      allUsers[userCredentials.userId] = userData;
      localStorage.setItem('allUsers', JSON.stringify(allUsers));
    }

    setUser(userData);
  }, []);

  const logout = useCallback((): void => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const refreshUser = useCallback((): void => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signup,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, signup, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
