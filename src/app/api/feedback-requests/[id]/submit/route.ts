import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { submitFeedbackSchema } from '@/lib/validation/schemas';
import { calculateFeedbackEarnings } from '@/lib/credits/calculate';
import { createCreditTransaction } from '@/lib/credits/transaction';
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

    const { deliveryRating, contentRating, overallRating, writtenFeedback, timestampComments } =
      validation.data;

    const durationSeconds = feedbackRequest.presentation.duration ?? 0;
    const earnings = calculateFeedbackEarnings(durationSeconds, 0, null);
    const creditsEarned = Math.round(earnings.final);

    let feedback;
    try {
      feedback = await db.$transaction(async (tx) => {
        const created = await tx.feedback.create({
          data: {
            feedbackRequestId: feedbackRequest.id,
            reviewerId: auth.user!.userId,
            deliveryRating,
            contentRating,
            overallRating,
            writtenFeedback,
            timestampComments: timestampComments ?? [],
            feedbackQualityScore: 0,
            creditsEarned,
          },
        });

        await tx.feedbackRequest.update({
          where: { id, status: 'CLAIMED' },
          data: { status: 'COMPLETED' },
        });

        return created;
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        return NextResponse.json({ error: 'Request is no longer available' }, { status: 409 });
      }
      throw err;
    }

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
