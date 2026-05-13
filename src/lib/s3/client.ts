import { S3Client } from '@aws-sdk/client-s3';

const awsRegion = process.env.AWS_REGION;
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Flag to check if S3 is configured
export const isS3Configured = Boolean(awsAccessKeyId && awsSecretAccessKey);

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!isS3Configured) {
    throw new Error(
      'S3 is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: awsAccessKeyId!,
        secretAccessKey: awsSecretAccessKey!,
      },
    });
  }

  return s3Client;
}

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'speaking-platform-dev';
export const S3_BUCKET_REGION = awsRegion || 'us-east-1';
