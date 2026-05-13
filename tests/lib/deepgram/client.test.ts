import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Deepgram Client', () => {
  const originalEnv = process.env.DEEPGRAM_API_KEY;

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.DEEPGRAM_API_KEY = originalEnv;
    } else {
      delete process.env.DEEPGRAM_API_KEY;
    }
    // Clear module cache
    jest.resetModules();
  });

  it('throws error when API key is missing', () => {
    delete process.env.DEEPGRAM_API_KEY;

    jest.isolateModules(() => {
      const { getDeepgramClient } = require('@/lib/deepgram/client');
      expect(() => getDeepgramClient()).toThrow('DEEPGRAM_API_KEY environment variable is required');
    });
  });

  it('exports isDeepgramConfigured as true when API key exists', () => {
    process.env.DEEPGRAM_API_KEY = 'test-key';

    jest.isolateModules(() => {
      const { isDeepgramConfigured } = require('@/lib/deepgram/client');
      expect(isDeepgramConfigured).toBe(true);
    });
  });

  it('exports isDeepgramConfigured as false when API key missing', () => {
    delete process.env.DEEPGRAM_API_KEY;

    jest.isolateModules(() => {
      const { isDeepgramConfigured } = require('@/lib/deepgram/client');
      expect(isDeepgramConfigured).toBe(false);
    });
  });
});
