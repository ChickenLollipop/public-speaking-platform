import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { analyzePresentation, generateMockTranscript } from '@/lib/ai/analyze-presentation';
import { deductCredits } from '@/lib/credits/transaction';

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

    // Get presentation
    const presentation = await db.presentation.findUnique({
      where: { id },
      include: {
        user: true,
        aiAnalysis: true,
      },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (presentation.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already analyzed
    if (presentation.aiAnalysis) {
      return NextResponse.json(
        { error: 'Presentation already analyzed' },
        { status: 400 }
      );
    }

    // Get optional transcript from request body
    const body = await request.json().catch(() => ({}));
    const providedTranscript = body.transcript as string | undefined;

    // For TEXT_SCRIPT presentations, use the script
    // For VIDEO presentations, use provided transcript or generate mock
    let transcript: string;

    if (presentation.type === 'TEXT_SCRIPT') {
      transcript = presentation.scriptText || '';
      if (!transcript) {
        return NextResponse.json(
          { error: 'Script text not found' },
          { status: 400 }
        );
      }
    } else {
      // For video presentations, we'd normally get transcript from Deepgram
      // For now, use provided transcript or generate mock
      transcript = providedTranscript || generateMockTranscript();
    }

    // Duration: use presentation duration or estimate from transcript
    const durationSeconds = presentation.duration || Math.ceil(transcript.split(/\s+/).length / 2.5); // ~150 wpm average

    // Perform AI analysis
    const analysis = await analyzePresentation(
      transcript,
      durationSeconds,
      presentation.user.goals
    );

    // Check if user has enough credits
    if (presentation.user.creditBalance < analysis.creditsSpent) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: analysis.creditsSpent },
        { status: 402 }
      );
    }

    // Deduct credits
    await deductCredits(
      presentation.userId,
      analysis.creditsSpent,
      'AI_ANALYSIS',
      presentation.id
    );

    // Store analysis results
    const aiAnalysis = await db.aIAnalysis.create({
      data: {
        presentationId: presentation.id,
        transcript: analysis.transcript,
        deliveryMetrics: analysis.deliveryMetrics as any,
        contentAnalysis: analysis.contentAnalysis as any,
        overallScore: analysis.overallScore,
        creditsSpent: analysis.creditsSpent,
      },
    });

    // Update presentation status to READY
    await db.presentation.update({
      where: { id },
      data: { status: 'READY' },
    });

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      creditsSpent: analysis.creditsSpent,
    });
  } catch (error) {
    console.error('Analysis error:', error);

    // Update presentation status to FAILED
    const { id } = await params;
    await db.presentation.update({
      where: { id },
      data: { status: 'FAILED' },
    }).catch(() => {}); // Ignore errors here

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
