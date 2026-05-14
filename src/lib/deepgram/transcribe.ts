import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getDeepgramClient } from './client';
import { getS3Client, S3_BUCKET_NAME } from '@/lib/s3/client';

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
  // Fetch video from S3
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: videoKey,
  });

  const response = await s3Client.send(command);
  const videoStream = response.Body as Readable;

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
