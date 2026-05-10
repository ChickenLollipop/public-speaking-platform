import { POST } from '@/app/api/feedback-requests/[id]/submit/route';
import { clearDatabase, testDb } from '../../setup';
import { signToken } from '@/lib/auth/jwt';

const FIFTY_WORDS =
  'Great job on your presentation the delivery was clear and well paced your content was structured and the examples you used helped illustrate your main points very effectively. Consider adding more deliberate pauses for better dramatic effect and audience engagement. Thank you for sharing your work with us today for feedback and review.';

describe('POST /api/feedback-requests/[id]/submit', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  async function setup() {
    const requester = await testDb.user.create({
      data: { email: 'requester@example.com', passwordHash: 'hash', name: 'Requester' },
    });
    const reviewer = await testDb.user.create({
      data: {
        email: 'reviewer@example.com',
        passwordHash: 'hash',
        name: 'Reviewer',
        creditBalance: 0,
      },
    });
    const presentation = await testDb.presentation.create({
      data: {
        userId: requester.id,
        title: 'Test Presentation',
        type: 'VIDEO_RECORDING',
        status: 'READY',
        duration: 420, // 7 min → base 5 credits
      },
    });
    const feedbackRequest = await testDb.feedbackRequest.create({
      data: {
        presentationId: presentation.id,
        requesterId: requester.id,
        type: 'COMMUNITY_FEEDBACK',
        creditsOffered: 5,
        status: 'CLAIMED',
        claimedBy: reviewer.id,
        claimedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    return { requester, reviewer, presentation, feedbackRequest };
  }

  it('should submit feedback and award base credits', async () => {
    const { reviewer, feedbackRequest } = await setup();
    const token = await signToken({ userId: reviewer.id, email: reviewer.email });

    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryRating: 4,
          contentRating: 5,
          overallRating: 4,
          writtenFeedback: FIFTY_WORDS,
          timestampComments: [{ time: 30, comment: 'Good opening' }],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: feedbackRequest.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback.id).toBeTruthy();
    expect(data.creditsEarned).toBe(5); // 7min video → base 5 credits

    // Verify feedback row created
    const feedback = await testDb.feedback.findUnique({
      where: { id: data.feedback.id },
    });
    expect(feedback?.deliveryRating).toBe(4);
    expect(feedback?.overallRating).toBe(4);
    expect(feedback?.creditsEarned).toBe(5);

    // Verify reviewer balance updated
    const updatedReviewer = await testDb.user.findUnique({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer?.creditBalance).toBe(5);

    // Verify feedback request marked completed
    const updatedRequest = await testDb.feedbackRequest.findUnique({
      where: { id: feedbackRequest.id },
    });
    expect(updatedRequest?.status).toBe('COMPLETED');
  });

  it('should reject if not the claimer', async () => {
    const { feedbackRequest } = await setup();
    const otherUser = await testDb.user.create({
      data: { email: 'other@example.com', passwordHash: 'hash', name: 'Other' },
    });
    const token = await signToken({ userId: otherUser.id, email: otherUser.email });

    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryRating: 4,
          contentRating: 5,
          overallRating: 4,
          writtenFeedback: FIFTY_WORDS,
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: feedbackRequest.id }) });
    expect(response.status).toBe(403);
  });

  it('should reject invalid feedback (too few words)', async () => {
    const { reviewer, feedbackRequest } = await setup();
    const token = await signToken({ userId: reviewer.id, email: reviewer.email });

    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryRating: 4,
          contentRating: 5,
          overallRating: 4,
          writtenFeedback: 'Too short',
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: feedbackRequest.id }) });
    expect(response.status).toBe(400);
  });

  it('should return 401 for unauthenticated request', async () => {
    const { feedbackRequest } = await setup();
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/submit`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: feedbackRequest.id }) });
    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent request', async () => {
    const reviewer = await testDb.user.create({
      data: { email: 'reviewer@example.com', passwordHash: 'hash', name: 'Reviewer' },
    });
    const token = await signToken({ userId: reviewer.id, email: reviewer.email });

    const request = new Request(
      'http://localhost:3000/api/feedback-requests/non-existent/submit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryRating: 4,
          contentRating: 5,
          overallRating: 4,
          writtenFeedback: FIFTY_WORDS,
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) });
    expect(response.status).toBe(404);
  });
});
