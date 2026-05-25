import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { normalizeTag } from '@/lib/validation/tags';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // URL-decode and normalize the tag name
    const decodedName = decodeURIComponent(params.name);
    const tagName = normalizeTag(decodedName);

    // Validate tag name is not empty
    if (!tagName) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Find all user presentations with this tag
    const presentations = await db.presentation.findMany({
      where: {
        userId: auth.user.userId,
        tags: {
          has: tagName,
        },
      },
      select: {
        id: true,
        tags: true,
      },
    });

    // Remove tag from each presentation's array in Prisma transaction
    const result = await db.$transaction(
      presentations.map((presentation) => {
        const updatedTags = presentation.tags.filter((tag) => tag !== tagName);

        return db.presentation.update({
          where: { id: presentation.id },
          data: { tags: updatedTags },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: result.length,
      message: `Successfully deleted tag "${tagName}" from ${result.length} presentation(s)`,
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
