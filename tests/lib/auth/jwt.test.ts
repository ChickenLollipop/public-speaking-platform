import { signToken, verifyToken } from '@/lib/auth/jwt';

describe('JWT Utilities', () => {
  const mockPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  describe('signToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await signToken(mockPayload);

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should create tokens with custom expiration', async () => {
      const token = await signToken(mockPayload, '1h');

      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', async () => {
      const token = await signToken(mockPayload);
      const decoded = await verifyToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid-token')).rejects.toThrow();
    });
  });
});
