import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import { join } from 'path';
import { getDeepgramClient, isDeepgramConfigured } from './client';
import { getS3Client, S3_BUCKET_NAME, isS3Configured } from '@/lib/s3/client';

export interface TranscriptionResult {
  transcript: string;
  durationSeconds: number;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

function isNonRetryableError(error: any): boolean {
  // Don't retry client errors (400, 401, 402, 403, 404)
  if (error.status && error.status >= 400 && error.status < 500) {
    return true;
  }

  // Don't retry unsupported format errors
  if (error.message?.includes('unsupported') ||
      error.message?.includes('invalid format')) {
    return true;
  }

  return false;
}

async function transcribeVideoOnce(videoKey: string): Promise<TranscriptionResult> {
  let videoStream: Readable;

  if (isS3Configured) {
    // Fetch video from S3
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
    });

    const response = await s3Client.send(command);
    videoStream = response.Body as Readable;
  } else {
    // Use local file (mock mode)
    const fileName = videoKey.replace(/\//g, '_');
    const filePath = join(process.cwd(), 'uploads', fileName);
    videoStream = createReadStream(filePath);
  }

  // Configure Deepgram options
  const options = {
    model: 'nova-2',
    smart_format: true,
    language: 'en',
    punctuate: true,
    utterances: false,
    diarize: false,
  };

  // Transcribe with Deepgram
  const deepgram = getDeepgramClient();
  const { result } = await deepgram.listen.prerecorded.transcribeFile(
    videoStream,
    options
  );

  // Parse response
  if (!result) {
    throw new Error('Deepgram returned null result');
  }

  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  return {
    transcript: alternative.transcript,
    durationSeconds: Math.round(result.metadata.duration),
    confidence: alternative.confidence,
    words: alternative.words,
  };
}

export async function transcribeVideo(
  videoKey: string,
  maxRetries: number = 3
): Promise<TranscriptionResult> {
  // TEMPORARY: Always use mock mode for testing KIMI AI integration
  // Remove this block to re-enable real Deepgram transcription
  console.log('[Mock Transcription] Using mock transcript for KIMI AI testing');
  return {
    transcript: 'This is a mock transcript for testing KIMI AI. Hello everyone, thank you for being here today. I want to talk about the importance of effective communication in public speaking. First, let me share three key points. Number one, clear structure is essential. Every presentation should have a beginning, middle, and end. This helps your audience follow along and understand your message. Number two, engaging your audience matters tremendously. Make eye contact, use appropriate gestures, and vary your tone to keep people interested. Number three, practice makes perfect. The more you present, the more confident you become. However, I noticed some weak transitions between my main points. In conclusion, by following these principles you will become a much better speaker. Thank you all for your attention and I look forward to your questions.',
    durationSeconds: 120,
    confidence: 0.95,
    words: []
  };

  // Mock mode for development without Deepgram API key
  if (!isDeepgramConfigured) {
    console.log('[Mock Transcription] Using mock transcript for development');
    return {
      transcript: 'This is a mock transcript for development. Configure DEEPGRAM_API_KEY for real transcription. Hello everyone, thank you for being here today. I want to talk about the importance of effective communication in public speaking. First, let me share three key points. Number one, clear structure is essential. Every presentation should have a beginning, middle, and end. Number two, engaging your audience matters. Make eye contact, use gestures, and vary your tone. Number three, practice makes perfect. The more you present, the more confident you become. In conclusion, these principles will help you become a better speaker. Thank you for your attention.',
      durationSeconds: 120,
      confidence: 0.95,
      words: []
    };
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeVideoOnce(videoKey);
    } catch (error: any) {
      lastError = error;

      // Don't retry on these errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      // Last attempt?
      if (attempt === maxRetries) {
        throw new TranscriptionError(
          `Transcription failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
          'MAX_RETRIES_EXCEEDED',
          false
        );
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
