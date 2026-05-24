# Tags System Design

**Date:** 2026-05-25  
**Feature:** Presentation Tags & Categories  
**Status:** Design Approved

---

## Overview

Add a tagging system to help users organize their presentations by topics (sales pitches, team meetings, conference talks, etc.). Users can add tags during presentation creation, edit them later, filter presentations by tags, and manage tags globally across all presentations.

---

## User Stories

1. **As a user**, I want to add tags when creating a presentation, so I can organize it from the start
2. **As a user**, I want to edit tags on existing presentations, so I can reorganize my content
3. **As a user**, I want to filter presentations by multiple tags, so I can find related presentations quickly
4. **As a user**, I want tag suggestions based on my previous tags, so I can maintain consistent naming
5. **As a user**, I want to rename a tag globally, so all presentations with that tag are updated at once
6. **As a user**, I want to delete a tag globally, so I can remove unused tags from all presentations

---

## Design Decisions

### Approach: Simple Array Storage

**Selected:** Store tags as `String[]` directly on the Presentation model (Approach A from options).

**Rationale:**
- Matches existing pattern (User.goals uses `String[]`)
- Sufficient for expected scale (<100 presentations per user)
- Fast reads (no joins needed)
- PostgreSQL has native array support with good query performance
- Simpler schema and easier to maintain

**Trade-offs accepted:**
- Slightly more complex aggregation queries for tag usage counts
- Global rename requires updating multiple records (acceptable frequency)
- No built-in tag metadata (color, icon) - can add later if needed

**Alternatives considered:**
- Separate Tag table with junction (overkill for simple tagging)
- Hybrid with tag cache (unnecessary complexity at this scale)

---

## Database Schema

### Modified Model: Presentation

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
  tags          String[]          @default([])  // ← NEW FIELD
  createdAt     DateTime          @default(now()) @map("created_at")

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiAnalysis      AIAnalysis?
  feedbackRequest FeedbackRequest?

  @@index([userId])
  @@index([status])
  @@map("presentations")
}
```

**Migration:**
- Single Prisma migration adds `tags` column
- Existing presentations get empty array `[]` by default
- No data migration needed

**Future optimization:**
- Can add GIN index on tags array if query performance becomes an issue
- `@@index([tags], type: Gin)` in Prisma (PostgreSQL GIN index for array contains queries)

---

## API Endpoints

### Modified Endpoints

#### `POST /api/presentations` (Create)

**Request body changes:**
```typescript
{
  title: string;
  description?: string;
  type: PresentationType;
  visibility: Visibility;
  tags?: string[];  // ← NEW: Optional tags array
}
```

**Validation:**
- `tags` optional, defaults to `[]`
- Maximum 5 tags per presentation
- Each tag: 1-30 characters
- Allowed characters: letters, numbers, spaces, hyphens, underscores
- Trim whitespace from each tag
- Remove duplicate tags (case-sensitive)

**Response:**
- Returns created presentation with tags included

---

#### `PATCH /api/presentations/[id]` (Update)

**Request body changes:**
```typescript
{
  title?: string;
  description?: string;
  visibility?: Visibility;
  tags?: string[];  // ← NEW: Optional tags array for updating
}
```

**Validation:**
- Same rules as creation
- Tags array replaces entire existing array (not merged)
- If `tags` not provided, existing tags unchanged

**Authorization:**
- Verify user owns the presentation

---

#### `GET /api/presentations` (List)

**Changes:**
- No query changes needed
- Include `tags` field in response objects
- Existing filtering/sorting unchanged

**Response:**
```typescript
{
  presentations: [
    {
      id: string;
      title: string;
      tags: string[];  // ← NOW INCLUDED
      // ... other fields
    }
  ]
}
```

---

### New Endpoints

#### `GET /api/tags`

**Purpose:** Get all unique tags for the authenticated user with usage counts.

**Query parameters:** None

**Response:**
```typescript
{
  tags: [
    { name: "sales", count: 5 },
    { name: "quarterly", count: 3 },
    { name: "team meeting", count: 8 }
  ]
}
```

**Implementation:**
1. Fetch all user's presentations (only `tags` field)
2. Flatten all tags arrays into single array
3. Count occurrences of each unique tag
4. Sort by usage count descending
5. Return array of `{ name, count }` objects

**Used for:**
- Tag autocomplete suggestions
- Tag management page display
- Usage analytics

---

#### `POST /api/tags/rename`

**Purpose:** Rename a tag across all user's presentations.

**Request body:**
```typescript
{
  oldName: string;  // Current tag name
  newName: string;  // New tag name
}
```

**Validation:**
- `oldName` required, must be non-empty
- `newName` must meet tag validation rules (1-30 chars, valid characters)
- `oldName` and `newName` cannot be the same
- Trim whitespace from both

**Implementation:**
1. Validate request
2. Find all user's presentations where `tags` array contains `oldName`
3. For each presentation, replace `oldName` with `newName` in tags array
4. Use Prisma transaction for atomicity
5. Return count of presentations updated

**Response:**
```typescript
{
  success: true;
  count: 5;  // Number of presentations updated
  message: "Renamed 'sales' to 'Sales Pitch' in 5 presentations"
}
```

**Edge cases:**
- If `oldName` not found in any presentations: return count 0, success true
- If `newName` already exists as a tag in same presentation: remove duplicate after rename

---

#### `DELETE /api/tags/[name]`

**Purpose:** Delete a tag from all user's presentations.

**URL parameter:**
- `name` - URL-encoded tag name to delete

**Implementation:**
1. URL-decode tag name
2. Find all user's presentations where `tags` array contains this tag
3. For each presentation, remove tag from array
4. Use Prisma transaction for atomicity
5. Return count of presentations updated

**Response:**
```typescript
{
  success: true;
  count: 3;  // Number of presentations updated
  message: "Deleted 'sales' from 3 presentations"
}
```

**Edge cases:**
- If tag not found in any presentations: return count 0, success true

---

## UI Components

### New Component: `TagInput`

**Location:** `src/components/ui/TagInput.tsx`

**Purpose:** Reusable tag input with autocomplete suggestions.

**Props:**
```typescript
interface TagInputProps {
  value: string[];           // Current tags
  onChange: (tags: string[]) => void;
  maxTags?: number;          // Default 5
  placeholder?: string;      // Default "Add tags..."
  disabled?: boolean;        // Disable input
}
```

**Features:**
1. **Input Field:**
   - Text input for typing tags
   - Shows placeholder when no text entered
   - Disabled when max tags reached
   - Press Enter to add tag

2. **Autocomplete Dropdown:**
   - Fetches user's tags from `/api/tags` on mount
   - Filters suggestions client-side as user types
   - Shows matching tags in dropdown below input
   - Click suggestion to add tag
   - Hide dropdown when no matches or input empty

3. **Tag Pills Display:**
   - Show selected tags as colored badge pills below input
   - Each pill has tag name + × remove button
   - Color based on tag name hash (consistent colors per tag)
   - Wrap pills on multiple lines if needed

4. **Tag Counter:**
   - Show "3/5 tags" counter
   - Change color when approaching limit (yellow at 4, red at 5)
   - Disable input when limit reached

5. **Validation:**
   - Show error message below input for invalid tags
   - Client-side validation (length, characters)
   - Prevent duplicate tags (case-sensitive check)

**Implementation notes:**
- Use existing `Input` component for text field
- Use existing `Badge` component for tag pills
- Debounce API calls (cache suggestions on mount, filter client-side)
- Handle keyboard navigation (Enter to add, Escape to close dropdown)

---

### Modified Page: Practice Page

**File:** `src/app/practice/page.tsx`

**Changes:**
1. Add `tags` state: `const [tags, setTags] = useState<string[]>([]);`
2. Add `<TagInput>` component after description field:
   ```tsx
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
   ```
3. Include `tags` in presentation creation API call:
   ```typescript
   body: JSON.stringify({
     title,
     description,
     type,
     visibility,
     tags,  // ← NEW
   })
   ```

---

### Modified Page: Presentation Detail Page

**File:** `src/app/presentations/[id]/page.tsx`

**Changes:**

1. **Display Tags Section:**
   - Add tags display below title/description in header
   - Show tags as colored badge pills
   - Show "No tags" text if tags array empty

2. **Edit Tags Functionality:**
   - Add "Edit Tags" button next to tags display
   - Clicking toggles edit mode (show `<TagInput>`)
   - In edit mode, show Save and Cancel buttons
   - Save calls `PATCH /api/presentations/[id]` with updated tags
   - Cancel reverts to previous tags
   - Optimistic update (update UI immediately, revert on error)

**Example layout:**
```tsx
<div className="mb-6">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-medium text-gray-700">Tags</h3>
    <Button variant="secondary" size="sm" onClick={handleEditToggle}>
      {isEditingTags ? 'Cancel' : 'Edit Tags'}
    </Button>
  </div>
  
  {isEditingTags ? (
    <div>
      <TagInput value={tags} onChange={setTags} />
      <Button onClick={handleSaveTags} className="mt-2">
        Save Tags
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {tags.length > 0 ? (
        tags.map(tag => (
          <Badge key={tag} variant="neutral">{tag}</Badge>
        ))
      ) : (
        <p className="text-sm text-gray-500">No tags</p>
      )}
    </div>
  )}
</div>
```

---

### Modified Page: Presentations Library

**File:** `src/app/presentations/page.tsx`

**Changes:**

1. **Add Tag Filter Control:**
   - Add multi-select dropdown for tags filter
   - Fetch available tags from `/api/tags` on mount
   - Show checkboxes for each tag in dropdown
   - Display selected tags as removable pills above results
   - Add "Clear tag filter" button when tags selected

2. **Filter Logic Update:**
   ```typescript
   const [selectedTags, setSelectedTags] = useState<string[]>([]);
   
   // In filtering useEffect, add:
   if (selectedTags.length > 0) {
     // OR logic: show presentations with ANY selected tag
     result = result.filter(p => 
       selectedTags.some(tag => p.tags.includes(tag))
     );
   }
   ```

3. **Display Tags on Cards:**
   - Show tags as small badges on each presentation card
   - Limit to 3 visible tags, show "+ 2 more" if more exist
   - Position below description, above metadata row

**Filter UI example:**
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-medium text-gray-700">Tags:</span>
  <select
    multiple
    value={selectedTags}
    onChange={(e) => {
      const options = Array.from(e.target.selectedOptions);
      setSelectedTags(options.map(o => o.value));
    }}
    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
  >
    {availableTags.map(tag => (
      <option key={tag.name} value={tag.name}>
        {tag.name} ({tag.count})
      </option>
    ))}
  </select>
</div>
```

---

### New Page: Tag Management

**File:** `src/app/tags/page.tsx`

**Purpose:** Global tag management - rename and delete tags across all presentations.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Manage Tags                                 │
│ Rename or delete tags across all your      │
│ presentations                               │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Tag Name   │ Usage      │ Actions       │ │
│ ├─────────────────────────────────────────┤ │
│ │ [sales]    │ 5 pres.    │ Rename Delete │ │
│ │ [quarterly]│ 3 pres.    │ Rename Delete │ │
│ │ [meeting]  │ 8 pres.    │ Rename Delete │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Features:**

1. **Tag List:**
   - Fetch tags from `/api/tags` on mount
   - Display as table or card list
   - Each row shows: tag badge, usage count, action buttons
   - Sort by usage count (descending)

2. **Rename Flow:**
   - Click "Rename" button
   - Row becomes editable with text input
   - Show Save and Cancel buttons
   - On Save: Call `POST /api/tags/rename`
   - Show success toast with update count
   - Refresh tag list

3. **Delete Flow:**
   - Click "Delete" button
   - Show confirmation modal:
     - "Delete tag 'sales'?"
     - "This will remove it from 5 presentations."
     - Confirm / Cancel buttons
   - On confirm: Call `DELETE /api/tags/[name]`
   - Show success toast with removal count
   - Refresh tag list

4. **Empty State:**
   - Show when no tags exist
   - Message: "You haven't used any tags yet. Tags help organize your presentations."
   - Link/button to practice page

**Navigation:**
- Add link in navbar dropdown or settings menu
- Or add "Manage Tags" button on presentations library page

---

## Data Flow

### Tag Suggestions (Autocomplete)

**Flow:**
1. `TagInput` component mounts
2. Fetch `/api/tags` once (GET request)
3. Store tags in component state
4. As user types, filter cached tags client-side
5. Show matching suggestions in dropdown
6. No additional API calls during typing

**Performance:**
- Single API call on mount (typically <1KB response)
- Client-side filtering is instant (<1ms)
- Cache remains valid for component lifetime

---

### Creating Presentation with Tags

**Flow:**
1. User fills practice page form
2. User adds tags via `TagInput` component
3. Tags validated client-side (length, characters, max 5)
4. On submit, call `POST /api/presentations` with tags array
5. API validates tags server-side
6. Create presentation record with tags
7. Redirect to presentation detail page
8. Tags displayed in header

**Error handling:**
- Client validation prevents most errors
- Server returns 400 for validation errors
- Show error message below form

---

### Editing Tags on Existing Presentation

**Flow:**
1. User views presentation detail page
2. Current tags displayed as badges
3. User clicks "Edit Tags" button
4. `TagInput` component shown with current tags
5. User modifies tags (add, remove, change)
6. User clicks "Save" button
7. Call `PATCH /api/presentations/[id]` with new tags array
8. Optimistic update: Update UI immediately
9. On success: Show toast notification
10. On error: Revert to previous tags, show error

**Optimistic update rationale:**
- Immediate feedback improves UX
- Tag updates are low-risk operations
- Easy to revert on error (just restore previous array)

---

### Filtering by Tags

**Flow:**
1. User opens presentations library page
2. Fetch presentations (includes tags field)
3. Fetch available tags from `/api/tags`
4. User selects one or more tags from filter dropdown
5. Client-side filtering applies OR logic:
   ```typescript
   presentations.filter(p => 
     selectedTags.some(tag => p.tags.includes(tag))
   )
   ```
6. Results update instantly (no API call)
7. Works alongside search and status filters

**Performance:**
- All filtering done client-side (instant)
- Typical dataset: 10-50 presentations
- Array filtering is fast even with 100+ items

---

### Global Tag Rename

**Flow:**
1. User navigates to tag management page
2. Page fetches tags from `/api/tags`
3. User clicks "Rename" on a tag
4. Inline editor appears with current name
5. User types new name, clicks "Save"
6. Client validates new name (length, characters)
7. Call `POST /api/tags/rename` with old and new names
8. API finds all presentations with old tag
9. Updates each presentation in Prisma transaction
10. API returns count of updated presentations
11. Show success toast: "Renamed 'sales' to 'Sales Pitch' in 5 presentations"
12. Refresh tag list

**Transaction handling:**
- Use Prisma transaction to ensure atomicity
- All presentations updated or none (no partial updates)
- If one update fails, entire transaction rolls back

---

### Global Tag Delete

**Flow:**
1. User clicks "Delete" on a tag
2. Confirmation modal appears with usage count
3. User confirms deletion
4. Call `DELETE /api/tags/[name]`
5. API finds all presentations with this tag
6. Removes tag from each presentation's array
7. Updates in Prisma transaction
8. API returns count of updated presentations
9. Show success toast: "Deleted 'sales' from 5 presentations"
10. Refresh tag list

---

## Validation Rules

### Tag Name Validation

**Length:**
- Minimum: 1 character
- Maximum: 30 characters
- Error messages:
  - "Tag name cannot be empty"
  - "Tag name must be 30 characters or less"

**Allowed Characters:**
- Letters (a-z, A-Z)
- Numbers (0-9)
- Spaces
- Hyphens (-)
- Underscores (_)
- Regex: `/^[a-zA-Z0-9\s\-_]+$/`
- Error message: "Tag can only contain letters, numbers, spaces, hyphens, and underscores"

**Normalization:**
- Trim leading/trailing whitespace
- Collapse multiple consecutive spaces to single space
- Do NOT convert case (preserve user's capitalization)

**Duplicates:**
- Case-sensitive comparison
- "Sales" and "sales" are different tags
- Error message: "This tag is already added"

---

### Per-Presentation Limits

**Maximum Tags:**
- Hard limit: 5 tags per presentation
- Enforced client-side (disable input at 5)
- Enforced server-side (return 400 error)
- Error message: "Maximum 5 tags allowed per presentation"

**Empty Array:**
- Presentations can have zero tags (valid)
- Default value for new presentations: `[]`

---

### Global Operations Validation

**Rename:**
- Old name must exist (non-empty string)
- New name must meet tag validation rules
- Old and new names cannot be identical
- New name can match existing tags (consolidation use case)

**Delete:**
- Tag name must be non-empty
- OK if tag doesn't exist (returns count 0)

---

## Error Handling

### Client-Side Validation Errors

**Display:**
- Show error message below `TagInput` component
- Red text, small font size
- Error clears when user corrects input

**Common errors:**
- Empty tag name
- Too long (>30 chars)
- Invalid characters
- Duplicate tag
- Max limit reached (5 tags)

---

### API Errors

#### Authentication (401)
- Redirect to login page
- Clear auth token from localStorage

#### Authorization (403)
- "You don't have permission to edit this presentation"
- Rare: should only happen if user manually crafts request

#### Not Found (404)
- Presentation: "Presentation not found"
- Tag: Silent success (rename/delete returns count 0)

#### Validation (400)
- Response includes error details
- Show error message to user
- Example: `{ error: "Maximum 5 tags allowed" }`

#### Server Error (500)
- "Something went wrong. Please try again."
- Log error details for debugging
- Don't expose internal error messages

#### Network Error
- "Connection error. Check your internet and try again."
- Retry button for user

---

### User Feedback

**Success Notifications:**
- Toast messages (auto-dismiss after 3 seconds)
- Examples:
  - "Tags saved successfully"
  - "Renamed 'sales' to 'Sales Pitch' in 5 presentations"
  - "Deleted 'old-tag' from 3 presentations"

**Loading States:**
- Disable buttons during API calls
- Show spinner icon on button
- Prevent double-submission

**Optimistic Updates:**
- Edit tags on detail page: Update UI immediately
- Revert if API call fails
- Show subtle loading indicator (don't block UI)

---

## Testing Strategy

### Unit Tests

**Tag Validation:**
- Valid tag names pass
- Invalid characters rejected
- Too long/short rejected
- Duplicates detected
- Whitespace trimming works

**Tag Filtering:**
- OR logic works correctly
- Empty selection shows all
- Single tag filter
- Multiple tag filter
- Non-existent tag shows empty

**Tag Operations:**
- Rename updates all occurrences
- Delete removes from all presentations
- Duplicate handling after rename

---

### API Tests

**Endpoint: `POST /api/presentations`**
- Create with valid tags succeeds
- Create with >5 tags returns 400
- Create with invalid tag returns 400
- Create without tags succeeds (empty array)

**Endpoint: `PATCH /api/presentations/[id]`**
- Update tags succeeds
- Update with invalid tags returns 400
- Non-owner gets 403
- Non-existent presentation gets 404

**Endpoint: `GET /api/tags`**
- Returns unique tags with counts
- Empty when user has no tags
- Counts are accurate
- Sorted by usage (descending)

**Endpoint: `POST /api/tags/rename`**
- Renames tag across all presentations
- Returns correct count
- Old tag no longer exists
- New tag exists on all former occurrences
- Transaction atomicity (all or nothing)

**Endpoint: `DELETE /api/tags/[name]`**
- Deletes tag from all presentations
- Returns correct count
- Tag no longer exists anywhere
- Transaction atomicity

---

### Integration Tests

**Create Flow:**
1. Navigate to practice page
2. Fill form with tags
3. Submit
4. Verify presentation created with tags
5. Navigate to detail page
6. Verify tags displayed

**Edit Flow:**
1. Navigate to presentation detail page
2. Click "Edit Tags"
3. Add/remove tags
4. Click "Save"
5. Verify tags updated in database
6. Verify tags displayed correctly

**Filter Flow:**
1. Navigate to presentations library
2. Select tag from filter
3. Verify only matching presentations shown
4. Select multiple tags
5. Verify OR logic (any match shown)
6. Clear filter
7. Verify all presentations shown

**Rename Flow:**
1. Navigate to tag management page
2. Click "Rename" on a tag
3. Enter new name
4. Click "Save"
5. Navigate to presentations library
6. Verify all presentations show new tag name
7. Verify old tag name gone

**Delete Flow:**
1. Navigate to tag management page
2. Click "Delete" on a tag
3. Confirm deletion
4. Navigate to presentations library
5. Verify tag removed from all presentations
6. Tag no longer appears in filter dropdown

---

### Manual Testing Checklist

**Tag Input Component:**
- [ ] Can type in input field
- [ ] Autocomplete shows matching suggestions
- [ ] Can click suggestion to add tag
- [ ] Can press Enter to add tag
- [ ] Tag appears as badge pill
- [ ] Can remove tag by clicking ×
- [ ] Cannot add duplicate tag
- [ ] Cannot add 6th tag (disabled at 5)
- [ ] Counter shows "X/5 tags"
- [ ] Error messages display for invalid input

**Practice Page:**
- [ ] Tag input appears on form
- [ ] Can add tags before submitting
- [ ] Tags included in API request
- [ ] Presentation created with tags
- [ ] Tags visible on detail page

**Detail Page:**
- [ ] Tags displayed as badges
- [ ] "Edit Tags" button appears
- [ ] Can enter edit mode
- [ ] Can modify tags
- [ ] "Save" updates tags
- [ ] "Cancel" reverts changes
- [ ] Optimistic update works
- [ ] Error handling works

**Library Page:**
- [ ] Tag filter dropdown appears
- [ ] Dropdown shows all user's tags
- [ ] Can select single tag to filter
- [ ] Can select multiple tags to filter
- [ ] OR logic works (any match shown)
- [ ] Selected tags shown as pills
- [ ] Can remove tag filter pill
- [ ] "Clear filters" works
- [ ] Tags displayed on cards
- [ ] "+ X more" shows for >3 tags

**Tag Management Page:**
- [ ] All tags listed with counts
- [ ] Can click "Rename" button
- [ ] Inline editor appears
- [ ] Can save new name
- [ ] Success message shows
- [ ] Count of updates accurate
- [ ] Can click "Delete" button
- [ ] Confirmation modal appears
- [ ] Can confirm deletion
- [ ] Success message shows
- [ ] Tag removed from all presentations

**Edge Cases:**
- [ ] Empty tags array (no tags)
- [ ] Exactly 5 tags (at limit)
- [ ] Very long tag name (30 chars)
- [ ] Tags with special chars (spaces, hyphens)
- [ ] Filter with no matches
- [ ] Rename to existing tag (consolidation)
- [ ] Delete non-existent tag (count 0)
- [ ] Offline mode (network error handling)

---

## Implementation Notes

### Database Migration

**Migration command:**
```bash
npx prisma migrate dev --name add_presentation_tags
```

**Expected migration SQL:**
```sql
ALTER TABLE "presentations" 
ADD COLUMN "tags" TEXT[] DEFAULT '{}';
```

**Rollback plan:**
- If needed, can drop column: `ALTER TABLE "presentations" DROP COLUMN "tags";`
- No data loss since tags are optional feature

---

### Prisma Queries

**Filter presentations by tag:**
```typescript
const presentations = await prisma.presentation.findMany({
  where: {
    userId: userId,
    tags: {
      has: "sales"  // Single tag
    }
  }
});

// OR multiple tags:
const presentations = await prisma.presentation.findMany({
  where: {
    userId: userId,
    tags: {
      hasSome: ["sales", "quarterly"]  // Any of these tags
    }
  }
});
```

**Update tags on presentation:**
```typescript
await prisma.presentation.update({
  where: { id: presentationId },
  data: {
    tags: ["sales", "quarterly"]  // Replace entire array
  }
});
```

**Rename tag globally:**
```typescript
// Get presentations with old tag
const presentations = await prisma.presentation.findMany({
  where: {
    userId: userId,
    tags: { has: oldTagName }
  }
});

// Update each presentation
await prisma.$transaction(
  presentations.map(p => {
    const updatedTags = p.tags.map(tag => 
      tag === oldTagName ? newTagName : tag
    );
    return prisma.presentation.update({
      where: { id: p.id },
      data: { tags: updatedTags }
    });
  })
);
```

**Delete tag globally:**
```typescript
const presentations = await prisma.presentation.findMany({
  where: {
    userId: userId,
    tags: { has: tagName }
  }
});

await prisma.$transaction(
  presentations.map(p => {
    const updatedTags = p.tags.filter(tag => tag !== tagName);
    return prisma.presentation.update({
      where: { id: p.id },
      data: { tags: updatedTags }
    });
  })
);
```

---

### Tag Color Generation

For consistent badge colors, use hash-based color generation:

```typescript
function getTagColor(tagName: string): string {
  // Generate hash from tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hue (0-360)
  const hue = Math.abs(hash % 360);
  
  // Return HSL color with fixed saturation/lightness
  return `hsl(${hue}, 70%, 85%)`;
}
```

This ensures:
- Same tag always has same color
- Colors are visually distinct
- Colors work on light background
- No need to store color in database

---

### Performance Considerations

**Client-side filtering:**
- Acceptable for <100 presentations
- JavaScript array filtering is very fast
- No network latency

**Tag aggregation:**
- Currently done on-demand (scan all presentations)
- If performance becomes issue, can:
  - Cache tag counts in Redis
  - Add database view for tag counts
  - Use PostgreSQL aggregate functions

**Transaction size:**
- Renaming/deleting tags updates all affected presentations
- For users with 50+ presentations, this is ~50 UPDATE queries
- Prisma batches these efficiently in single transaction
- Should complete in <500ms on typical hardware

---

## Future Enhancements

### Short-term (Next iteration)

1. **Tag colors:** Allow users to customize tag colors
2. **Tag descriptions:** Add optional description/notes per tag
3. **Recent tags:** Show recently used tags first in autocomplete
4. **Tag analytics:** Show usage trends over time

### Medium-term

1. **Tag hierarchies:** Parent/child tag relationships (e.g., "Sales" > "Q1 Sales")
2. **Smart suggestions:** ML-based tag suggestions from presentation content
3. **Bulk tagging:** Select multiple presentations, add/remove tags at once
4. **Tag import/export:** Export tag structure, import from other users

### Long-term

1. **Collaborative tags:** Share tag taxonomies between users
2. **Tag templates:** Pre-defined tag sets for common use cases
3. **Tag-based permissions:** Share presentations based on tags
4. **Tag search:** Full-text search within tagged presentations

---

## Success Metrics

**Adoption:**
- % of presentations with at least one tag
- Average tags per presentation
- % of users using tags

**Usage:**
- Tag filter usage on library page
- Tag management page visits
- Rename/delete operations frequency

**Organization benefit:**
- Time to find presentation (search + filter)
- Repeat views of same presentation (better organization = easier to find)

**Target metrics (3 months post-launch):**
- 60%+ of presentations have tags
- 2-3 average tags per presentation
- 70%+ of users have created at least one tag
- 30%+ use tag filter regularly

---

## Open Questions

*None - all design decisions finalized during brainstorming.*

---

## Appendix: Wire frames

### TagInput Component

```
┌─────────────────────────────────────────────┐
│ Add tags...                            3/5  │ ← Input field + counter
├─────────────────────────────────────────────┤
│ Suggestions:                                │
│   sales (5)                                 │ ← Dropdown (visible when typing)
│   quarterly (3)                             │
│   team meeting (8)                          │
└─────────────────────────────────────────────┘
│ [sales ×] [quarterly ×] [meeting ×]        │ ← Tag badges
└─────────────────────────────────────────────┘
```

### Practice Page (with tags)

```
┌─────────────────────────────────────────────┐
│ Create Presentation                         │
├─────────────────────────────────────────────┤
│ Title                                       │
│ [_________________________________]         │
│                                             │
│ Description                                 │
│ [_________________________________]         │
│ [_________________________________]         │
│                                             │
│ Tags (optional)                             │
│ Add up to 5 tags to organize your pres...  │
│ [TagInput component here]                   │
│                                             │
│ Type                                        │
│ ( ) Video Upload  ( ) Text Script          │
│                                             │
│          [Cancel]  [Create Presentation]    │
└─────────────────────────────────────────────┘
```

### Presentations Library (with tag filter)

```
┌─────────────────────────────────────────────┐
│ My Presentations           [New Pres]       │
├─────────────────────────────────────────────┤
│ Search: [________________]                  │
│                                             │
│ Status: [All ▼]  Tags: [Select ▼]  Sort... │
│                                             │
│ Active filters: [sales ×] [quarterly ×]     │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Q4 Sales Pitch            [Ready]    85 │ │
│ │ Quarterly results...                    │ │
│ │ [sales] [quarterly] [team]              │ │ ← Tags on card
│ │ Type: VIDEO  Duration: 5:23  May 20     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Tag Management Page

```
┌─────────────────────────────────────────────┐
│ Manage Tags                                 │
│ Rename or delete tags across all pres...   │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Tag              Usage      Actions     │ │
│ ├─────────────────────────────────────────┤ │
│ │ [meeting]        8 pres.    [Rename] [×]│ │
│ │ [sales]          5 pres.    [Rename] [×]│ │
│ │ [quarterly]      3 pres.    [Rename] [×]│ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Document History

**2026-05-25** - Initial design (v1.0)
- Completed brainstorming session
- All requirements and approach finalized
- Ready for implementation planning
