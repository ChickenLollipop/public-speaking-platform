'use client';

import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User, SkillLevel } from '../types';

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

function mapSkillLevel(level: string): SkillLevel {
  const map: Record<string, SkillLevel> = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
  };
  return map[level] || 'beginner';
}

function mapUser(apiUser: any): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    creditBalance: apiUser.creditBalance,
    skillLevel: mapSkillLevel(apiUser.skillLevel),
    goals: apiUser.goals,
    createdAt: new Date(apiUser.createdAt),
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(mapUser(data.user));
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<void> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
        skillLevel: data.skillLevel.toUpperCase(),
        goals: data.goals,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || 'Signup failed');
    }

    localStorage.setItem('token', body.token);
    setUser(mapUser(body.user));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || 'Invalid email or password');
    }

    localStorage.setItem('token', body.token);
    setUser(mapUser(body.user));
  }, []);

  const logout = useCallback((): void => {
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const refreshUser = useCallback((): void => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(mapUser(data.user));
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      });
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
