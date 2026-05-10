import { GET } from '@/app/api/feedback-requests/route';
import { clearDatabase, testDb } from '../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('GET /api/feedback-requests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  async function makeUser(email: string) {
    return testDb.user.create({
      data: { email, passwordHash: 'hash', name: 'User' },
    });
  }

  async function makeRequest(
    requesterId: string,
    durationSeconds: number,
    creditsOffered: number,
    status: 'PENDING' | 'CLAIMED' | 'COMPLETED' = 'PENDING'
  ) {
    const presentation = await testDb.presentation.create({
      data: {
        userId: requesterId,
        title: 'Test Presentation',
        type: 'VIDEO_RECORDING',
        status: 'READY',
        duration: durationSeconds,
      },
    });
    return testDb.feedbackRequest.create({
      data: {
        presentationId: presentation.id,
        requesterId,
        type: 'COMMUNITY_FEEDBACK',
        creditsOffered,
        status,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
  }

  it('should return pending requests excluding own', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 300, 5);
    await makeRequest(viewer.id, 300, 5); // own request — should be excluded

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request('http://localhost:3000/api/feedback-requests', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequests).toHaveLength(1);
    expect(data.feedbackRequests[0].presentation.userId).toBe(requester.id);
  });

  it('should exclude already-claimed requests', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 300, 5, 'CLAIMED');

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request('http://localhost:3000/api/feedback-requests', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequests).toHaveLength(0);
  });

  it('should filter by length=short (under 300s)', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 240, 3);  // short
    await makeRequest(requester.id, 600, 10); // medium

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request(
      'http://localhost:3000/api/feedback-requests?length=short',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequests).toHaveLength(1);
    expect(data.feedbackRequests[0].presentation.duration).toBe(240);
  });

  it('should filter by length=medium (300-600s)', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 240, 3);  // short
    await makeRequest(requester.id, 420, 7);  // medium
    await makeRequest(requester.id, 720, 12); // long

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request(
      'http://localhost:3000/api/feedback-requests?length=medium',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequests).toHaveLength(1);
    expect(data.feedbackRequests[0].presentation.duration).toBe(420);
  });

  it('should filter by length=long (over 600s)', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 240, 3);  // short
    await makeRequest(requester.id, 720, 12); // long

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request(
      'http://localhost:3000/api/feedback-requests?length=long',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequests).toHaveLength(1);
    expect(data.feedbackRequests[0].presentation.duration).toBe(720);
  });

  it('should sort by credits_desc by default', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    await makeRequest(requester.id, 300, 3);
    await makeRequest(requester.id, 300, 10);
    await makeRequest(requester.id, 300, 5);

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request('http://localhost:3000/api/feedback-requests', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.feedbackRequests[0].creditsOffered).toBe(10);
    expect(data.feedbackRequests[1].creditsOffered).toBe(5);
    expect(data.feedbackRequests[2].creditsOffered).toBe(3);
  });

  it('should sort by newest when sort=newest', async () => {
    const requester = await makeUser('requester@example.com');
    const viewer = await makeUser('viewer@example.com');

    const r1 = await makeRequest(requester.id, 300, 3);
    const r2 = await makeRequest(requester.id, 300, 5);

    const token = await signToken({ userId: viewer.id, email: viewer.email });
    const request = new Request(
      'http://localhost:3000/api/feedback-requests?sort=newest',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.feedbackRequests[0].id).toBe(r2.id);
    expect(data.feedbackRequests[1].id).toBe(r1.id);
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = new Request('http://localhost:3000/api/feedback-requests');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
