import { GET } from '@/app/api/auth/me/route';
import { clearDatabase, testDb } from '../../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should return current user with valid token', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        creditBalance: 75,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe(user.id);
    expect(data.user.email).toBe('user@example.com');
    expect(data.user.creditBalance).toBe(75);
    expect(data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 for missing token', async () => {
    const request = new Request('http://localhost:3000/api/auth/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Missing authorization header');
  });

  it('should return 401 for invalid token', async () => {
    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer invalid.token.here',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('should return 404 if user not found', async () => {
    const token = await signToken({
      userId: 'non-existent-id',
      email: 'ghost@example.com',
    });

    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });
});
