import Anthropic from '@anthropic-ai/sdk';

export interface ContentAnalysis {
  has_intro: boolean;
  has_conclusion: boolean;
  structure_score: number;
  clarity_feedback: string;
  persuasiveness_score: number;
  weak_transitions: string[];
  improvement_suggestions: string[];
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeContent(
  transcript: string,
  durationSeconds: number,
  userGoals?: string[]
): Promise<ContentAnalysis> {
  const minutes = Math.round(durationSeconds / 60);

  const prompt = `You are analyzing a presentation transcript. Provide structured feedback on:

1. STRUCTURE (0-100):
   - Does it have a clear introduction, body, and conclusion?
   - Are main points organized logically?

2. CLARITY (0-100):
   - Are ideas well-explained?
   - Any confusing or unclear sections?

3. PERSUASIVENESS (0-100):
   - Are arguments effective?
   - Does it use examples and evidence?
   - Is the message compelling?

4. TRANSITIONS:
   - List any weak transitions between sections
   - Rate overall flow

5. IMPROVEMENT SUGGESTIONS:
   - Provide 3-5 specific, actionable recommendations

TRANSCRIPT:
${transcript}

CONTEXT:
- Duration: ${minutes} minutes
${userGoals ? `- Speaker goals: ${userGoals.join(', ')}` : ''}

Return response as JSON matching this schema:
{
  "has_intro": boolean,
  "has_conclusion": boolean,
  "structure_score": number,
  "clarity_feedback": string,
  "persuasiveness_score": number,
  "weak_transitions": string[],
  "improvement_suggestions": string[]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Invalid response from API');
  }

  const analysis = JSON.parse(textContent.text) as ContentAnalysis;
  return analysis;
}
