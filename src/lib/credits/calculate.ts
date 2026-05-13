export function calculateAIAnalysisCost(
  durationSeconds: number,
  analysisType: 'basic' | 'full'
): number {
  if (analysisType === 'basic') {
    return 0; // Basic AI is always free
  }

  // Full AI: 1 credit per 5 minutes, rounded up
  const minutes = Math.ceil(durationSeconds / 60);
  return Math.ceil(minutes / 5);
}

export function calculateFeedbackRequestCost(durationSeconds: number): number {
  // 1 credit per minute, rounded up
  return Math.ceil(durationSeconds / 60);
}

export interface FeedbackEarnings {
  base: number;
  multiplier: number;
  final: number;
}

export function calculateFeedbackEarnings(
  durationSeconds: number,
  feedbackWordCount: number,
  recipientRating: number | null
): FeedbackEarnings {
  // Calculate base credits by duration
  const minutes = durationSeconds / 60;
  let base: number;

  if (minutes < 5) {
    base = 3;
  } else if (minutes < 10) {
    base = 5;
  } else if (minutes < 20) {
    base = 8;
  } else {
    base = 12;
  }

  // If no rating yet, return base only
  if (recipientRating === null) {
    return { base, multiplier: 1.0, final: base };
  }

  // Calculate quality multiplier
  let multiplier: number;
  const isDetailed = feedbackWordCount >= 200;

  if (recipientRating === 5 && isDetailed) {
    multiplier = 2.0;
  } else if (recipientRating >= 4) {
    multiplier = 1.5;
  } else if (recipientRating >= 3) {
    multiplier = 1.0;
  } else {
    multiplier = 0.5;
  }

  return {
    base,
    multiplier,
    final: base * multiplier,
  };
}

/**
 * Calculate transcription cost based on video duration
 *
 * Formula: 1 credit per minute (rounded up)
 * Minimum: 1 credit
 *
 * @param durationSeconds - Video duration in seconds
 * @returns Number of credits required
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  if (durationSeconds <= 0) {
    throw new Error('Duration must be positive');
  }

  const minutes = durationSeconds / 60;
  return Math.max(1, Math.ceil(minutes));
}
