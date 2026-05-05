import { GET } from '@/app/api/presentations/[id]/upload-url/route';
import { clearDatabase, testDb } from '../../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('GET /api/presentations/[id]/upload-url', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should generate upload URL for own presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const presentation = await testDb.presentation.create({
      data: {
        userId: user.id,
        title: 'Test Presentation',
        type: 'VIDEO_RECORDING',
        status: 'PROCESSING',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request(
      `http://localhost:3000/api/presentations/${presentation.id}/upload-url`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: presentation.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBeTruthy();
    expect(data.key).toBeTruthy();
    expect(data.url).toContain('X-Amz-Signature');
  });

  it('should reject access to other user presentation', async () => {
    const user1 = await testDb.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash',
        name: 'User 1',
      },
    });

    const user2 = await testDb.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash',
        name: 'User 2',
      },
    });

    const presentation = await testDb.presentation.create({
      data: {
        userId: user1.id,
        title: 'User 1 Presentation',
        type: 'VIDEO_RECORDING',
        status: 'PROCESSING',
      },
    });

    const token = await signToken({ userId: user2.id, email: user2.email });

    const request = new Request(
      `http://localhost:3000/api/presentations/${presentation.id}/upload-url`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: presentation.id } });

    expect(response.status).toBe(403);
  });

  it('should reject for non-existent presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request(
      'http://localhost:3000/api/presentations/non-existent/upload-url',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: 'non-existent' } });

    expect(response.status).toBe(404);
  });
});
