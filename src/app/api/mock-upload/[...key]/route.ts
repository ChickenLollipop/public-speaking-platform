import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const fullKey = key.join('/');

    console.log('[Mock Upload] Uploading:', fullKey);

    // Get video data
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Mock Upload] Size:', buffer.length, 'bytes');

    // Create uploads directory
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Save file (replace slashes with underscores for filename)
    const fileName = fullKey.replace(/\//g, '_');
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    console.log('[Mock Upload] Saved to:', filePath);

    return NextResponse.json({
      success: true,
      message: 'Mock upload successful',
      key: fullKey
    });
  } catch (error) {
    console.error('[Mock Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
