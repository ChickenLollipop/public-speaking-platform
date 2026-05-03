import { POST } from '@/app/api/auth/signup/route';
import { clearDatabase, testDb } from '../../../setup';

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create new user and return JWT token', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
        skillLevel: 'BEGINNER',
        goals: ['job_interviews'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.name).toBe('New User');
    expect(data.user).not.toHaveProperty('passwordHash');

    // Verify user in database
    const user = await testDb.user.findUnique({
      where: { email: 'newuser@example.com' },
    });
    expect(user).toBeTruthy();
    expect(user?.creditBalance).toBe(50); // Initial bonus

    // Verify initial credit transaction
    const transaction = await testDb.creditTransaction.findFirst({
      where: { userId: user?.id },
    });
    expect(transaction?.amount).toBe(50);
    expect(transaction?.type).toBe('INITIAL_BONUS');
  });

  it('should reject duplicate email', async () => {
    await testDb.user.create({
      data: {
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'SecurePass123',
        name: 'New User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already exists');
  });

  it('should reject invalid input', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
