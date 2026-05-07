'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signup: (data: SignupData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateCredits: (newCredits: number) => void;
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

  const signup = async (data: SignupData): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if user already exists
    const existingUsers = localStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];

    if (users.find((u: any) => u.email === data.email)) {
      throw new Error('User with this email already exists');
    }

    // Create new user with 50 initial credits
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: data.name,
      email: data.email,
      credits: 50,
    };

    // Store user credentials for login
    const userCredentials = {
      email: data.email,
      password: data.password,
      userId: newUser.id,
    };

    users.push(userCredentials);
    localStorage.setItem('users', JSON.stringify(users));

    setUser(newUser);
  };

  const login = async (email: string, password: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingUsers = localStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];

    const userCredentials = users.find(
      (u: any) => u.email === email && u.password === password
    );

    if (!userCredentials) {
      throw new Error('Invalid email or password');
    }

    // Retrieve or create user data
    const storedUser = localStorage.getItem('user');
    let userData: User;

    if (storedUser) {
      userData = JSON.parse(storedUser);
      // Verify it's the same user
      if (userData.id !== userCredentials.userId) {
        // Different user, create new session
        userData = {
          id: userCredentials.userId,
          name: email.split('@')[0], // Use email prefix as fallback name
          email: userCredentials.email,
          credits: 50,
        };
      }
    } else {
      userData = {
        id: userCredentials.userId,
        name: email.split('@')[0],
        email: userCredentials.email,
        credits: 50,
      };
    }

    setUser(userData);
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateCredits = (newCredits: number): void => {
    if (user) {
      setUser({ ...user, credits: newCredits });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signup,
    login,
    logout,
    updateCredits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
