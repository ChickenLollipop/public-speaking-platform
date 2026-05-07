import { AIAnalysis } from '../types';

export const mockAnalysis: AIAnalysis = {
  id: 'analysis-1',
  presentationId: 'pres-1',
  transcript: `Welcome everyone to today's presentation on effective communication. I'm excited to share some insights about how we can improve our speaking skills. Um, public speaking is, you know, one of the most valuable skills in professional settings. Uh, when we communicate clearly, we can inspire others and, like, drive meaningful change. Let me walk you through some key principles that have helped me become a more confident speaker.`,
  deliveryMetrics: {
    pace_wpm: 142,
    filler_word_count: 8,
    filler_words_list: ['um (3x)', 'uh (2x)', 'you know (1x)', 'like (2x)'],
    avg_volume: -18,
    pause_count: 5,
    eye_contact_score: 72,
  },
  contentAnalysis: {
    has_intro: true,
    has_conclusion: true,
    structure_score: 85,
    clarity_feedback: 'Your presentation has a clear structure with a strong opening. The main points are well-organized, though some transitions could be smoother. Consider adding more specific examples to support your key arguments.',
    persuasiveness_score: 72,
    weak_transitions: [
      'Transition between introduction and main content could be strengthened',
      'Missing clear transition before concluding remarks',
    ],
    improvement_suggestions: [
      'Reduce filler words to improve fluency and professionalism',
      'Add concrete examples to illustrate abstract concepts',
      'Practice transitions between sections for smoother flow',
      'Maintain consistent eye contact to boost engagement',
      'Vary your pace to emphasize key points',
    ],
  },
  overallScore: 78,
  creditsSpent: 0,
  createdAt: new Date().toISOString(),
};

export function generateMockAnalysis(presentationId: string): AIAnalysis {
  return {
    ...mockAnalysis,
    id: `analysis-${Date.now()}`,
    presentationId,
    createdAt: new Date().toISOString(),
  };
}
