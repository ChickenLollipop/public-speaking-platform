import { POST } from '@/app/api/presentations/route';
import { clearDatabase, testDb } from '../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('POST /api/presentations', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'My First Presentation',
        description: 'A test presentation',
        type: 'VIDEO_RECORDING',
        visibility: 'PRIVATE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.presentation.id).toBeTruthy();
    expect(data.presentation.title).toBe('My First Presentation');
    expect(data.presentation.userId).toBe(user.id);
    expect(data.presentation.status).toBe('PROCESSING');
  });

  it('should reject unauthenticated request', async () => {
    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test',
        type: 'VIDEO_RECORDING',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should reject invalid input', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'VIDEO_RECORDING',
        // Missing title
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
