export interface DeliveryMetrics {
  pace_wpm: number;
  filler_word_count: number;
  filler_words_list: string[];
  avg_volume: number;
  pause_count: number;
  eye_contact_score: number;
}

const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bso\b/gi,
  /\bactually\b/gi,
  /\bbasically\b/gi,
];

export function calculateDeliveryMetrics(
  transcript: string,
  durationSeconds: number,
  _audioData?: Float32Array
): DeliveryMetrics {
  // Calculate pace (words per minute)
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const minutes = durationSeconds / 60;
  const pace_wpm = minutes > 0 ? Math.round(words.length / minutes) : 0;

  // Detect filler words
  const filler_words_list: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  for (const pattern of FILLER_PATTERNS) {
    const matches = lowerTranscript.match(pattern);
    if (matches) {
      filler_words_list.push(...matches);
    }
  }

  const filler_word_count = filler_words_list.length;

  // Placeholder values for audio analysis (would require actual audio processing)
  const avg_volume = 0.5; // 0-1 scale
  const pause_count = 0;
  const eye_contact_score = 50; // 0-100 scale

  return {
    pace_wpm,
    filler_word_count,
    filler_words_list,
    avg_volume,
    pause_count,
    eye_contact_score,
  };
}
