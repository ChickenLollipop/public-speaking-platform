# Task 8: Practice/Recording Page - Implementation Plan

> **Status**: Ready for implementation  
> **Dependencies**: Tasks 1-7 complete (UI components, storage, auth, layout, recording components)  
> **Estimated effort**: Medium complexity - 4 states with form handling and data persistence

---

## Overview

Build the practice/recording page that guides users through the complete presentation recording flow with 4 distinct states: setup, recording, preview, and uploading.

---

## Files to Create/Modify

### New Files
- `src/app/practice/page.tsx` - Main practice page with state machine
- `src/lib/utils/formatters.ts` - Utility functions for formatting durations and dates

### Modified Files
- None (new standalone page)

---

## State Machine Design

```
┌──────────┐     Start      ┌───────────┐     Stop      ┌─────────┐     Submit     ┌────────────┐
│  SETUP   │ ───────────> │ RECORDING │ ───────────> │ PREVIEW │ ──────────> │ UPLOADING  │
│          │                │           │                │         │               │            │
└──────────┘                └───────────┘                └─────────┘               └────────────┘
     │                                                        │                           │
     │                                                        │ Re-record                 │ Complete
     │ Cancel                                                 └──────────┐                │
     └────────> /dashboard                                               │                └──> /presentations/[id]/processing
                                                                          ▼
                                                                      ┌──────────┐
                                                                      │  SETUP   │
                                                                      └──────────┘
```

---

## State Details

### State 1: SETUP
**Purpose**: Collect presentation metadata and show camera preview

**UI Elements**:
- Page title: "New Practice Session"
- Form fields:
  - Title (required, text input)
  - Description (optional, textarea)
  - Type selector (radio buttons):
    - Video Recording (default, enabled)
    - Video Upload (disabled for MVP)
    - Text Script (disabled for MVP)
- Camera preview (using VideoRecorder in idle state)
- Buttons:
  - "Start Recording" (primary, enabled when title is filled)
  - "Cancel" (secondary, returns to dashboard)

**Validation**:
- Title: required, min 3 characters, max 100 characters
- Description: optional, max 500 characters

### State 2: RECORDING
**Purpose**: Active recording with timer and controls

**UI Elements**:
- Title: "Recording: [Presentation Title]"
- Full-screen video recorder component (recording state)
- Red dot indicator + timer (MM:SS format)
- "Stop Recording" button (danger variant)

**Technical**:
- Use VideoRecorder component from Task 7
- Recording state automatically displays camera feed with timer
- No form visible during recording

### State 3: PREVIEW
**Purpose**: Review recording and decide to keep or re-record

**UI Elements**:
- Title: "Review Your Recording"
- Presentation info card:
  - Title
  - Description
  - Duration (calculated from video blob)
- Video player showing recorded video
- Buttons:
  - "Re-record" (secondary, returns to SETUP state, clears video)
  - "Submit for Analysis" (primary, proceeds to UPLOADING)
  - "Cancel" (ghost, returns to dashboard, discards recording)

**Technical**:
- Use VideoRecorder component in preview state
- Display calculated duration from video blob
- Preserve form data (title, description) if user re-records

### State 4: UPLOADING
**Purpose**: Save data and show progress (mock for Phase 1)

**UI Elements**:
- Title: "Saving Your Presentation..."
- Progress indicator (indeterminate for Phase 1)
- Status text: "Uploading video..." (mock message)
- No buttons (prevent navigation during save)

**Technical Operations**:
1. Generate presentation ID: `pres-${Date.now()}`
2. Save video blob to IndexedDB using `saveVideoBlob(id, blob)`
3. Create presentation metadata object
4. Save presentation to localStorage using `savePresentationToStorage(presentation)`
5. Navigate to `/presentations/[id]/processing`

**Presentation Metadata**:
```typescript
{
  id: string;              // pres-${Date.now()}
  userId: string;          // from auth context
  title: string;           // from form
  description?: string;    // from form
  type: 'VIDEO_RECORDING'; // hardcoded for MVP
  videoUrl: string;        // For Phase 1: use 'indexeddb://[id]' as marker
  duration: number;        // calculated from video blob (seconds)
  visibility: 'PRIVATE';   // hardcoded for MVP
  status: 'PROCESSING';    // initial status
  createdAt: string;       // new Date().toISOString()
}
```

---

## Component Structure

```typescript
// src/app/practice/page.tsx
'use client';

type PageState = 'setup' | 'recording' | 'preview' | 'uploading';

export default function PracticePage() {
  // State management
  const [pageState, setPageState] = useState<PageState>('setup');
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Auth context
  const { user } = useAuth();
  const router = useRouter();
  
  // Auth check
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);
  
  // State handlers
  const handleStartRecording = () => { /* validate form, transition to recording */ };
  const handleRecordingComplete = (blob: Blob) => { /* save blob, transition to preview */ };
  const handleReRecord = () => { /* clear blob, transition to setup */ };
  const handleSubmit = async () => { /* transition to uploading, save data */ };
  const handleCancel = () => { /* navigate to dashboard */ };
  
  // Render based on state
  return (
    <DashboardLayout>
      {pageState === 'setup' && <SetupView />}
      {pageState === 'recording' && <RecordingView />}
      {pageState === 'preview' && <PreviewView />}
      {pageState === 'uploading' && <UploadingView />}
    </DashboardLayout>
  );
}
```

---

## formatters.ts Utility Functions

```typescript
// src/lib/utils/formatters.ts

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${padZero(minutes)}:${padZero(secs)}`;
  }
  return `${minutes}:${padZero(secs)}`;
}

/**
 * Format date to relative time or absolute date
 */
export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Calculate video duration from blob
 */
export function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(blob);
  });
}

function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}
```

---

## Error Handling

### Permission Errors
- Camera/microphone permission denied: Show error message in SETUP state
- Handled by VideoRecorder component from Task 7
- Display error, disable "Start Recording" button

### Form Validation Errors
- Missing title: "Title is required"
- Title too short: "Title must be at least 3 characters"
- Title too long: "Title cannot exceed 100 characters"
- Description too long: "Description cannot exceed 500 characters"

### Save Errors
- IndexedDB failure: Log error, show toast, return to PREVIEW state
- localStorage failure: Log error, show toast, return to PREVIEW state
- Generic fallback: "Failed to save presentation. Please try again."

---

## Storage Operations

### Save Video to IndexedDB
```typescript
import { saveVideoBlob } from '@/lib/storage/indexedDB';

await saveVideoBlob(presentationId, videoBlob);
```

### Save Presentation Metadata to localStorage
```typescript
import { savePresentationToStorage } from '@/lib/storage/localStorage';

const presentation: Presentation = {
  id: `pres-${Date.now()}`,
  userId: user.id,
  title: formData.title,
  description: formData.description || undefined,
  type: 'VIDEO_RECORDING',
  videoUrl: `indexeddb://${presentationId}`, // marker for Phase 1
  duration: await getVideoDuration(videoBlob),
  visibility: 'PRIVATE',
  status: 'PROCESSING',
  createdAt: new Date().toISOString(),
};

savePresentationToStorage(presentation);
```

### Navigate to Processing Page
```typescript
router.push(`/presentations/${presentationId}/processing`);
```

---

## Responsive Design Considerations

- **Mobile**: Stack form fields vertically, full-width buttons
- **Tablet**: Same as mobile with better spacing
- **Desktop**: Center content with max-width, side-by-side buttons

---

## Accessibility Requirements

- Form labels associated with inputs via `htmlFor` and `id`
- Error messages linked via `aria-describedby`
- Loading state announced via `aria-live="polite"`
- Keyboard navigation for all interactive elements
- Focus management between states

---

## Testing Checklist

- [ ] Form validation works correctly
- [ ] Camera permission errors display properly
- [ ] Video recording completes and transitions to preview
- [ ] Re-record clears video and returns to setup
- [ ] Cancel button returns to dashboard
- [ ] Submit saves to IndexedDB and localStorage
- [ ] Duration calculation works correctly
- [ ] Navigation to processing page works
- [ ] State transitions are smooth
- [ ] No memory leaks from video blobs

---

## Implementation Order

1. Create `formatters.ts` with utility functions
2. Create practice page skeleton with DashboardLayout
3. Implement SETUP state (form + validation)
4. Implement RECORDING state (integrate VideoRecorder)
5. Implement PREVIEW state (show video + metadata)
6. Implement UPLOADING state (save operations)
7. Wire up state transitions
8. Add error handling
9. Test complete flow
10. Commit: "feat: add practice recording page with all states"

---

## Dependencies

### Components from Previous Tasks
- `VideoRecorder` (Task 7) - for recording and preview
- `Button`, `Input`, `Card` (Task 1) - UI elements
- `DashboardLayout` (Task 5) - page wrapper
- `useAuth` (Task 3) - user authentication

### Storage Functions
- `saveVideoBlob` from `@/lib/storage/indexedDB`
- `savePresentationToStorage` from `@/lib/storage/localStorage`

### Types
- `Presentation` from `@/lib/types`

---

## Future Enhancements (Phase 2)

- Upload video file option
- Text script input option
- Real-time transcription preview
- Save draft presentations
- Multiple video takes management
- Video trimming/editing
- Background upload with progress tracking

---

## Notes

- This completes the "record presentation" user flow from the MVP spec
- Phase 1 uses mock upload (just saves to IndexedDB/localStorage)
- Phase 2 will integrate real S3 upload with presigned URLs
- Processing page (Task 9) handles the next step in the flow
