import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    const feedbackRequest = await db.feedbackRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        creditsOffered: true,
        requesterId: true,
        claimedBy: true,
        presentation: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            user: {
              select: { name: true, skillLevel: true, goals: true },
            },
          },
        },
      },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only the requester or claimer can view details
    if (
      feedbackRequest.requesterId !== auth.user.userId &&
      feedbackRequest.claimedBy !== auth.user.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ feedbackRequest });
  } catch (error) {
    console.error('Get feedback request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
