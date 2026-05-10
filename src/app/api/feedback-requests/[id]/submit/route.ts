import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { submitFeedbackSchema } from '@/lib/validation/schemas';
import { calculateFeedbackEarnings } from '@/lib/credits/calculate';
import { CreditTransactionType } from '@prisma/client';

export async function POST(
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
      include: { presentation: { select: { duration: true } } },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Feedback request not found' }, { status: 404 });
    }

    if (feedbackRequest.claimedBy !== auth.user.userId) {
      return NextResponse.json({ error: 'You have not claimed this request' }, { status: 403 });
    }

    if (feedbackRequest.status !== 'CLAIMED') {
      return NextResponse.json({ error: 'Request is no longer available' }, { status: 409 });
    }

    const body = await request.json();
    const validation = submitFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    let feedback: { id: string };
    let creditsEarned: number;
    try {
      ({ feedback, creditsEarned } = await db.$transaction(async (tx) => {
        const wordCount = validation.data.writtenFeedback.trim().split(/\s+/).filter(Boolean).length;
        const durationSeconds = feedbackRequest.presentation.duration ?? 0;
        const earnings = calculateFeedbackEarnings(durationSeconds, wordCount, null);
        const credits = Math.round(earnings.final);

        const created = await tx.feedback.create({
          data: {
            feedbackRequestId: feedbackRequest.id,
            reviewerId: auth.user!.userId,
            deliveryRating: validation.data.deliveryRating,
            contentRating: validation.data.contentRating,
            overallRating: validation.data.overallRating,
            writtenFeedback: validation.data.writtenFeedback,
            timestampComments: validation.data.timestampComments ?? [],
            feedbackQualityScore: 0,
            creditsEarned: credits,
          },
        });

        await tx.feedbackRequest.update({
          where: { id, status: 'CLAIMED' },
          data: { status: 'COMPLETED' },
        });

        // Award credits atomically within the same transaction
        const reviewer = await tx.user.findUnique({
          where: { id: auth.user!.userId },
          select: { creditBalance: true },
        });
        if (!reviewer) throw new Error('Reviewer not found');
        const newBalance = reviewer.creditBalance + credits;

        await tx.user.update({
          where: { id: auth.user!.userId },
          data: { creditBalance: newBalance },
        });

        await tx.creditTransaction.create({
          data: {
            userId: auth.user!.userId,
            amount: credits,
            type: CreditTransactionType.FEEDBACK_GIVEN,
            relatedId: created.id,
            balanceAfter: newBalance,
          },
        });

        return { feedback: created, creditsEarned: credits };
      }));
    } catch (err: any) {
      if (err?.code === 'P2025') {
        return NextResponse.json({ error: 'Request is no longer available' }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ feedback: { id: feedback.id }, creditsEarned });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
