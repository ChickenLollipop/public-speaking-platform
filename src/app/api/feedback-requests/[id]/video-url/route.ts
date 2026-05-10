import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, S3_BUCKET_NAME } from '@/lib/s3/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    const feedbackRequest = await db.feedbackRequest.findUnique({
      where: { id },
      select: {
        requesterId: true,
        claimedBy: true,
        presentation: { select: { videoUrl: true } },
      },
    });

    if (!feedbackRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (
      feedbackRequest.requesterId !== auth.user.userId &&
      feedbackRequest.claimedBy !== auth.user.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const videoKey = feedbackRequest.presentation.videoUrl;
    if (!videoKey) {
      return NextResponse.json({ error: 'No video available' }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
    });

    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Get video URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
