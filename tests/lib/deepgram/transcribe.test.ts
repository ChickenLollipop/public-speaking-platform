import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Readable } from 'stream';

describe('transcribeVideo', () => {
  // Create mock functions
  const mockTranscribeFile = jest.fn();
  const mockS3Send = jest.fn();

  // Store original module registry
  let transcribeVideo: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Mock the dependencies
    jest.doMock('@/lib/deepgram/client', () => ({
      getDeepgramClient: jest.fn(() => ({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      })),
    }));

    jest.doMock('@/lib/s3/client', () => ({
      getS3Client: jest.fn(() => ({
        send: mockS3Send,
      })),
      S3_BUCKET_NAME: 'test-bucket',
    }));

    // Import the module after mocking
    const module = await import('@/lib/deepgram/transcribe');
    transcribeVideo = module.transcribeVideo;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('successfully transcribes a video', async () => {
    // Mock S3 response
    const mockStream = Readable.from(['mock video data']);
    mockS3Send.mockResolvedValue({
      Body: mockStream,
    });

    // Mock Deepgram response
    mockTranscribeFile.mockResolvedValue({
      result: {
        results: {
          channels: [{
            alternatives: [{
              transcript: 'Hello world this is a test',
              confidence: 0.95,
              words: [
                { word: 'hello', start: 0.0, end: 0.5, confidence: 0.98 },
                { word: 'world', start: 0.6, end: 1.0, confidence: 0.97 },
              ],
            }],
          }],
        },
        metadata: {
          duration: 30.5,
          model_uuid: 'nova-2',
          request_id: 'test-123',
        },
      },
    });

    const result = await transcribeVideo('videos/user123/test.mp4');

    expect(result).toEqual({
      transcript: 'Hello world this is a test',
      durationSeconds: 31,
      confidence: 0.95,
      words: [
        { word: 'hello', start: 0.0, end: 0.5, confidence: 0.98 },
        { word: 'world', start: 0.6, end: 1.0, confidence: 0.97 },
      ],
    });
  });

  it('retries on network error', async () => {
    const mockStream = Readable.from(['mock video data']);
    mockS3Send.mockResolvedValue({ Body: mockStream });

    // First attempt fails, second succeeds
    mockTranscribeFile
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        result: {
          results: {
            channels: [{
              alternatives: [{
                transcript: 'Retry success',
                confidence: 0.9,
                words: [],
              }],
            }],
          },
          metadata: { duration: 10 },
        },
      });

    const result = await transcribeVideo('videos/test.mp4');

    expect(result.transcript).toBe('Retry success');
    expect(mockTranscribeFile).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400 error', async () => {
    const mockStream = Readable.from(['mock video data']);
    mockS3Send.mockResolvedValue({ Body: mockStream });

    const error400 = new Error('Bad request');
    (error400 as any).status = 400;
    mockTranscribeFile.mockRejectedValue(error400);

    await expect(transcribeVideo('videos/test.mp4')).rejects.toThrow('Bad request');
    expect(mockTranscribeFile).toHaveBeenCalledTimes(1);
  });

  it('fails after max retries', async () => {
    const mockStream = Readable.from(['mock video data']);
    mockS3Send.mockResolvedValue({ Body: mockStream });

    mockTranscribeFile.mockRejectedValue(
      new Error('Network error')
    );

    await expect(transcribeVideo('videos/test.mp4')).rejects.toThrow(
      'Transcription failed after 3 attempts'
    );
    expect(mockTranscribeFile).toHaveBeenCalledTimes(3);
  });
});
