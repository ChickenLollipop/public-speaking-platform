import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { getS3Client, S3_BUCKET_NAME, S3_BUCKET_REGION } from './client';

export function generateVideoKey(userId: string): string {
  if (!userId || userId.includes('/') || userId.includes('\\')) {
    throw new Error('Invalid userId');
  }
  const timestamp = Date.now();
  const random = randomBytes(16).toString('hex');
  return `videos/${userId}/${timestamp}-${random}.mp4`;
}

export async function generateUploadUrl(userId: string): Promise<{
  url: string;
  key: string;
}> {
  const key = generateVideoKey(userId);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: 'video/mp4',
  });

  const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour

  return { url, key };
}

export function getVideoUrl(key: string): string {
  if (!key || key.includes('..')) {
    throw new Error('Invalid S3 key');
  }
  return `https://${S3_BUCKET_NAME}.s3.${S3_BUCKET_REGION}.amazonaws.com/${key}`;
}
