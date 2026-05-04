import { getS3Client } from '@/lib/s3/client';
import { S3Client } from '@aws-sdk/client-s3';

describe('S3 client', () => {
  it('should export an S3Client instance', () => {
    const client = getS3Client();
    expect(client).toBeInstanceOf(S3Client);
  });

  it('should reuse the same instance', () => {
    const client1 = getS3Client();
    const client2 = getS3Client();
    expect(client1).toBe(client2);
  });
});
