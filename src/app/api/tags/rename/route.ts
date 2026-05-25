import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { validateTagName, normalizeTag } from '@/lib/validation/tags';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { oldName, newName } = body;

    // Validate both inputs are provided and required
    if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
      return NextResponse.json(
        { error: 'oldName is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return NextResponse.json(
        { error: 'newName is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Normalize both names
    const normalizedOld = normalizeTag(oldName);
    const normalizedNew = normalizeTag(newName);

    // Validate that oldName !== newName after normalization
    if (normalizedOld === normalizedNew) {
      return NextResponse.json(
        { error: 'oldName and newName cannot be the same' },
        { status: 400 }
      );
    }

    // Validate newName with validateTagName
    const validation = validateTagName(normalizedNew);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Find all user presentations with oldName in tags array
    const presentations = await db.presentation.findMany({
      where: {
        userId: auth.user.userId,
        tags: {
          has: normalizedOld,
        },
      },
      select: {
        id: true,
        tags: true,
      },
    });

    // Update each presentation in Prisma transaction
    const result = await db.$transaction(
      presentations.map((presentation) => {
        // Replace oldName with newName and remove duplicates
        const updatedTags = presentation.tags
          .map((tag) => (tag === normalizedOld ? normalizedNew : tag))
          .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates

        return db.presentation.update({
          where: { id: presentation.id },
          data: { tags: updatedTags },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: result.length,
      message: `Successfully renamed tag "${normalizedOld}" to "${normalizedNew}" across ${result.length} presentation(s)`,
    });
  } catch (error) {
    console.error('Rename tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
