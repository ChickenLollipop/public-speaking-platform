# Feedback Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full give-feedback flow: browse open requests, claim one, submit rated feedback with optional timestamp comments, and see a confirmation with credits earned.

**Architecture:** Three API routes + three Next.js pages. API routes follow existing patterns (authenticate → validate → db → return JSON). Pages are React Server Components where possible; the submission form is a Client Component for interactivity. Credit logic reuses existing `calculateFeedbackEarnings` and `createCreditTransaction` utilities.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, TailwindCSS, Zod, Jest + React Testing Library, existing auth middleware and credit utilities.

---

## File Map

**New files — API:**
- `src/app/api/feedback-requests/route.ts` — GET list of pending requests (with filters)
- `src/app/api/feedback-requests/[id]/claim/route.ts` — POST claim a request
- `src/app/api/feedback-requests/[id]/submit/route.ts` — POST submit feedback

**New files — Tests:**
- `tests/api/feedback-requests/list.test.ts`
- `tests/api/feedback-requests/claim.test.ts`
- `tests/api/feedback-requests/submit.test.ts`

**New files — Pages:**
- `src/app/feedback/give/page.tsx` — browse + filter requests (Client Component)
- `src/app/feedback/give/[requestId]/page.tsx` — video player + submission form
- `src/app/feedback/give/[requestId]/FeedbackForm.tsx` — interactive form (Client Component)
- `src/app/feedback/give/[requestId]/confirmation/page.tsx` — credits confirmation

**Modified files:**
- `src/lib/validation/schemas.ts` — fix `writtenFeedback` minimum from 50 chars to 50 words

---

## Task 1: Fix writtenFeedback validation (50 words, not 50 chars)

**Files:**
- Modify: `src/lib/validation/schemas.ts`
- Modify: `tests/lib/validation/schemas.test.ts`

- [ ] **Step 1: Update the failing test for submitFeedbackSchema**

Open `tests/lib/validation/schemas.test.ts`. Replace the existing `submitFeedbackSchema` test block with:

```typescript
describe('submitFeedbackSchema', () => {
  it('should validate feedback submission with enough words', () => {
    const data = {
      deliveryRating: 4,
      contentRating: 5,
      overallRating: 4,
      writtenFeedback:
        'Great job on your presentation the delivery was clear and well paced your content was well structured and the examples you used really helped illustrate your points consider adding more pauses for effect',
      timestampComments: [
        { time: 30, comment: 'Good opening' },
        { time: 120, comment: 'Strong conclusion' },
      ],
    };

    const result = submitFeedbackSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject ratings outside 1-5 range', () => {
    const data = {
      deliveryRating: 6,
      contentRating: 5,
      overallRating: 4,
      writtenFeedback:
        'Great job on your presentation the delivery was clear and well paced your content was well structured and the examples you used really helped illustrate your points consider adding more pauses for effect',
    };

    const result = submitFeedbackSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject feedback with fewer than 50 words', () => {
    const data = {
      deliveryRating: 4,
      contentRating: 5,
      overallRating: 4,
      writtenFeedback: 'Good job keep it up',
    };

    const result = submitFeedbackSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify the word-count test fails**

Run: `npm test -- tests/lib/validation/schemas.test.ts`

Expected: the "fewer than 50 words" test FAILS (current schema allows it since it only checks characters)

- [ ] **Step 3: Update the schema**

In `src/lib/validation/schemas.ts`, replace the `writtenFeedback` line inside `submitFeedbackSchema`:

```typescript
writtenFeedback: z
  .string()
  .refine(
    (val) => val.trim().split(/\s+/).filter(Boolean).length >= 50,
    { message: 'Feedback must be at least 50 words' }
  ),
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- tests/lib/validation/schemas.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts tests/lib/validation/schemas.test.ts
git commit -m "fix: change writtenFeedback minimum to 50 words"
```

---

## Task 2: List feedback requests API (`GET /api/feedback-requests`)

**Files:**
- Create: `src/app/api/feedback-requests/route.ts`
- Create: `tests/api/feedback-requests/list.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/feedback-requests/list.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/api/feedback-requests/list.test.ts`

Expected: FAIL — Cannot find module `@/app/api/feedback-requests/route`

- [ ] **Step 3: Create the route**

Create `src/app/api/feedback-requests/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const length = searchParams.get('length'); // 'short' | 'medium' | 'long' | null
    const sort = searchParams.get('sort') ?? 'credits_desc'; // 'credits_desc' | 'newest'

    // Build duration filter
    let durationFilter: { lt?: number; gte?: number; lte?: number } | undefined;
    if (length === 'short') {
      durationFilter = { lt: 300 };
    } else if (length === 'medium') {
      durationFilter = { gte: 300, lte: 600 };
    } else if (length === 'long') {
      durationFilter = { gte: 601 };
    }

    const feedbackRequests = await db.feedbackRequest.findMany({
      where: {
        status: 'PENDING',
        requesterId: { not: auth.user.userId },
        ...(durationFilter
          ? { presentation: { duration: durationFilter } }
          : {}),
      },
      orderBy:
        sort === 'newest'
          ? { createdAt: 'desc' }
          : { creditsOffered: 'desc' },
      include: {
        presentation: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            userId: true,
            user: {
              select: { name: true, skillLevel: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ feedbackRequests });
  } catch (error) {
    console.error('List feedback requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/api/feedback-requests/list.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/feedback-requests/route.ts tests/api/feedback-requests/list.test.ts
git commit -m "feat: add list feedback requests API endpoint"
```

---

## Task 3: Claim feedback request API (`POST /api/feedback-requests/[id]/claim`)

**Files:**
- Create: `src/app/api/feedback-requests/[id]/claim/route.ts`
- Create: `tests/api/feedback-requests/claim.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/feedback-requests/claim.test.ts`:

```typescript
import { POST } from '@/app/api/feedback-requests/[id]/claim/route';
import { clearDatabase, testDb } from '../../../setup';
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

    // Verify DB updated
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/api/feedback-requests/claim.test.ts`

Expected: FAIL — Cannot find module `@/app/api/feedback-requests/[id]/claim/route`

- [ ] **Step 3: Create the route**

Create `src/app/api/feedback-requests/[id]/claim/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const feedbackRequest = await db.feedbackRequest.findUnique({
      where: { id: params.id },
      include: {
        presentation: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            videoUrl: true,
            user: {
              select: { name: true, skillLevel: true, goals: true },
            },
          },
        },
      },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Feedback request not found' }, { status: 404 });
    }

    if (feedbackRequest.requesterId === auth.user.userId) {
      return NextResponse.json({ error: 'Cannot claim your own request' }, { status: 403 });
    }

    if (feedbackRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is no longer available' }, { status: 409 });
    }

    const updated = await db.feedbackRequest.update({
      where: { id: params.id },
      data: {
        status: 'CLAIMED',
        claimedBy: auth.user.userId,
        claimedAt: new Date(),
      },
      include: {
        presentation: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            videoUrl: true,
            user: {
              select: { name: true, skillLevel: true, goals: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ feedbackRequest: updated });
  } catch (error) {
    console.error('Claim feedback request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/api/feedback-requests/claim.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/feedback-requests/[id]/claim/route.ts tests/api/feedback-requests/claim.test.ts
git commit -m "feat: add claim feedback request API endpoint"
```

---

## Task 4: Submit feedback API (`POST /api/feedback-requests/[id]/submit`)

**Files:**
- Create: `src/app/api/feedback-requests/[id]/submit/route.ts`
- Create: `tests/api/feedback-requests/submit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/feedback-requests/submit.test.ts`:

```typescript
import { POST } from '@/app/api/feedback-requests/[id]/submit/route';
import { clearDatabase, testDb } from '../../../setup';
import { signToken } from '@/lib/auth/jwt';

const FIFTY_WORDS =
  'Great job on your presentation the delivery was clear and well paced your content was structured and the examples you used helped illustrate your main points consider adding more deliberate pauses for better effect thank you';

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

    const response = await POST(request, { params: { id: feedbackRequest.id } });
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

    const response = await POST(request, { params: { id: feedbackRequest.id } });
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

    const response = await POST(request, { params: { id: feedbackRequest.id } });
    expect(response.status).toBe(400);
  });

  it('should return 401 for unauthenticated request', async () => {
    const { feedbackRequest } = await setup();
    const request = new Request(
      `http://localhost:3000/api/feedback-requests/${feedbackRequest.id}/submit`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: { id: feedbackRequest.id } });
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

    const response = await POST(request, { params: { id: 'non-existent' } });
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/api/feedback-requests/submit.test.ts`

Expected: FAIL — Cannot find module `@/app/api/feedback-requests/[id]/submit/route`

- [ ] **Step 3: Create the route**

Create `src/app/api/feedback-requests/[id]/submit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { submitFeedbackSchema } from '@/lib/validation/schemas';
import { calculateFeedbackEarnings } from '@/lib/credits/calculate';
import { createCreditTransaction } from '@/lib/credits/transaction';
import { CreditTransactionType } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const feedbackRequest = await db.feedbackRequest.findUnique({
      where: { id: params.id },
      include: { presentation: { select: { duration: true } } },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Feedback request not found' }, { status: 404 });
    }

    if (feedbackRequest.claimedBy !== auth.user.userId) {
      return NextResponse.json({ error: 'You have not claimed this request' }, { status: 403 });
    }

    const body = await request.json();
    const validation = submitFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { deliveryRating, contentRating, overallRating, writtenFeedback, timestampComments } =
      validation.data;

    const wordCount = writtenFeedback.trim().split(/\s+/).filter(Boolean).length;
    const durationSeconds = feedbackRequest.presentation.duration ?? 0;
    const earnings = calculateFeedbackEarnings(durationSeconds, wordCount, null);
    const creditsEarned = Math.round(earnings.final);

    const feedbackQualityScore = Math.min(
      1.0,
      wordCount / 200 + (timestampComments?.length ?? 0) * 0.1
    );

    const feedback = await db.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: {
          feedbackRequestId: feedbackRequest.id,
          reviewerId: auth.user!.userId,
          deliveryRating,
          contentRating,
          overallRating,
          writtenFeedback,
          timestampComments: timestampComments ?? [],
          feedbackQualityScore,
          creditsEarned,
        },
      });

      await tx.feedbackRequest.update({
        where: { id: feedbackRequest.id },
        data: { status: 'COMPLETED' },
      });

      return created;
    });

    await createCreditTransaction(
      auth.user.userId,
      creditsEarned,
      CreditTransactionType.FEEDBACK_GIVEN,
      feedback.id
    );

    return NextResponse.json({ feedback: { id: feedback.id }, creditsEarned });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/api/feedback-requests/submit.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/feedback-requests/[id]/submit/route.ts tests/api/feedback-requests/submit.test.ts
git commit -m "feat: add submit feedback API endpoint"
```

---

## Task 5: Browse page (`/feedback/give`)

**Files:**
- Create: `src/app/feedback/give/page.tsx`

This is a Client Component — it needs to hold filter state and re-fetch when filters change.

- [ ] **Step 1: Create the browse page**

Create `src/app/feedback/give/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface FeedbackRequestItem {
  id: string;
  creditsOffered: number;
  createdAt: string;
  presentation: {
    title: string;
    duration: number | null;
    description: string | null;
    user: { name: string; skillLevel: SkillLevel };
  };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown';
  return `${Math.round(seconds / 60)} min`;
}

export default function GiveFeedbackPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FeedbackRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<{ [id: string]: string }>({});
  const [length, setLength] = useState<string>('');
  const [sort, setSort] = useState<string>('credits_desc');

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      const params = new URLSearchParams();
      if (length) params.set('length', length);
      if (sort) params.set('sort', sort);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/feedback-requests?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        router.push('/');
        return;
      }

      const data = await res.json();
      setRequests(data.feedbackRequests ?? []);
      setLoading(false);
    }

    fetchRequests();
  }, [length, sort, router]);

  async function handleClaim(requestId: string) {
    setClaimingId(requestId);
    setClaimError((prev) => ({ ...prev, [requestId]: '' }));

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/feedback-requests/${requestId}/claim`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      router.push(`/feedback/give/${requestId}`);
      return;
    }

    const data = await res.json();
    setClaimError((prev) => ({
      ...prev,
      [requestId]: data.error ?? 'Failed to claim request',
    }));
    // Refresh list in case request was taken
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setClaimingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/dashboard" className="text-xl font-semibold text-gray-900">
            Public Speaking Platform
          </a>
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Give Feedback</h1>
          <p className="text-gray-600 mt-1">
            Help others improve their presentations and earn credits.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length
            </label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="short">Short (&lt;5 min)</option>
              <option value="medium">Medium (5–10 min)</option>
              <option value="long">Long (10+ min)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="credits_desc">Most Credits</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No feedback requests right now — check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                    {req.presentation.title}
                  </h3>
                  <span className="text-xl font-bold text-indigo-600 whitespace-nowrap">
                    {req.creditsOffered} credits
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-4 space-y-1">
                  <p>Duration: {formatDuration(req.presentation.duration)}</p>
                  <p>
                    By {req.presentation.user.name} ·{' '}
                    {req.presentation.user.skillLevel.charAt(0) +
                      req.presentation.user.skillLevel.slice(1).toLowerCase()}
                  </p>
                  {req.presentation.description && (
                    <p className="text-gray-600 line-clamp-2">{req.presentation.description}</p>
                  )}
                </div>
                {claimError[req.id] && (
                  <p className="text-sm text-red-600 mb-3">{claimError[req.id]}</p>
                )}
                <button
                  onClick={() => handleClaim(req.id)}
                  disabled={claimingId === req.id}
                  className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {claimingId === req.id ? 'Claiming...' : 'Claim & Give Feedback'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify the page loads**

Run: `npm run dev`

Navigate to `http://localhost:3000/feedback/give`

Expected: Page loads with filter bar, "Loading requests..." then either cards or empty state.

- [ ] **Step 3: Commit**

```bash
git add src/app/feedback/give/page.tsx
git commit -m "feat: add give feedback browse page"
```

---

## Task 6: Feedback submission form component

**Files:**
- Create: `src/app/feedback/give/[requestId]/FeedbackForm.tsx`

The form is interactive (star ratings, word counter, timestamp capture) so it must be a Client Component.

- [ ] **Step 1: Create the FeedbackForm component**

Create `src/app/feedback/give/[requestId]/FeedbackForm.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface TimestampComment {
  time: number;
  comment: string;
}

interface FeedbackFormProps {
  requestId: string;
  durationSeconds: number;
  videoRef: React.RefObject<HTMLVideoElement>;
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl leading-none ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ requestId, durationSeconds, videoRef }: FeedbackFormProps) {
  const router = useRouter();
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [contentRating, setContentRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [timestampComments, setTimestampComments] = useState<TimestampComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const wordCount = writtenFeedback.trim().split(/\s+/).filter(Boolean).length;
  const isValid =
    deliveryRating > 0 &&
    contentRating > 0 &&
    overallRating > 0 &&
    wordCount >= 50;

  // Base credits preview based on duration
  const minutes = durationSeconds / 60;
  let baseCredits = 3;
  if (minutes >= 5 && minutes < 10) baseCredits = 5;
  else if (minutes >= 10 && minutes < 20) baseCredits = 8;
  else if (minutes >= 20) baseCredits = 12;

  function addTimestampComment() {
    if (!newComment.trim()) return;
    const currentTime = Math.floor(videoRef.current?.currentTime ?? 0);
    setTimestampComments((prev) => [...prev, { time: currentTime, comment: newComment.trim() }]);
    setNewComment('');
  }

  function removeTimestampComment(index: number) {
    setTimestampComments((prev) => prev.filter((_, i) => i !== index));
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/feedback-requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        deliveryRating,
        contentRating,
        overallRating,
        writtenFeedback,
        timestampComments,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(
        `/feedback/give/${requestId}/confirmation?credits=${data.creditsEarned}`
      );
      return;
    }

    const data = await res.json();
    setError(data.error ?? 'Failed to submit feedback');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Star ratings */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
          Ratings
        </h3>
        <div className="divide-y divide-gray-100">
          <StarRating label="Delivery" value={deliveryRating} onChange={setDeliveryRating} />
          <StarRating label="Content" value={contentRating} onChange={setContentRating} />
          <StarRating label="Overall" value={overallRating} onChange={setOverallRating} />
        </div>
      </div>

      {/* Written feedback */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Written Feedback
          </h3>
          <span
            className={`text-sm ${wordCount >= 50 ? 'text-green-600' : 'text-gray-400'}`}
          >
            {wordCount} / 50 words
          </span>
        </div>
        <textarea
          value={writtenFeedback}
          onChange={(e) => setWrittenFeedback(e.target.value)}
          placeholder="Write your feedback here (minimum 50 words)..."
          rows={6}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Timestamp comments */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Timestamp Comments (optional)
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTimestampComment())}
            placeholder="Comment at current video time..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={addTimestampComment}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition whitespace-nowrap"
          >
            + Add at {formatTime(Math.floor(videoRef.current?.currentTime ?? 0))}
          </button>
        </div>
        {timestampComments.length > 0 && (
          <ul className="space-y-2">
            {timestampComments.map((tc, i) => (
              <li
                key={i}
                className="flex items-start gap-2 bg-gray-50 rounded-md px-3 py-2 text-sm"
              >
                <span className="font-mono text-indigo-600 whitespace-nowrap">
                  {formatTime(tc.time)}
                </span>
                <span className="flex-1 text-gray-700">{tc.comment}</span>
                <button
                  type="button"
                  onClick={() => removeTimestampComment(i)}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Submit */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="bg-white rounded-lg shadow p-5">
        <p className="text-sm text-gray-600 mb-4">
          You&apos;ll earn{' '}
          <span className="font-semibold text-indigo-600">{baseCredits} credits</span> for this
          feedback. Your final amount may increase up to 2x if rated highly.
        </p>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
        {!isValid && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            {deliveryRating === 0 || contentRating === 0 || overallRating === 0
              ? 'Please rate all three categories'
              : `${50 - wordCount} more words needed`}
          </p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/feedback/give/[requestId]/FeedbackForm.tsx
git commit -m "feat: add feedback submission form component"
```

---

## Task 7: Submission page (`/feedback/give/[requestId]`)

**Files:**
- Create: `src/app/feedback/give/[requestId]/page.tsx`

This is a Server Component that fetches the claimed request server-side, then renders the video player + `FeedbackForm`.

- [ ] **Step 1: Create the submission page**

Create `src/app/feedback/give/[requestId]/page.tsx`:

```typescript
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { FeedbackForm } from './FeedbackForm';
import { VideoPlayer } from './VideoPlayer';

interface PageProps {
  params: { requestId: string };
}

async function getFeedbackRequest(requestId: string, token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/feedback-requests/${requestId}/claim`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );

  if (!res.ok) return null;
  return res.json();
}

export default async function SubmissionPage({ params }: PageProps) {
  // Token comes from cookie (set at login) or we redirect to root
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  const data = await getFeedbackRequest(params.requestId, token);

  if (!data) {
    redirect('/feedback/give');
  }

  const { feedbackRequest } = data;
  const { presentation } = feedbackRequest;
  const skillLevel =
    presentation.user.skillLevel.charAt(0) +
    presentation.user.skillLevel.slice(1).toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold text-gray-900">Public Speaking Platform</span>
          <a
            href="/feedback/give"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Give Feedback
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left: video + presentation info */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              videoKey={presentation.videoUrl}
              requestId={params.requestId}
              durationSeconds={presentation.duration ?? 0}
            />
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {presentation.title}
              </h1>
              {presentation.description && (
                <p className="text-gray-600 mb-3">{presentation.description}</p>
              )}
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  By <span className="font-medium">{presentation.user.name}</span> ·{' '}
                  {skillLevel}
                </p>
                {presentation.user.goals?.length > 0 && (
                  <p>Goals: {presentation.user.goals.join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="w-96 flex-shrink-0 sticky top-8">
            <FeedbackForm
              requestId={params.requestId}
              durationSeconds={presentation.duration ?? 0}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create the VideoPlayer component**

The submission page references a `VideoPlayer` component. Create `src/app/feedback/give/[requestId]/VideoPlayer.tsx`:

```typescript
'use client';

import { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  videoKey: string | null;
  requestId: string;
  durationSeconds: number;
}

export function VideoPlayer({ videoKey, requestId, durationSeconds }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoKey) {
    return (
      <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
        <p className="text-white text-sm">Video not available</p>
      </div>
    );
  }

  // The video URL is fetched client-side via signed URL API
  return <VideoPlayerClient videoKey={videoKey} requestId={requestId} />;
}

function VideoPlayerClient({
  videoKey,
  requestId,
}: {
  videoKey: string;
  requestId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = (
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useState
  )<string | null>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    async function fetchSignedUrl() {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/feedback-requests/${requestId}/video-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSignedUrl(data.url);
      }
    }
    fetchSignedUrl();
  }, [requestId]);

  if (!signedUrl) {
    return (
      <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
        <p className="text-white text-sm">Loading video...</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={signedUrl}
      controls
      className="w-full rounded-lg bg-black aspect-video"
    />
  );
}
```

**Note:** The `VideoPlayer` component needs a signed URL endpoint. Add that in the next step.

- [ ] **Step 3: Add the video URL API route**

Create `src/app/api/feedback-requests/[id]/video-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, S3_BUCKET_NAME } from '@/lib/s3/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const feedbackRequest = await db.feedbackRequest.findUnique({
      where: { id: params.id },
      include: { presentation: { select: { videoUrl: true } } },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (
      feedbackRequest.claimedBy !== auth.user.userId &&
      feedbackRequest.requesterId !== auth.user.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const videoKey = feedbackRequest.presentation.videoUrl;
    if (!videoKey) {
      return NextResponse.json({ error: 'No video available' }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
    });

    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Get video URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Fix the VideoPlayer component — remove the bad require pattern**

The `VideoPlayerClient` above used a bad `require('react').useState` pattern. Replace the entire contents of `src/app/feedback/give/[requestId]/VideoPlayer.tsx` with a clean version:

```typescript
'use client';

import { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
  videoKey: string | null;
  requestId: string;
  durationSeconds: number;
}

export function VideoPlayer({ videoKey, requestId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoKey) return;

    async function fetchSignedUrl() {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/feedback-requests/${requestId}/video-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSignedUrl(data.url);
      }
    }

    fetchSignedUrl();
  }, [videoKey, requestId]);

  if (!videoKey) {
    return (
      <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
        <p className="text-white text-sm">Video not available</p>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
        <p className="text-white text-sm">Loading video...</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={signedUrl}
      controls
      className="w-full rounded-lg bg-black aspect-video"
    />
  );
}
```

- [ ] **Step 5: Update FeedbackForm to not need videoRef prop**

The `FeedbackForm` captures the current video time for timestamp comments. Since the video element lives in `VideoPlayer` in a sibling component, we need to access it differently. The simplest approach: `FeedbackForm` reads the video time from the DOM directly by querying the `<video>` element.

Replace the `FeedbackFormProps` interface and the `addTimestampComment` function in `src/app/feedback/give/[requestId]/FeedbackForm.tsx`:

Remove `videoRef` from the props interface:

```typescript
interface FeedbackFormProps {
  requestId: string;
  durationSeconds: number;
}
```

Replace `addTimestampComment` to query the video element from the DOM:

```typescript
function addTimestampComment() {
  if (!newComment.trim()) return;
  const videoEl = document.querySelector('video') as HTMLVideoElement | null;
  const currentTime = Math.floor(videoEl?.currentTime ?? 0);
  setTimestampComments((prev) => [...prev, { time: currentTime, comment: newComment.trim() }]);
  setNewComment('');
}
```

Also update the button label inside the timestamp section to not reference `videoRef`:

```typescript
<button
  type="button"
  onClick={addTimestampComment}
  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition whitespace-nowrap"
>
  + Add Timestamp
</button>
```

And remove `videoRef` from the `FeedbackForm` call in `page.tsx` — the component no longer takes that prop.

- [ ] **Step 6: Update the submission page to remove videoRef prop**

In `src/app/feedback/give/[requestId]/page.tsx`, update the `FeedbackForm` call to remove `videoRef`:

```typescript
<FeedbackForm
  requestId={params.requestId}
  durationSeconds={presentation.duration ?? 0}
/>
```

- [ ] **Step 7: Start dev server and verify the submission page loads**

Run: `npm run dev`

Navigate to `http://localhost:3000/feedback/give` and claim a request (or navigate directly to `/feedback/give/[some-id]`).

Expected: Two-column layout with video player on left, form on right. Star ratings, word counter, and timestamp comment button all work.

- [ ] **Step 8: Commit**

```bash
git add src/app/feedback/give/[requestId]/page.tsx src/app/feedback/give/[requestId]/VideoPlayer.tsx src/app/feedback/give/[requestId]/FeedbackForm.tsx src/app/api/feedback-requests/[id]/video-url/route.ts
git commit -m "feat: add feedback submission page and video player"
```

---

## Task 8: Confirmation page (`/feedback/give/[requestId]/confirmation`)

**Files:**
- Create: `src/app/feedback/give/[requestId]/confirmation/page.tsx`

- [ ] **Step 1: Create the confirmation page**

Create `src/app/feedback/give/[requestId]/confirmation/page.tsx`:

```typescript
interface PageProps {
  params: { requestId: string };
  searchParams: { credits?: string };
}

export default function ConfirmationPage({ params, searchParams }: PageProps) {
  const creditsEarned = parseInt(searchParams.credits ?? '0', 10);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Feedback submitted!</h1>
        <p className="text-gray-600 mb-6">
          Thanks for helping the community improve their speaking skills.
        </p>

        <div className="bg-indigo-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-indigo-700 uppercase tracking-wide font-medium mb-1">
            Credits earned
          </p>
          <p className="text-4xl font-bold text-indigo-600">{creditsEarned}</p>
          <p className="text-sm text-indigo-600 mt-2">
            Your final amount may increase up to 2× if the recipient rates your feedback highly.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href="/feedback/give"
            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition text-center"
          >
            Give More Feedback
          </a>
          <a
            href="/dashboard"
            className="flex-1 py-3 px-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition text-center"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify the page**

Run: `npm run dev`

Navigate to `http://localhost:3000/feedback/give/test-id/confirmation?credits=5`

Expected: Centered card with "Feedback submitted!", "5 credits earned", and two action buttons.

- [ ] **Step 3: Commit**

```bash
git add src/app/feedback/give/[requestId]/confirmation/page.tsx
git commit -m "feat: add feedback confirmation page"
```

---

## Task 9: Link the dashboard to the feedback page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

The dashboard already has a "Give Feedback" card linking to `/feedback/give` — verify the link is correct and the page is reachable.

- [ ] **Step 1: Verify the dashboard link**

Open `src/app/dashboard/page.tsx`. Confirm the "Give Feedback" card has `href="/feedback/give"`. It should already be correct from the existing code.

- [ ] **Step 2: Start dev server and test full flow**

Run: `npm run dev`

1. Open `http://localhost:3000/dashboard`
2. Click "Give Feedback" card — should navigate to `/feedback/give`
3. Verify the browse page loads with filters
4. Click "Claim & Give Feedback" on a card (requires real DB data) — should navigate to submission page
5. After submit — should redirect to confirmation with `?credits=N`
6. Both confirmation buttons navigate correctly

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: verify dashboard → feedback page navigation"
```

---

## Self-Review Checklist

After writing, verify against the spec:

**Spec coverage:**
- ✅ GET `/api/feedback-requests` with `length` + `sort` filters (Task 2)
- ✅ POST `/api/feedback-requests/[id]/claim` (Task 3)
- ✅ POST `/api/feedback-requests/[id]/submit` with credit award (Task 4)
- ✅ Browse page with filter bar, request cards, claim button, empty state (Task 5)
- ✅ Submission page: video player, star ratings, word counter, timestamp comments, submit button (Tasks 6–7)
- ✅ Submit button disabled until valid (Task 6)
- ✅ Confirmation page with credits + bonus note + two action buttons (Task 8)
- ✅ `writtenFeedback` minimum 50 words (Task 1)
- ✅ Credits passed via `?credits=X` query param (Tasks 4, 8)
- ✅ Signed S3 URL for video player (Task 7)
- ✅ `calculateFeedbackEarnings` used for base credits (Task 4)
- ✅ `createCreditTransaction` called with `FEEDBACK_GIVEN` (Task 4)

**Not in scope (confirmed out of scope in spec):**
- Recipient rating flow / bonus multiplier
- 48h expiry job
- Anti-gaming enforcement
- Low-credit warning banner (noted in design but trivially addable later)
