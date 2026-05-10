import { POST } from '@/app/api/feedback-requests/[id]/claim/route';
import { clearDatabase, testDb } from '../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('POST /api/feedback-requests/[id]/claim', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  async function makeUserAndRequest(
    requesterEmail: string,
    status: 'PENDING' | 'CLAIMED' = 'PENDING'
  ) {
    const requester = await testDb.user.create({
      data: { email: requesterEmail, passwordHash: 'hash', name: 'Requester', goals: ['job_interviews'] },
    });
    const presentation = await testDb.presentation.create({
      data: {
        userId: requester.id,
        title: 'Test Presentation',
        type: 'VIDEO_RECORDING',
        status: 'READY',
        duration: 300,
        videoUrl: 'videos/test-user/1234-abc.mp4',
        description: 'A test presentation',
      },
    });
    const feedbackRequest = await testDb.feedbackRequest.create({
      data: {
        presentationId: presentation.id,
        requesterId: requester.id,
        type: 'COMMUNITY_FEEDBACK',
        creditsOffered: 5,
        status,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    return { requester, presentation, feedbackRequest };
  }

  it('should claim a pending request', async () => {
    const { feedbackRequest } = await makeUserAndRequest('requester@example.com');
    const claimer = await testDb.user.create({
      data: { email: 'claimer@example.com', passwordHash: 'hash', name: 'Claimer' },
    });

    const token = await signToken({ userId: claimer.id, email: claimer.email });
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/claim`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await POST(request, { params: { id: feedbackRequest.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedbackRequest.id).toBe(feedbackRequest.id);
    expect(data.feedbackRequest.presentation.title).toBe('Test Presentation');
    expect(data.feedbackRequest.presentation.duration).toBe(300);
    expect(data.feedbackRequest.presentation.user.name).toBe('Requester');
    expect(data.feedbackRequest.presentation.videoUrl).toBe('videos/test-user/1234-abc.mp4');
    expect(data.feedbackRequest.presentation.description).toBe('A test presentation');
    expect(data.feedbackRequest.presentation.user.skillLevel).toBe('BEGINNER');
    expect(data.feedbackRequest.presentation.user.goals).toEqual(['job_interviews']);

    const updated = await testDb.feedbackRequest.findUnique({
      where: { id: feedbackRequest.id },
    });
    expect(updated?.status).toBe('CLAIMED');
    expect(updated?.claimedBy).toBe(claimer.id);
    expect(updated?.claimedAt).not.toBeNull();
  });

  it('should reject claiming own request', async () => {
    const { requester, feedbackRequest } = await makeUserAndRequest('requester@example.com');

    const token = await signToken({ userId: requester.id, email: requester.email });
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/claim`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await POST(request, { params: { id: feedbackRequest.id } });
    expect(response.status).toBe(403);
  });

  it('should reject claiming an already-claimed request', async () => {
    const { feedbackRequest } = await makeUserAndRequest('requester@example.com', 'CLAIMED');
    const claimer = await testDb.user.create({
      data: { email: 'claimer@example.com', passwordHash: 'hash', name: 'Claimer' },
    });

    const token = await signToken({ userId: claimer.id, email: claimer.email });
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/claim`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await POST(request, { params: { id: feedbackRequest.id } });
    expect(response.status).toBe(409);
  });

  it('should return 404 for non-existent request', async () => {
    const claimer = await testDb.user.create({
      data: { email: 'claimer@example.com', passwordHash: 'hash', name: 'Claimer' },
    });

    const token = await signToken({ userId: claimer.id, email: claimer.email });
    const request = new Request(
      'http://localhost:3000/api/feedback-requests/non-existent/claim',
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    const response = await POST(request, { params: { id: 'non-existent' } });
    expect(response.status).toBe(404);
  });

  it('should return 401 for unauthenticated request', async () => {
    const { feedbackRequest } = await makeUserAndRequest('requester@example.com');
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/claim`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: { id: feedbackRequest.id } });
    expect(response.status).toBe(401);
  });
});
