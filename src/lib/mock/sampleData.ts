export interface MockAnalysis {
  transcript: string;
  duration: number;
  wordCount: number;
  speakingRate: number;
  pauseCount: number;
  averagePauseDuration: number;
  fillerWords: {
    word: string;
    count: number;
  }[];
  overallScore: number;
  clarityScore: number;
  paceScore: number;
  confidenceScore: number;
  engagementScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export const mockAnalysis: MockAnalysis = {
  transcript: "Hello everyone, thank you for being here today. Um, I'm really excited to talk about, uh, the future of technology and how it's going to, like, transform our lives. So, let me start by saying that innovation is, you know, really important. The way we work, the way we communicate, and uh, the way we solve problems is changing rapidly. I believe that, um, embracing these changes will help us create a better future for everyone.",
  duration: 45,
  wordCount: 87,
  speakingRate: 116,
  pauseCount: 12,
  averagePauseDuration: 0.8,
  fillerWords: [
    { word: 'um', count: 3 },
    { word: 'uh', count: 2 },
    { word: 'like', count: 1 },
    { word: 'you know', count: 1 },
  ],
  overallScore: 72,
  clarityScore: 68,
  paceScore: 75,
  confidenceScore: 70,
  engagementScore: 76,
  strengths: [
    'Good opening that engages the audience',
    'Clear topic introduction',
    'Positive and enthusiastic tone',
    'Reasonable speaking pace',
  ],
  improvements: [
    'Reduce filler words (um, uh, like) - detected 7 instances',
    'Add more specific examples to support your points',
    'Work on smoother transitions between ideas',
    'Practice to reduce pauses and increase fluency',
  ],
  detailedFeedback: `Your presentation shows promise with a strong opening and clear enthusiasm for the topic. However, there are several areas for improvement:

**Filler Words**: You used 7 filler words in a 45-second speech, which can distract from your message. Practice pausing silently instead of using "um" or "uh".

**Content Depth**: While you introduced the topic well, adding specific examples would make your message more compelling and memorable.

**Fluency**: The 12 pauses suggest some hesitation. More practice with your content will help you deliver more smoothly and confidently.

Keep working on these areas, and your presentation skills will improve significantly!`,
};

export function generateMockAnalysis(customTranscript?: string): MockAnalysis {
  const transcript = customTranscript || mockAnalysis.transcript;
  const wordCount = transcript.split(/\s+/).length;
  const duration = Math.floor(wordCount / 1.5); // Approximate duration
  const speakingRate = Math.floor((wordCount / duration) * 60);

  // Count filler words
  const fillerWordCounts = [
    { word: 'um', count: (transcript.match(/\bum\b/gi) || []).length },
    { word: 'uh', count: (transcript.match(/\buh\b/gi) || []).length },
    { word: 'like', count: (transcript.match(/\blike\b/gi) || []).length },
    { word: 'you know', count: (transcript.match(/you know/gi) || []).length },
  ].filter(fw => fw.count > 0);

  const totalFillerWords = fillerWordCounts.reduce((sum, fw) => sum + fw.count, 0);

  // Generate scores based on content analysis
  const clarityScore = Math.max(50, 100 - totalFillerWords * 5);
  const paceScore = speakingRate >= 100 && speakingRate <= 150 ? 80 : 65;
  const confidenceScore = Math.max(50, 85 - totalFillerWords * 3);
  const engagementScore = wordCount > 50 ? 75 : 60;
  const overallScore = Math.floor(
    (clarityScore + paceScore + confidenceScore + engagementScore) / 4
  );

  return {
    transcript,
    duration,
    wordCount,
    speakingRate,
    pauseCount: Math.floor(wordCount / 8),
    averagePauseDuration: 0.7 + Math.random() * 0.4,
    fillerWords: fillerWordCounts,
    overallScore,
    clarityScore,
    paceScore,
    confidenceScore,
    engagementScore,
    strengths: [
      'Clear articulation',
      'Good topic introduction',
      speakingRate >= 100 && speakingRate <= 150 ? 'Appropriate speaking pace' : 'Enthusiastic delivery',
      'Engaging tone',
    ],
    improvements: [
      totalFillerWords > 5 ? `Reduce filler words - detected ${totalFillerWords} instances` : 'Maintain current fluency',
      'Add more specific examples',
      'Work on smoother transitions',
      'Practice to increase confidence',
    ],
    detailedFeedback: `Your presentation scored ${overallScore}/100. ${
      totalFillerWords > 5
        ? `Focus on reducing filler words (${totalFillerWords} detected).`
        : 'Good fluency overall.'
    } Your speaking rate of ${speakingRate} words per minute is ${
      speakingRate >= 100 && speakingRate <= 150 ? 'ideal' : 'could be adjusted'
    }. Continue practicing to enhance your delivery and confidence.`,
  };
}
