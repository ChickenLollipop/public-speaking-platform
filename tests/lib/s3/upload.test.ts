import { generateUploadUrl, generateVideoKey } from '@/lib/s3/upload';

describe('S3 upload utilities', () => {
  describe('generateVideoKey', () => {
    it('should generate unique S3 key with userId and timestamp', () => {
      const userId = 'user-123';
      const key1 = generateVideoKey(userId);

      expect(key1).toContain(`videos/${userId}/`);
      expect(key1).toMatch(/\.mp4$/);

      // Keys should be different on subsequent calls
      const key2 = generateVideoKey(userId);
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate presigned URL', async () => {
      const userId = 'user-123';
      const result = await generateUploadUrl(userId);

      expect(result.url).toBeTruthy();
      expect(result.key).toContain(`videos/${userId}/`);
      expect(result.url).toContain(result.key);
      expect(result.url).toContain('X-Amz-Signature');
    });
  });
});
