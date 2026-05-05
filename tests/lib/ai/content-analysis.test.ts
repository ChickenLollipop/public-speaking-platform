import { analyzeContent } from '@/lib/ai/content-analysis';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                has_intro: true,
                has_conclusion: true,
                structure_score: 85,
                clarity_feedback: 'Clear and well-organized',
                persuasiveness_score: 80,
                weak_transitions: ['Transition between point 2 and 3'],
                improvement_suggestions: [
                  'Add more examples',
                  'Strengthen the conclusion',
                ],
              }),
            },
          ],
        }),
      },
    })),
  };
});

describe('Content analysis', () => {
  it('should analyze content and return structured feedback', async () => {
    const transcript = 'Hello everyone. Today I will talk about three main points...';
    const duration = 180;

    const analysis = await analyzeContent(transcript, duration);

    expect(analysis.has_intro).toBe(true);
    expect(analysis.has_conclusion).toBe(true);
    expect(analysis.structure_score).toBe(85);
    expect(analysis.persuasiveness_score).toBe(80);
    expect(analysis.improvement_suggestions.length).toBeGreaterThan(0);
  });
});
