import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, S3_BUCKET_NAME } from './client';

export function generateVideoKey(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
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
  const region = process.env.S3_BUCKET_REGION || 'us-east-1';
  return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}
