import { createClient } from '@deepgram/sdk';

const apiKey = process.env.DEEPGRAM_API_KEY;

let deepgramClient: ReturnType<typeof createClient> | null = null;

export function getDeepgramClient() {
  if (!apiKey) {
    throw new Error(
      'DEEPGRAM_API_KEY environment variable is required. ' +
      'Get your API key from https://deepgram.com/'
    );
  }

  if (!deepgramClient) {
    deepgramClient = createClient(apiKey);
  }
  return deepgramClient;
}

export const isDeepgramConfigured = Boolean(apiKey);
