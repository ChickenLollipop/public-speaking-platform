/**
 * Core type definitions for the public speaking platform
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type PresentationType = 'pitch' | 'lecture' | 'speech' | 'demo' | 'other';
export type PresentationVisibility = 'private' | 'community';
export type PresentationStatus = 'draft' | 'analyzing' | 'analyzed' | 'failed';

export interface User {
  id: string;
  email: string;
  name: string;
  creditBalance: number;
  skillLevel: SkillLevel;
  goals?: string[];
  createdAt: Date;
}

export interface Presentation {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: PresentationType;
  videoUrl?: string; // S3 URL in production, blob URL in Phase 1
  scriptText?: string; // Text script for text-based presentations
  duration?: number; // in seconds
  visibility: PresentationVisibility;
  status: PresentationStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DeliveryMetrics {
  pace_wpm: number; // words per minute
  filler_word_count: number;
  filler_words_list: Array<{ word: string; count: number }>;
  avg_volume: number; // 0-100
  pause_count: number;
  eye_contact_score: number; // 0-100
}

export interface ContentAnalysis {
  has_intro: boolean;
  has_conclusion: boolean;
  structure_score: number; // 0-100
  clarity_feedback: string;
  persuasiveness_score: number; // 0-100
  weak_transitions: string[];
  improvement_suggestions: string[];
}

export interface AIAnalysis {
  id: string;
  presentationId: string;
  transcript: string;
  deliveryMetrics: DeliveryMetrics;
  contentAnalysis: ContentAnalysis;
  overallScore: number; // 0-100
  creditsSpent: number;
  createdAt: Date;
}

// Auth types
export interface AuthToken {
  token: string;
  expiresAt: Date;
}
