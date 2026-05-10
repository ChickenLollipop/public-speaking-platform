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
