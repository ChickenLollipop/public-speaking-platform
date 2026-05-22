import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Get query parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch transactions
    const transactions = await db.creditTransaction.findMany({
      where: { userId: auth.user.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await db.creditTransaction.count({
      where: { userId: auth.user.userId },
    });

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get credit history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
