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
    let durationFilter: { lt?: number; gte?: number; lte?: number; gt?: number } | undefined;
    if (length === 'short') {
      durationFilter = { lt: 300 };
    } else if (length === 'medium') {
      durationFilter = { gte: 300, lte: 600 };
    } else if (length === 'long') {
      durationFilter = { gt: 600 };
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
