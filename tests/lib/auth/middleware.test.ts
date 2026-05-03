import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { signToken } from '@/lib/auth/jwt';

describe('Auth middleware', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';

  it('should extract and verify valid token from Authorization header', async () => {
    const token = await signToken({ userId: mockUserId, email: mockEmail });

    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(true);
    expect(result.user?.userId).toBe(mockUserId);
    expect(result.user?.email).toBe(mockEmail);
  });

  it('should return error for missing Authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing authorization header');
  });

  it('should return error for invalid token format', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid authorization header format');
  });

  it('should return error for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: 'Bearer invalid.token.here',
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired token');
  });
});
