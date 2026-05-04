import { POST } from '@/app/api/auth/login/route';
import { clearDatabase, testDb } from '../../../setup';
import { hashPassword } from '@/lib/auth/password';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should login with valid credentials', async () => {
    const password = 'SecurePass123';
    const passwordHash = await hashPassword(password);

    await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('user@example.com');
    expect(data.user).not.toHaveProperty('passwordHash');
  });

  it('should reject invalid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject invalid password', async () => {
    const passwordHash = await hashPassword('CorrectPass123');

    await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'WrongPass123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject invalid input', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
