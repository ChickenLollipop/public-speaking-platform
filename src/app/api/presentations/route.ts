import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { createPresentationSchema } from '@/lib/validation/schemas';
import { validateTags, normalizeTag } from '@/lib/validation/tags';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const validation = createPresentationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, type, visibility } = validation.data;

    // Extract and validate tags
    const tags = Array.isArray(body.tags) ? body.tags : [];
    let normalizedTags: string[] = [];

    if (tags.length > 0) {
      const tagsValidation = validateTags(tags);
      if (!tagsValidation.valid) {
        return NextResponse.json(
          { error: tagsValidation.error },
          { status: 400 }
        );
      }
      normalizedTags = tags.map(normalizeTag);
    }

    const presentation = await db.presentation.create({
      data: {
        userId: auth.user.userId,
        title,
        description,
        type,
        visibility,
        status: 'PROCESSING',
        tags: normalizedTags,
      },
    });

    return NextResponse.json({ presentation }, { status: 201 });
  } catch (error) {
    console.error('Create presentation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const presentations = await db.presentation.findMany({
      where: { userId: auth.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        aiAnalysis: true,
      },
    });

    return NextResponse.json({ presentations });
  } catch (error) {
    console.error('List presentations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
