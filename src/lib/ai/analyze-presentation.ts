import { analyzeContent, ContentAnalysis } from './content-analysis';
import { calculateDeliveryMetrics, DeliveryMetrics } from './delivery-metrics';

export interface PresentationAnalysis {
  transcript: string;
  deliveryMetrics: DeliveryMetrics;
  contentAnalysis: ContentAnalysis;
  overallScore: number;
  creditsSpent: number;
}

/**
 * Calculate overall score from delivery and content metrics
 */
function calculateOverallScore(
  delivery: DeliveryMetrics,
  content: ContentAnalysis
): number {
  // Pace score (optimal: 120-150 wpm)
  let paceScore = 0;
  if (delivery.pace_wpm >= 120 && delivery.pace_wpm <= 150) {
    paceScore = 100;
  } else if (delivery.pace_wpm >= 100 && delivery.pace_wpm <= 170) {
    paceScore = 80;
  } else if (delivery.pace_wpm >= 80 && delivery.pace_wpm <= 190) {
    paceScore = 60;
  } else {
    paceScore = 40;
  }

  // Filler word penalty (deduct for excessive fillers)
  const fillerPenalty = Math.min(30, delivery.filler_word_count * 2);
  const fillerScore = Math.max(0, 100 - fillerPenalty);

  // Content scores
  const structureScore = content.structure_score;
  const persuasivenessScore = content.persuasiveness_score;

  // Weighted average
  const overall = Math.round(
    paceScore * 0.2 +
    fillerScore * 0.2 +
    structureScore * 0.3 +
    persuasivenessScore * 0.3
  );

  return Math.min(100, Math.max(0, overall));
}

/**
 * Calculate credits spent based on analysis complexity
 */
function calculateCreditsSpent(transcript: string, durationSeconds: number): number {
  const wordCount = transcript.split(/\s+/).length;
  const minutes = durationSeconds / 60;

  // Base cost: 5 credits
  // + 1 credit per minute
  // + 1 credit per 100 words
  const baseCost = 5;
  const durationCost = Math.ceil(minutes);
  const wordCost = Math.ceil(wordCount / 100);

  return baseCost + durationCost + wordCost;
}

/**
 * Analyze a presentation transcript
 *
 * This function:
 * 1. Calculates delivery metrics (pace, filler words, etc.)
 * 2. Analyzes content with AI (structure, clarity, persuasiveness)
 * 3. Computes an overall score
 * 4. Returns comprehensive analysis results
 */
export async function analyzePresentation(
  transcript: string,
  durationSeconds: number,
  userGoals?: string[]
): Promise<PresentationAnalysis> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript cannot be empty');
  }

  if (durationSeconds <= 0) {
    throw new Error('Duration must be positive');
  }

  // Calculate delivery metrics (synchronous, rule-based)
  const deliveryMetrics = calculateDeliveryMetrics(transcript, durationSeconds);

  // Analyze content with AI (async, LLM-based)
  const contentAnalysis = await analyzeContent(
    transcript,
    durationSeconds,
    userGoals
  );

  // Calculate overall score
  const overallScore = calculateOverallScore(deliveryMetrics, contentAnalysis);

  // Calculate credits spent
  const creditsSpent = calculateCreditsSpent(transcript, durationSeconds);

  return {
    transcript,
    deliveryMetrics,
    contentAnalysis,
    overallScore,
    creditsSpent,
  };
}

/**
 * Generate a mock transcript for testing (when no real transcript is available)
 */
export function generateMockTranscript(): string {
  return `Hello everyone, thank you for being here today.

I'm excited to share with you our vision for the future of public speaking practice. Um, as many of you know, practicing presentations can be challenging, and like, getting quality feedback is even harder.

Today I want to talk about three main points. First, the importance of regular practice. Second, how AI can provide instant feedback. And finally, how community feedback adds the human touch that AI cannot replicate.

Let me start with practice. You know, becoming a better speaker requires consistent effort. Research shows that speakers who practice regularly improve 3x faster than those who don't. So, regular practice is essential.

Now, moving to AI feedback. Artificial intelligence can analyze your pace, detect filler words, and evaluate your content structure instantly. This immediate feedback helps you iterate quickly and improve faster.

Finally, community feedback provides that human perspective. Real people can tell you if your message resonated, if your examples were effective, and if your delivery felt authentic. This combination of AI and human feedback is powerful.

In conclusion, by combining regular practice, AI analysis, and community feedback, you can become a confident, effective speaker. Thank you for your time, and I'm happy to answer any questions.`;
}
