import {
  signupSchema,
  loginSchema,
  createPresentationSchema,
  submitFeedbackSchema,
} from '@/lib/validation/schemas';

describe('Validation schemas', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const data = {
        email: 'test@example.com',
        password: 'SecurePass123',
        name: 'Test User',
        skillLevel: 'BEGINNER',
        goals: ['job_interviews'],
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'SecurePass123',
        name: 'Test User',
        skillLevel: 'BEGINNER',
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
        skillLevel: 'BEGINNER',
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing fields', () => {
      const data = { email: 'test@example.com' };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createPresentationSchema', () => {
    it('should validate video recording type', () => {
      const data = {
        title: 'My Presentation',
        description: 'A test presentation',
        type: 'VIDEO_RECORDING',
        visibility: 'PRIVATE',
      };

      const result = createPresentationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const data = {
        type: 'VIDEO_RECORDING',
      };

      const result = createPresentationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('submitFeedbackSchema', () => {
    it('should validate feedback submission with enough words', () => {
      const data = {
        deliveryRating: 4,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback:
          'This presentation was excellent overall the delivery was clear and engaging your content was well organized and easy to follow the examples you provided really helped illustrate the key points throughout your discussion and I appreciated the way you structured the conclusion to summarize everything effectively and provided thought provoking insights',
        timestampComments: [
          { time: 30, comment: 'Good opening' },
          { time: 120, comment: 'Strong conclusion' },
        ],
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject ratings outside 1-5 range', () => {
      const data = {
        deliveryRating: 6,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback:
          'This presentation was excellent overall the delivery was clear and engaging your content was well organized and easy to follow the examples you provided really helped illustrate the key points throughout your discussion and I appreciated the way you structured the conclusion to summarize everything effectively and provided thought provoking insights',
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject feedback with fewer than 50 words', () => {
      const data = {
        deliveryRating: 4,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback: 'Good job keep it up',
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
