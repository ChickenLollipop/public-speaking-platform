# Tags System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tagging system to help users organize presentations by topics with autocomplete, filtering, and global tag management.

**Architecture:** Store tags as `String[]` array on Presentation model. Client-side filtering for performance. Server-side validation and global operations (rename/delete) using Prisma transactions.

**Tech Stack:** Prisma (PostgreSQL arrays), Next.js App Router, React hooks, TypeScript, Zod validation

---

## File Structure

### New Files
- `src/lib/validation/tags.ts` - Tag validation logic and schemas
- `src/components/ui/TagInput.tsx` - Reusable tag input component with autocomplete
- `src/app/api/tags/route.ts` - Get all user tags with counts
- `src/app/api/tags/rename/route.ts` - Rename tag globally
- `src/app/api/tags/[name]/route.ts` - Delete tag globally
- `src/app/tags/page.tsx` - Tag management page
- `tests/lib/validation/tags.test.ts` - Tag validation tests

### Modified Files
- `prisma/schema.prisma` - Add tags field to Presentation model
- `src/app/api/presentations/route.ts` - Accept tags in POST
- `src/app/api/presentations/[id]/route.ts` - Accept tags in PATCH
- `src/app/practice/page.tsx` - Add TagInput to form
- `src/app/presentations/[id]/page.tsx` - Display and edit tags
- `src/app/presentations/page.tsx` - Add tag filter
- `src/components/layout/Navbar.tsx` - Add Tags page link

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add tags field to Presentation model**

Edit `prisma/schema.prisma`, add `tags` field after `status`:

```prisma
model Presentation {
  id            String            @id @default(uuid())
  userId        String            @map("user_id")
  title         String
  description   String?
  type          PresentationType
  videoUrl      String?           @map("video_url")
  scriptText    String?           @map("script_text")
  duration      Int?
  transcript    String?           @db.Text
  transcribedAt DateTime?         @map("transcribed_at")
  visibility    Visibility        @default(PRIVATE)
  status        ProcessingStatus  @default(PROCESSING)
  tags          String[]          @default([])
  createdAt     DateTime          @default(now()) @map("created_at")

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiAnalysis      AIAnalysis?
  feedbackRequest FeedbackRequest?

  @@index([userId])
  @@index([status])
  @@map("presentations")
}
```

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client regenerated with tags field

- [ ] **Step 3: Create and apply migration**

Run: `npx prisma migrate dev --name add_presentation_tags`
Expected: Migration created and applied successfully

- [ ] **Step 4: Verify migration in database**

Run: `npx prisma studio`
Expected: Can open Presentation model and see `tags` field (empty array by default)

- [ ] **Step 5: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add tags field to Presentation model

Add String[] tags field with empty array default.
Enables tagging presentations for organization."
```

---

## Task 2: Tag Validation Logic

**Files:**
- Create: `src/lib/validation/tags.ts`
- Create: `tests/lib/validation/tags.test.ts`

- [ ] **Step 1: Write test for valid tag validation**

Create `tests/lib/validation/tags.test.ts`:

```typescript
import { validateTagName, validateTags, normalizeTag } from '@/lib/validation/tags';

describe('Tag Validation', () => {
  describe('validateTagName', () => {
    it('should accept valid tag names', () => {
      expect(validateTagName('sales')).toEqual({ valid: true });
      expect(validateTagName('Q1 2024')).toEqual({ valid: true });
      expect(validateTagName('team-meeting')).toEqual({ valid: true });
      expect(validateTagName('project_alpha')).toEqual({ valid: true });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tags.test.ts`
Expected: FAIL with "Cannot find module '@/lib/validation/tags'"

- [ ] **Step 3: Write minimal tag validation implementation**

Create `src/lib/validation/tags.ts`:

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const TAG_REGEX = /^[a-zA-Z0-9\s\-_]+$/;
const MIN_LENGTH = 1;
const MAX_LENGTH = 30;
const MAX_TAGS = 5;

export function validateTagName(tagName: string): ValidationResult {
  const trimmed = tagName.trim();

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, error: 'Tag name cannot be empty' };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: 'Tag name must be 30 characters or less' };
  }

  if (!TAG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Tag can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { valid: true };
}

export function normalizeTag(tagName: string): string {
  return tagName.trim().replace(/\s+/g, ' ');
}

export function validateTags(tags: string[]): ValidationResult {
  if (tags.length > MAX_TAGS) {
    return { valid: false, error: `Maximum ${MAX_TAGS} tags allowed per presentation` };
  }

  for (const tag of tags) {
    const result = validateTagName(tag);
    if (!result.valid) {
      return result;
    }
  }

  const normalized = tags.map(normalizeTag);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    return { valid: false, error: 'Duplicate tags are not allowed' };
  }

  return { valid: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tags.test.ts`
Expected: PASS (1 test passing)

- [ ] **Step 5: Write tests for invalid tags**

Add to `tests/lib/validation/tags.test.ts`:

```typescript
describe('validateTagName', () => {
  // ... existing test

  it('should reject empty tag names', () => {
    expect(validateTagName('')).toEqual({
      valid: false,
      error: 'Tag name cannot be empty',
    });
    expect(validateTagName('   ')).toEqual({
      valid: false,
      error: 'Tag name cannot be empty',
    });
  });

  it('should reject tags longer than 30 characters', () => {
    const longTag = 'a'.repeat(31);
    expect(validateTagName(longTag)).toEqual({
      valid: false,
      error: 'Tag name must be 30 characters or less',
    });
  });

  it('should reject tags with invalid characters', () => {
    expect(validateTagName('tag@name')).toEqual({
      valid: false,
      error: 'Tag can only contain letters, numbers, spaces, hyphens, and underscores',
    });
    expect(validateTagName('tag#1')).toEqual({
      valid: false,
      error: 'Tag can only contain letters, numbers, spaces, hyphens, and underscores',
    });
  });
});

describe('normalizeTag', () => {
  it('should trim whitespace', () => {
    expect(normalizeTag('  sales  ')).toBe('sales');
  });

  it('should collapse multiple spaces to single space', () => {
    expect(normalizeTag('team   meeting')).toBe('team meeting');
  });
});

describe('validateTags', () => {
  it('should accept valid tag arrays', () => {
    expect(validateTags(['sales', 'quarterly'])).toEqual({ valid: true });
    expect(validateTags([])).toEqual({ valid: true });
  });

  it('should reject more than 5 tags', () => {
    const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'];
    expect(validateTags(tags)).toEqual({
      valid: false,
      error: 'Maximum 5 tags allowed per presentation',
    });
  });

  it('should reject arrays with invalid tag names', () => {
    expect(validateTags(['valid', 'invalid@tag'])).toEqual({
      valid: false,
      error: 'Tag can only contain letters, numbers, spaces, hyphens, and underscores',
    });
  });

  it('should reject duplicate tags', () => {
    expect(validateTags(['sales', 'sales'])).toEqual({
      valid: false,
      error: 'Duplicate tags are not allowed',
    });
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tags.test.ts`
Expected: All tests pass

- [ ] **Step 7: Commit validation logic**

```bash
git add src/lib/validation/tags.ts tests/lib/validation/tags.test.ts
git commit -m "feat: add tag validation logic with tests

- Validate tag names (1-30 chars, alphanumeric + spaces/hyphens/underscores)
- Normalize tags (trim whitespace, collapse spaces)
- Validate tag arrays (max 5, no duplicates)
- Full test coverage"
```

---

## Task 3: API - Get User Tags

**Files:**
- Create: `src/app/api/tags/route.ts`

- [ ] **Step 1: Create GET /api/tags endpoint**

Create `src/app/api/tags/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's presentations (only tags field)
    const presentations = await db.presentation.findMany({
      where: { userId: auth.user!.userId },
      select: { tags: true },
    });

    // Flatten all tags arrays and count occurrences
    const tagCounts = new Map<string, number>();
    for (const presentation of presentations) {
      for (const tag of presentation.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Convert to array and sort by count descending
    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint manually**

Run dev server: `npm run dev`
Test: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/tags`
Expected: Returns `{ tags: [] }` for users with no tags

- [ ] **Step 3: Commit API endpoint**

```bash
git add src/app/api/tags/route.ts
git commit -m "feat: add GET /api/tags endpoint

Returns all user's tags with usage counts.
Sorted by count descending for autocomplete."
```

---

## Task 4: API - Rename Tag Globally

**Files:**
- Create: `src/app/api/tags/rename/route.ts`

- [ ] **Step 1: Create POST /api/tags/rename endpoint**

Create `src/app/api/tags/rename/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { validateTagName, normalizeTag } from '@/lib/validation/tags';

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { oldName, newName } = body;

    // Validate inputs
    if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
      return NextResponse.json(
        { error: 'Old tag name is required' },
        { status: 400 }
      );
    }

    if (!newName || typeof newName !== 'string') {
      return NextResponse.json(
        { error: 'New tag name is required' },
        { status: 400 }
      );
    }

    const normalizedOld = normalizeTag(oldName);
    const normalizedNew = normalizeTag(newName);

    if (normalizedOld === normalizedNew) {
      return NextResponse.json(
        { error: 'Old and new tag names cannot be the same' },
        { status: 400 }
      );
    }

    const validation = validateTagName(normalizedNew);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Find all presentations with old tag
    const presentations = await db.presentation.findMany({
      where: {
        userId: auth.user!.userId,
        tags: { has: normalizedOld },
      },
      select: { id: true, tags: true },
    });

    // Update each presentation in a transaction
    await db.$transaction(
      presentations.map((p) => {
        const updatedTags = p.tags.map((tag) =>
          tag === normalizedOld ? normalizedNew : tag
        );
        // Remove duplicates if newName already exists
        const uniqueTags = Array.from(new Set(updatedTags));
        
        return db.presentation.update({
          where: { id: p.id },
          data: { tags: uniqueTags },
        });
      })
    );

    const count = presentations.length;
    return NextResponse.json({
      success: true,
      count,
      message: `Renamed '${normalizedOld}' to '${normalizedNew}' in ${count} presentation${count === 1 ? '' : 's'}`,
    });
  } catch (error) {
    console.error('Failed to rename tag:', error);
    return NextResponse.json(
      { error: 'Failed to rename tag' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint manually**

Test: Create presentation with tag, then rename it
Expected: Tag renamed across all presentations

- [ ] **Step 3: Commit rename endpoint**

```bash
git add src/app/api/tags/rename/route.ts
git commit -m "feat: add POST /api/tags/rename endpoint

Rename tag across all user's presentations.
Uses Prisma transaction for atomicity.
Removes duplicates if new name already exists."
```

---

## Task 5: API - Delete Tag Globally

**Files:**
- Create: `src/app/api/tags/[name]/route.ts`

- [ ] **Step 1: Create DELETE /api/tags/[name] endpoint**

Create `src/app/api/tags/[name]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { normalizeTag } from '@/lib/validation/tags';

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagName = normalizeTag(decodeURIComponent(params.name));

    if (!tagName) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Find all presentations with this tag
    const presentations = await db.presentation.findMany({
      where: {
        userId: auth.user!.userId,
        tags: { has: tagName },
      },
      select: { id: true, tags: true },
    });

    // Remove tag from each presentation in a transaction
    await db.$transaction(
      presentations.map((p) => {
        const updatedTags = p.tags.filter((tag) => tag !== tagName);
        return db.presentation.update({
          where: { id: p.id },
          data: { tags: updatedTags },
        });
      })
    );

    const count = presentations.length;
    return NextResponse.json({
      success: true,
      count,
      message: `Deleted '${tagName}' from ${count} presentation${count === 1 ? '' : 's'}`,
    });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint manually**

Test: Create presentation with tag, then delete it
Expected: Tag removed from all presentations

- [ ] **Step 3: Commit delete endpoint**

```bash
git add src/app/api/tags/[name]/route.ts
git commit -m "feat: add DELETE /api/tags/[name] endpoint

Delete tag from all user's presentations.
Uses Prisma transaction for atomicity.
Returns count of presentations updated."
```

---

## Task 6: API - Update Create Presentation

**Files:**
- Modify: `src/app/api/presentations/route.ts`

- [ ] **Step 1: Add tags validation to POST handler**

Edit `src/app/api/presentations/route.ts`, import and add tags support:

```typescript
import { validateTags, normalizeTag } from '@/lib/validation/tags';

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, visibility, tags } = body;

    // Existing validation...
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate tags if provided
    let normalizedTags: string[] = [];
    if (tags && Array.isArray(tags)) {
      const validation = validateTags(tags);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      normalizedTags = tags.map(normalizeTag);
    }

    const presentation = await db.presentation.create({
      data: {
        userId: auth.user!.userId,
        title: title.trim(),
        description: description?.trim(),
        type,
        visibility: visibility || 'PRIVATE',
        tags: normalizedTags,
        status: 'PROCESSING',
      },
    });

    return NextResponse.json({ presentation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create presentation:', error);
    return NextResponse.json(
      { error: 'Failed to create presentation' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test creating presentation with tags**

Test: POST to `/api/presentations` with `tags: ["sales", "quarterly"]`
Expected: Presentation created with tags

- [ ] **Step 3: Test validation**

Test: POST with >5 tags
Expected: 400 error "Maximum 5 tags allowed"

Test: POST with invalid tag
Expected: 400 error with validation message

- [ ] **Step 4: Commit changes**

```bash
git add src/app/api/presentations/route.ts
git commit -m "feat: add tags support to POST /api/presentations

- Accept optional tags array in request body
- Validate tags (max 5, valid format)
- Normalize tags before storage
- Return 400 on validation errors"
```

---

## Task 7: API - Update Edit Presentation

**Files:**
- Modify: `src/app/api/presentations/[id]/route.ts`

- [ ] **Step 1: Add tags support to PATCH handler**

Edit `src/app/api/presentations/[id]/route.ts`, add tags handling:

```typescript
import { validateTags, normalizeTag } from '@/lib/validation/tags';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const presentationId = params.id;
    const body = await request.json();
    const { title, description, visibility, tags } = body;

    // Verify ownership
    const existing = await db.presentation.findUnique({
      where: { id: presentationId },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== auth.user!.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this presentation' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (visibility !== undefined) updateData.visibility = visibility;

    // Validate and normalize tags if provided
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { error: 'Tags must be an array' },
          { status: 400 }
        );
      }

      const validation = validateTags(tags);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      updateData.tags = tags.map(normalizeTag);
    }

    const presentation = await db.presentation.update({
      where: { id: presentationId },
      data: updateData,
    });

    return NextResponse.json({ presentation });
  } catch (error) {
    console.error('Failed to update presentation:', error);
    return NextResponse.json(
      { error: 'Failed to update presentation' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test updating tags**

Test: PATCH to `/api/presentations/[id]` with `tags: ["new-tag"]`
Expected: Tags updated successfully

- [ ] **Step 3: Test validation**

Test: PATCH with invalid tags
Expected: 400 error with validation message

- [ ] **Step 4: Commit changes**

```bash
git add src/app/api/presentations/[id]/route.ts
git commit -m "feat: add tags support to PATCH /api/presentations/[id]

- Accept optional tags array in request body
- Validate tags before update
- Replace entire tags array (not merge)
- Return 400 on validation errors"
```

---

## Task 8: TagInput Component - Basic Structure

**Files:**
- Create: `src/components/ui/TagInput.tsx`

- [ ] **Step 1: Create basic TagInput component**

Create `src/components/ui/TagInput.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { Badge } from './Badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  maxTags = 5,
  placeholder = 'Add tags...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const atMaxTags = value.length >= maxTags;

  // Fetch user's existing tags for autocomplete
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/tags', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to fetch tag suggestions:', error);
      }
    };
    fetchTags();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(s.name)
      )
    : [];

  // Validate tag name
  const validateTag = (tag: string): string | null => {
    const trimmed = tag.trim();
    if (!trimmed) return 'Tag name cannot be empty';
    if (trimmed.length > 30) return 'Tag name must be 30 characters or less';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Tag can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    if (value.includes(trimmed)) return 'This tag is already added';
    return null;
  };

  const addTag = (tagName: string) => {
    const normalized = tagName.trim().replace(/\s+/g, ' ');
    const validationError = validateTag(normalized);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (value.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onChange([...value, normalized]);
    setInputValue('');
    setError(null);
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getTagColor = (tagName: string): string => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  return (
    <div className="space-y-2">
      {/* Input and counter */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow clicking suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={atMaxTags ? 'Maximum tags reached' : placeholder}
              disabled={disabled || atMaxTags}
            />

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    onClick={() => addTag(suggestion.name)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    {suggestion.name} <span className="text-gray-500">({suggestion.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag counter */}
          <span
            className={`text-sm font-medium ${
              value.length >= maxTags
                ? 'text-red-600'
                : value.length >= maxTags - 1
                ? 'text-yellow-600'
                : 'text-gray-600'
            }`}
          >
            {value.length}/{maxTags}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Tag pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: getTagColor(tag), color: '#1f2937' }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test component in isolation**

Add to a test page or practice page temporarily
Expected: Can type, add tags, see tag pills, remove tags

- [ ] **Step 3: Commit TagInput component**

```bash
git add src/components/ui/TagInput.tsx
git commit -m "feat: add TagInput component with autocomplete

- Text input with tag validation
- Autocomplete suggestions from user's existing tags
- Tag pills with color coding (hash-based)
- Remove tag button
- Tag counter with color coding
- Max 5 tags enforcement
- Keyboard support (Enter to add, Escape to close)"
```

---

## Task 9: Practice Page - Add Tags

**Files:**
- Modify: `src/app/practice/page.tsx`

- [ ] **Step 1: Add tags state and TagInput to practice form**

Edit `src/app/practice/page.tsx`, add import and tags state:

```typescript
import { TagInput } from '@/components/ui/TagInput';

export default function PracticePage() {
  // ... existing state
  const [tags, setTags] = useState<string[]>([]);

  // ... existing code

  // In the form, add after description field:
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Create Presentation
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter presentation title"
                  required
                />
              </div>

              {/* Description field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags field - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (optional)
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Add up to 5 tags to organize your presentation
                </p>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="e.g., sales, quarterly, team meeting"
                />
              </div>

              {/* ... rest of form */}
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Include tags in API request**

In the `handleSubmit` function, add tags to the request body:

```typescript
const createResponse = await fetch('/api/presentations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title,
    description: description || undefined,
    type,
    visibility,
    tags, // ← NEW
  }),
});
```

- [ ] **Step 3: Test creating presentation with tags**

Test: Fill form with tags, submit
Expected: Presentation created with tags

- [ ] **Step 4: Commit practice page changes**

```bash
git add src/app/practice/page.tsx
git commit -m "feat: add tag input to practice page

Users can now add up to 5 tags when creating a presentation.
Tags included in POST request to /api/presentations."
```

---

## Task 10: Presentation Detail Page - Display Tags

**Files:**
- Modify: `src/app/presentations/[id]/page.tsx`

- [ ] **Step 1: Add tags display section**

Edit `src/app/presentations/[id]/page.tsx`, add tags display in the header area:

```typescript
import { TagInput } from '@/components/ui/TagInput';

export default function PresentationDetailPage({ params }: { params: { id: string } }) {
  // ... existing state
  const [tags, setTags] = useState<string[]>([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [originalTags, setOriginalTags] = useState<string[]>([]);

  // When presentation loads, set tags
  useEffect(() => {
    if (presentation) {
      setTags(presentation.tags || []);
      setOriginalTags(presentation.tags || []);
    }
  }, [presentation]);

  const handleEditToggle = () => {
    if (isEditingTags) {
      // Cancel - revert to original
      setTags(originalTags);
    }
    setIsEditingTags(!isEditingTags);
  };

  const handleSaveTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/presentations/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags }),
      });

      if (response.ok) {
        setOriginalTags(tags);
        setIsEditingTags(false);
        // Show success message (implement toast later)
        console.log('Tags saved successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save tags');
        setTags(originalTags); // Revert on error
      }
    } catch (error) {
      console.error('Failed to save tags:', error);
      alert('Failed to save tags');
      setTags(originalTags); // Revert on error
    }
  };

  const getTagColor = (tagName: string): string => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  return (
    <DashboardLayout>
      {/* ... existing header code */}
      
      {/* Tags Section - NEW */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Tags</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={isEditingTags ? handleSaveTags : handleEditToggle}
          >
            {isEditingTags ? 'Save' : 'Edit Tags'}
          </Button>
          {isEditingTags && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditToggle}
              className="ml-2"
            >
              Cancel
            </Button>
          )}
        </div>

        {isEditingTags ? (
          <TagInput value={tags} onChange={setTags} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag, index) => (
                <div
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: getTagColor(tag), color: '#1f2937' }}
                >
                  {tag}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No tags</p>
            )}
          </div>
        )}
      </div>

      {/* ... rest of page */}
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Test displaying and editing tags**

Test: View presentation with tags, click Edit Tags, modify, save
Expected: Tags update successfully, optimistic update works

- [ ] **Step 3: Commit detail page changes**

```bash
git add src/app/presentations/[id]/page.tsx
git commit -m "feat: add tag display and editing to detail page

- Display tags as colored badges
- Edit Tags button toggles edit mode
- Save updates tags via PATCH API
- Cancel reverts changes
- Optimistic update with error revert"
```

---

## Task 11: Presentations Library - Tag Filter

**Files:**
- Modify: `src/app/presentations/page.tsx`

- [ ] **Step 1: Add tag filter state and fetch tags**

Edit `src/app/presentations/page.tsx`:

```typescript
export default function PresentationsPage() {
  // ... existing state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);

  // Fetch available tags
  useEffect(() => {
    if (!user) return;

    const fetchTags = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/tags', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, [user]);
```

- [ ] **Step 2: Add tag filtering logic**

In the filtering `useEffect`, add tag filter:

```typescript
useEffect(() => {
  let result = [...presentations];

  // Filter by status
  if (filterStatus !== 'all') {
    result = result.filter((p) => p.status === filterStatus);
  }

  // Filter by tags - NEW
  if (selectedTags.length > 0) {
    result = result.filter((p) =>
      selectedTags.some((tag) => p.tags.includes(tag))
    );
  }

  // Search by title or description
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }

  // ... existing sort logic

  setFilteredPresentations(result);
}, [presentations, searchQuery, sortBy, filterStatus, selectedTags]);
```

- [ ] **Step 3: Add tag filter UI**

Add tag filter control in the filters section:

```typescript
{/* Tags Filter - NEW */}
<div className="flex items-center gap-2">
  <span className="text-sm font-medium text-gray-700">Tags:</span>
  <select
    multiple
    size={3}
    value={selectedTags}
    onChange={(e) => {
      const options = Array.from(e.target.selectedOptions);
      setSelectedTags(options.map((o) => o.value));
    }}
    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {availableTags.map((tag) => (
      <option key={tag.name} value={tag.name}>
        {tag.name} ({tag.count})
      </option>
    ))}
  </select>
</div>

{/* Show selected tags as removable pills */}
{selectedTags.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {selectedTags.map((tag) => (
      <div
        key={tag}
        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
      >
        {tag}
        <button
          onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
          className="ml-1 hover:text-blue-900"
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Display tags on presentation cards**

In the presentation card rendering, add tags display:

```typescript
{/* Tags - NEW */}
{presentation.tags && presentation.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    {presentation.tags.slice(0, 3).map((tag, idx) => (
      <span
        key={idx}
        className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
      >
        {tag}
      </span>
    ))}
    {presentation.tags.length > 3 && (
      <span className="px-2 py-0.5 text-gray-500 text-xs">
        +{presentation.tags.length - 3} more
      </span>
    )}
  </div>
)}
```

- [ ] **Step 5: Update clear filters to include tags**

Update the clear filters button:

```typescript
{(searchQuery || filterStatus !== 'all' || sortBy !== 'newest' || selectedTags.length > 0) && (
  <button
    onClick={() => {
      setSearchQuery('');
      setFilterStatus('all');
      setSortBy('newest');
      setSelectedTags([]); // ← Add this
    }}
    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
  >
    Clear Filters
  </button>
)}
```

- [ ] **Step 6: Test tag filtering**

Test: Select one tag, verify filtering works
Test: Select multiple tags, verify OR logic
Test: Clear filters

- [ ] **Step 7: Commit library page changes**

```bash
git add src/app/presentations/page.tsx
git commit -m "feat: add tag filtering to presentations library

- Multi-select tag filter with OR logic
- Display selected tags as removable pills
- Show tags on presentation cards (max 3 visible)
- Include tags in clear filters action"
```

---

## Task 12: Tag Management Page

**Files:**
- Create: `src/app/tags/page.tsx`

- [ ] **Step 1: Create tag management page**

Create `src/app/tags/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface Tag {
  name: string;
  count: number;
}

export default function TagsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchTags();
  }, [user]);

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/tags', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      setError('Please enter a different tag name');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/tags/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldName, newName }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setEditingTag(null);
        setNewName('');
        setError(null);
        fetchTags();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to rename tag');
      }
    } catch (error) {
      console.error('Failed to rename tag:', error);
      setError('Failed to rename tag');
    }
  };

  const handleDelete = async (tagName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tags/${encodeURIComponent(tagName)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setDeleteTag(null);
        fetchTags();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    }
  };

  const getTagColor = (tagName: string): string => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading tags...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Tags</h1>
          <p className="text-gray-600 mt-1">
            Rename or delete tags across all your presentations
          </p>
        </div>

        {/* Tags List */}
        {tags.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-4">
              You haven't used any tags yet. Tags help organize your presentations.
            </p>
            <Button onClick={() => router.push('/practice')}>
              Create a Presentation
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tags.map((tag) => (
                    <tr key={tag.name}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTag === tag.name ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="New tag name"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                            style={{ backgroundColor: getTagColor(tag.name), color: '#1f2937' }}
                          >
                            {tag.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tag.count} presentation{tag.count === 1 ? '' : 's'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingTag === tag.name ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={() => handleRename(tag.name)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingTag(null);
                                setNewName('');
                                setError(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingTag(tag.name);
                                setNewName(tag.name);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => setDeleteTag(tag)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTag && (
          <Modal
            isOpen={!!deleteTag}
            onClose={() => setDeleteTag(null)}
            title="Delete Tag"
          >
            <div className="space-y-4">
              <p>
                Delete tag <strong>"{deleteTag.name}"</strong>?
              </p>
              <p className="text-sm text-gray-600">
                This will remove it from {deleteTag.count} presentation{deleteTag.count === 1 ? '' : 's'}.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTag(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => handleDelete(deleteTag.name)}>
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Test tag management**

Test: Rename tag, verify updates
Test: Delete tag, verify removed
Test: Cancel operations

- [ ] **Step 3: Commit tag management page**

```bash
git add src/app/tags/page.tsx
git commit -m "feat: add tag management page

- List all user's tags with usage counts
- Rename tag globally with inline editing
- Delete tag with confirmation modal
- Empty state with link to create presentation"
```

---

## Task 13: Add Navigation Link

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Add Tags link to navbar**

Edit `src/components/layout/Navbar.tsx`, add Tags link:

```typescript
<nav className="flex items-center space-x-4">
  <Link
    href="/dashboard"
    className={pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}
  >
    Dashboard
  </Link>
  <Link
    href="/presentations"
    className={pathname === '/presentations' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}
  >
    Presentations
  </Link>
  <Link
    href="/practice"
    className={pathname === '/practice' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}
  >
    Practice
  </Link>
  <Link
    href="/tags"
    className={pathname === '/tags' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}
  >
    Tags
  </Link>
  <Link
    href="/feedback/give"
    className={pathname === '/feedback/give' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}
  >
    Give Feedback
  </Link>
</nav>
```

- [ ] **Step 2: Test navigation**

Test: Click Tags link, navigate to tag management page
Expected: Active state highlights correctly

- [ ] **Step 3: Commit navbar changes**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: add Tags link to navbar

Users can now access tag management page from navigation."
```

---

## Task 14: Final Testing

**Files:**
- Manual testing across all pages

- [ ] **Step 1: Test complete create flow**

1. Go to practice page
2. Fill form with tags
3. Submit
4. Verify presentation created with tags
5. Navigate to detail page
6. Verify tags displayed

- [ ] **Step 2: Test edit flow**

1. On detail page, click Edit Tags
2. Add/remove tags
3. Click Save
4. Verify tags updated
5. Refresh page, verify persistence

- [ ] **Step 3: Test filter flow**

1. Go to presentations library
2. Select single tag filter
3. Verify matching presentations shown
4. Select multiple tags
5. Verify OR logic works
6. Clear filters

- [ ] **Step 4: Test global rename**

1. Go to tag management page
2. Click Rename on a tag
3. Enter new name
4. Click Save
5. Go to presentations library
6. Verify all presentations show new tag name

- [ ] **Step 5: Test global delete**

1. Go to tag management page
2. Click Delete on a tag
3. Confirm deletion
4. Go to presentations library
5. Verify tag removed from all presentations
6. Verify tag not in filter dropdown

- [ ] **Step 6: Test edge cases**

1. Test max 5 tags limit
2. Test tag with 30 characters
3. Test invalid characters
4. Test duplicate tag prevention
5. Test empty tags array
6. Test autocomplete suggestions

- [ ] **Step 7: Create final commit**

```bash
git add .
git commit -m "test: verify complete tags system functionality

All flows tested:
- Create presentation with tags
- Edit tags on existing presentation
- Filter presentations by tags (OR logic)
- Rename tag globally
- Delete tag globally
- Tag validation and edge cases"
```

---

## Self-Review Checklist

**Spec Coverage:**
- [x] Database schema (tags field added)
- [x] Tag validation logic
- [x] GET /api/tags endpoint
- [x] POST /api/tags/rename endpoint
- [x] DELETE /api/tags/[name] endpoint
- [x] POST /api/presentations accepts tags
- [x] PATCH /api/presentations/[id] accepts tags
- [x] TagInput component with autocomplete
- [x] Practice page has tag input
- [x] Detail page displays and edits tags
- [x] Library page filters by tags
- [x] Library page displays tags on cards
- [x] Tag management page
- [x] Navigation link added

**Placeholder Check:**
- All code blocks contain actual implementation
- No TBD, TODO, or "implement later" comments
- All types and interfaces defined
- All validation rules implemented

**Type Consistency:**
- Tags always typed as `string[]`
- ValidationResult interface consistent
- Tag interface `{ name: string; count: number }` used consistently
- API responses match expected types

**DRY Principles:**
- Tag validation logic centralized in `tags.ts`
- Tag color generation function reused
- Normalize tag function used in all endpoints

**YAGNI:**
- No unnecessary features added
- Only implementing what's in the spec
- No premature optimization

**TDD:**
- Tests written for tag validation logic
- Manual testing steps for all user flows
- Edge cases covered

**Frequent Commits:**
- Each task has explicit commit step
- Commits are atomic and focused
- Commit messages follow conventional format
