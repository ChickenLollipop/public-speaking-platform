import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  goals: z.array(z.string()).optional().default([]),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createPresentationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['VIDEO_RECORDING', 'VIDEO_UPLOAD', 'TEXT_SCRIPT', 'OUTLINE']),
  visibility: z.enum(['PRIVATE', 'COMMUNITY_SHARED', 'PARTNER_ONLY']).default('PRIVATE'),
});

export const submitFeedbackSchema = z.object({
  deliveryRating: z.number().int().min(1).max(5),
  contentRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  writtenFeedback: z.string().min(50, 'Feedback must be at least 50 characters'),
  timestampComments: z
    .array(
      z.object({
        time: z.number().int().min(0),
        comment: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
