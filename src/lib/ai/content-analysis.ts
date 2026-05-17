import OpenAI from 'openai';

export interface ContentAnalysis {
  has_intro: boolean;
  has_conclusion: boolean;
  structure_score: number;
  clarity_feedback: string;
  persuasiveness_score: number;
  weak_transitions: string[];
  improvement_suggestions: string[];
}

const apiKey = process.env.KIMI_API_KEY;
export const isKimiConfigured = Boolean(apiKey);

let kimiClient: OpenAI | null = null;

function getKimiClient(): OpenAI {
  if (!isKimiConfigured) {
    throw new Error('KIMI_API_KEY environment variable is not configured');
  }
  if (!kimiClient) {
    kimiClient = new OpenAI({
      apiKey: apiKey!,
      baseURL: 'https://api.moonshot.ai/v1'
    });
  }
  return kimiClient;
}

export async function analyzeContent(
  transcript: string,
  durationSeconds: number,
  userGoals?: string[]
): Promise<ContentAnalysis> {
  // Mock mode for development without API key
  if (!isKimiConfigured) {
    return {
      has_intro: true,
      has_conclusion: true,
      structure_score: 75,
      clarity_feedback: 'Mock analysis: API key not configured. Your presentation appears well-structured with clear communication.',
      persuasiveness_score: 70,
      weak_transitions: ['Mock: No transitions analyzed without API key'],
      improvement_suggestions: [
        'Configure KIMI_API_KEY for real analysis',
        'Consider adding more specific examples',
        'Work on varying your pace for emphasis'
      ]
    };
  }

  const client = getKimiClient();
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

  try {
    const response = await client.chat.completions.create({
      model: 'kimi-k2.6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid response from API');
    }

    try {
      // Strip markdown code blocks if present
      let jsonText = content.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '');
      }

      const parsed = JSON.parse(jsonText);

      // Validate required fields exist
      if (typeof parsed.has_intro !== 'boolean' ||
          typeof parsed.has_conclusion !== 'boolean' ||
          typeof parsed.structure_score !== 'number' ||
          typeof parsed.clarity_feedback !== 'string' ||
          typeof parsed.persuasiveness_score !== 'number' ||
          !Array.isArray(parsed.weak_transitions) ||
          !Array.isArray(parsed.improvement_suggestions)) {
        throw new Error('Invalid response structure from API');
      }

      return parsed as ContentAnalysis;
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to parse')) {
      throw error; // Re-throw parsing errors with context
    }
    throw new Error(`Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
