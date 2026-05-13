# S3 Setup Guide

This guide covers different options for video storage in the Public Speaking Platform.

## Option 1: Mock Mode (Local Development)

For local development without AWS, the application runs in **mock mode** by default when AWS credentials are not configured.

### How It Works

- Upload URLs point to local mock endpoints (`/api/mock-upload/...`)
- Video URLs point to local mock endpoints (`/api/mock-video/...`)
- No actual S3 connection is made
- Perfect for testing UI flows without AWS setup

### Setup

Simply leave the AWS environment variables commented out in `.env`:

```bash
# AWS S3 - leave empty for mock mode
# AWS_REGION="us-east-1"
# AWS_ACCESS_KEY_ID="your-access-key"
# AWS_SECRET_ACCESS_KEY="your-secret-key"
# S3_BUCKET_NAME="speaking-platform-videos"
```

### Limitations

- Videos are not actually stored
- Cannot test real video processing
- AI analysis will not work without video transcription

---

## Option 2: AWS S3 (Production)

For production or testing with real video storage.

### Prerequisites

1. AWS Account
2. S3 Bucket created
3. IAM user with S3 permissions

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://speaking-platform-videos --region us-east-1
```

Or via AWS Console:
1. Go to S3 Console
2. Click "Create bucket"
3. Name: `speaking-platform-videos` (or your choice)
4. Region: `us-east-1` (or your choice)
5. Block all public access: **Disabled** (for presigned URLs)
6. Click "Create bucket"

### Step 2: Configure CORS

Add this CORS configuration to your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 3: Create IAM User

1. Go to IAM Console
2. Create new user: `speaking-platform-uploader`
3. Attach policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::speaking-platform-videos/*"
    }
  ]
}
```

4. Generate access key
5. Save credentials securely

### Step 4: Configure Environment Variables

Update `.env`:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
S3_BUCKET_NAME="speaking-platform-videos"
```

### Step 5: Test

```bash
npm run dev
```

Upload a video through the UI at http://localhost:3000/practice

---

## Option 3: LocalStack (Local S3 Alternative)

For local development with S3-compatible storage.

### Prerequisites

- Docker installed

### Step 1: Start LocalStack

```bash
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -e SERVICES=s3 \
  localstack/localstack
```

### Step 2: Create Bucket

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://speaking-platform-videos
```

### Step 3: Configure Environment

Update `.env`:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"
S3_BUCKET_NAME="speaking-platform-videos"
AWS_ENDPOINT_URL="http://localhost:4566"
```

### Step 4: Update S3 Client

Modify `src/lib/s3/client.ts` to use endpoint URL:

```typescript
export function getS3Client(): S3Client {
  if (!isS3Configured) {
    throw new Error('S3 is not configured.');
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: awsRegion || 'us-east-1',
      endpoint: process.env.AWS_ENDPOINT_URL, // Add this line
      credentials: {
        accessKeyId: awsAccessKeyId!,
        secretAccessKey: awsSecretAccessKey!,
      },
      forcePathStyle: true, // Required for LocalStack
    });
  }

  return s3Client;
}
```

---

## Option 4: MinIO (Self-Hosted S3)

For self-hosted S3-compatible storage.

### Step 1: Start MinIO

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### Step 2: Access Console

Open http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

### Step 3: Create Bucket

1. Click "Buckets" → "Create Bucket"
2. Name: `speaking-platform-videos`
3. Set access policy to "public" for presigned URLs

### Step 4: Configure Environment

Update `.env`:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_NAME="speaking-platform-videos"
AWS_ENDPOINT_URL="http://localhost:9000"
```

Use the same S3 client modifications as LocalStack (Option 3).

---

## Comparison

| Option | Cost | Setup | Best For |
|--------|------|-------|----------|
| **Mock Mode** | Free | None | UI development, quick testing |
| **AWS S3** | ~$0.023/GB | Medium | Production, real testing |
| **LocalStack** | Free | Easy | Local development with S3 features |
| **MinIO** | Free | Easy | Self-hosted, full control |

## Recommendation

- **Local Development**: Mock Mode (no setup) or LocalStack (S3 features)
- **Testing**: LocalStack or MinIO
- **Production**: AWS S3

---

## Troubleshooting

### Upload fails with CORS error

**Solution**: Check CORS configuration in S3 bucket settings

### Presigned URL expired

**Solution**: URLs expire after 1 hour. Request a new upload URL.

### Access denied

**Solution**: Verify IAM permissions allow `s3:PutObject` on bucket

### Connection refused (LocalStack/MinIO)

**Solution**: Ensure Docker container is running:
```bash
docker ps | grep localstack
docker ps | grep minio
```

---

## Security Best Practices

1. **Never commit AWS credentials** - Use `.env` (gitignored)
2. **Use IAM roles** in production (EC2, ECS, Lambda)
3. **Enable bucket encryption** at rest
4. **Set lifecycle policies** to delete old videos
5. **Monitor costs** with AWS Budgets
6. **Restrict CORS** to your domain only
7. **Use presigned URLs** instead of public access

---

## Next Steps

After setting up S3:

1. Test video upload at `/practice`
2. Configure Deepgram for transcription (see `DEEPGRAM_SETUP.md`)
3. Configure Anthropic API for AI analysis (see `AI_SETUP.md`)
