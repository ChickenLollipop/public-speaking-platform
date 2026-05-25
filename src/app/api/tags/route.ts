import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Fetch all user's presentations with only tags field
    const presentations = await db.presentation.findMany({
      where: { userId: auth.user.userId },
      select: { tags: true },
    });

    // Flatten all tags arrays and count occurrences
    const tagCountMap = new Map<string, number>();

    for (const presentation of presentations) {
      for (const tag of presentation.tags) {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      }
    }

    // Convert to array of { name, count } objects
    const tags = Array.from(tagCountMap, ([name, count]) => ({
      name,
      count,
    }))
      // Sort by count descending
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
