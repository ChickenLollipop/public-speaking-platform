# Video Transcription with Deepgram - Design Specification

**Date:** 2026-05-14  
**Status:** Approved  
**Implementation:** Sequential Flow (Approach A)

## Overview

Integrate Deepgram speech-to-text API to automatically transcribe uploaded videos. This completes the core flow: upload video → transcribe → analyze with AI → view results. Currently, the system uses mock transcripts for videos, which limits usefulness.

## Requirements Summary

### Functional Requirements
- Transcribe video files automatically when user clicks "Analyze with AI"
- Store transcripts in Presentation table for reuse
- Charge credits separately for transcription (transparent pricing)
- Support retry logic for transient failures (3 attempts)
- Proxy video through server for security (no direct S3 URLs to Deepgram)

### Non-Functional Requirements
- No mock mode - Deepgram API key is required
- Handle videos up to 60+ minutes
- Stream video data (don't load entire file into memory)
- Clear error messages for different failure types
- Transaction safety (credits deducted only on success)

### Out of Scope
- Real-time transcription during upload
- Speaker diarization (who said what)
- Custom vocabulary or training
- Transcript editing UI (view-only for now)
- Cost estimation before transcribing

## Architecture

### System Flow

```
User clicks "Analyze with AI"
       ↓
POST /api/presentations/:id/analyze
       ↓
Check: Does presentation.transcript exist?
       ↓ NO
Transcription Flow:
  1. Validate video exists (videoUrl not null)
  2. Calculate transcription cost (1 credit/minute)
  3. Check user has sufficient credits
  4. Fetch video from S3 as stream
  5. Send stream to Deepgram API
  6. Retry up to 3 times on failure
  7. Get transcript back
  8. Deduct transcription credits
  9. Store transcript + metadata in Presentation
       ↓ YES (or after transcription)
Analysis Flow (existing):
  1. Get transcript from Presentation
  2. Run AI content analysis
  3. Calculate delivery metrics
  4. Calculate analysis cost
  5. Deduct analysis credits
  6. Store results in AIAnalysis
       ↓
Update presentation status to READY
Return results to frontend
```

### Component Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend: Presentation Detail Page             │
│  - "Analyze with AI" button                     │
│  - Loading states: transcribing → analyzing     │
│  - View transcript section                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓ POST /analyze
┌─────────────────────────────────────────────────┐
│  API Endpoint: /api/presentations/[id]/analyze  │
│  - Check transcript exists                      │
│  - Orchestrate transcription + analysis         │
│  - Handle credit checks & deductions            │
└─────┬─────────────────────────┬─────────────────┘
      │                         │
      ↓ (if no transcript)      ↓ (always)
┌─────────────────────┐   ┌──────────────────────┐
│ Transcription       │   │ Analysis Service     │
│ Service             │   │ (existing)           │
│                     │   │                      │
│ - Fetch from S3     │   │ - Delivery metrics   │
│ - Stream to DG      │   │ - Content analysis   │
│ - Parse response    │   │ - Overall score      │
│ - Retry logic       │   └──────────────────────┘
└──────┬──────────────┘
       │
       ↓
┌──────────────────────┐
│ Deepgram API         │
│ - Prerecorded API    │
│ - Nova-2 model       │
└──────────────────────┘
```

## Data Models

### Database Schema Changes

**Presentation table (add fields):**
```prisma
model Presentation {
  id            String            @id @default(uuid())
  userId        String            @map("user_id")
  title         String
  description   String?
  type          PresentationType
  videoUrl      String?           @map("video_url")
  scriptText    String?           @map("script_text")
  duration      Int?              // seconds
  transcript    String?           @db.Text  // NEW: Transcribed text
  transcribedAt DateTime?         @map("transcribed_at")  // NEW: When transcribed
  visibility    Visibility        @default(PRIVATE)
  status        ProcessingStatus  @default(PROCESSING)
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
```sql
ALTER TABLE presentations 
ADD COLUMN transcript TEXT,
ADD COLUMN transcribed_at TIMESTAMP;
```

### TypeScript Interfaces

**TranscriptionResult:**
```typescript
interface TranscriptionResult {
  transcript: string;        // Full transcription text
  durationSeconds: number;   // Actual video duration from Deepgram
  confidence: number;        // Average confidence score (0-1)
  words?: Array<{           // Optional word-level timestamps
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}
```

**DeepgramResponse (internal):**
```typescript
interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
    }>;
  };
  metadata: {
    duration: number;
    model_uuid: string;
    request_id: string;
  };
}
```

### Credit Transaction Type

**Add to CreditTransactionType enum:**
```prisma
enum CreditTransactionType {
  INITIAL_BONUS
  FEEDBACK_GIVEN
  FEEDBACK_RECEIVED
  AI_ANALYSIS
  TRANSCRIPTION    // NEW
  PARTNER_SESSION
  REFUND
}
```

## Component Details

### 1. Deepgram Client (`src/lib/deepgram/client.ts`)

**Purpose:** Initialize and export Deepgram SDK client.

**Implementation:**
```typescript
import { createClient } from '@deepgram/sdk';

const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
  throw new Error(
    'DEEPGRAM_API_KEY environment variable is required. ' +
    'Get your API key from https://deepgram.com/'
  );
}

let deepgramClient: ReturnType<typeof createClient> | null = null;

export function getDeepgramClient() {
  if (!deepgramClient) {
    deepgramClient = createClient(apiKey);
  }
  return deepgramClient;
}

export const isDeepgramConfigured = Boolean(apiKey);
```

**Error handling:**
- Throw immediately if API key missing (no lazy initialization)
- Clear error message with instructions
- Singleton pattern for client reuse

### 2. Transcription Service (`src/lib/deepgram/transcribe.ts`)

**Main function:**
```typescript
export async function transcribeVideo(
  videoKey: string,
  maxRetries: number = 3
): Promise<TranscriptionResult>
```

**Implementation steps:**

1. **Fetch video from S3:**
```typescript
const s3Client = getS3Client();
const command = new GetObjectCommand({
  Bucket: S3_BUCKET_NAME,
  Key: videoKey,
});
const response = await s3Client.send(command);
const videoStream = response.Body as Readable;
```

2. **Configure Deepgram options:**
```typescript
const options = {
  model: 'nova-2',           // Latest general model
  smart_format: true,        // Automatic punctuation/formatting
  language: 'en',            // English
  punctuate: true,
  utterances: false,         // Don't need utterance splitting
  diarize: false,            // No speaker separation (future feature)
};
```

3. **Transcribe with streaming:**
```typescript
const deepgram = getDeepgramClient();
const { result } = await deepgram.listen.prerecorded.transcribeFile(
  videoStream,
  options
);
```

4. **Parse response:**
```typescript
const transcript = result.results.channels[0].alternatives[0].transcript;
const confidence = result.results.channels[0].alternatives[0].confidence;
const duration = result.metadata.duration;

return {
  transcript,
  durationSeconds: Math.round(duration),
  confidence,
  words: result.results.channels[0].alternatives[0].words,
};
```

5. **Retry logic (wrapper):**
```typescript
async function transcribeWithRetry(
  videoKey: string,
  maxRetries: number
): Promise<TranscriptionResult> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeVideo(videoKey);
    } catch (error) {
      lastError = error;
      
      // Don't retry on these errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // Last attempt?
      if (attempt === maxRetries) {
        throw new Error(
          `Transcription failed after ${maxRetries} attempts: ${lastError.message}`
        );
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function isNonRetryableError(error: any): boolean {
  // Don't retry client errors (400, 401, 402, 403, 404)
  if (error.status && error.status >= 400 && error.status < 500) {
    return true;
  }
  
  // Don't retry unsupported format errors
  if (error.message?.includes('unsupported') || 
      error.message?.includes('invalid format')) {
    return true;
  }
  
  return false;
}
```

**Error types:**
```typescript
class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}
```

### 3. Credit Calculator (`src/lib/credits/calculate.ts`)

**Add new function:**
```typescript
/**
 * Calculate transcription cost based on video duration
 * 
 * Formula: 1 credit per minute (rounded up)
 * Minimum: 1 credit
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  if (durationSeconds <= 0) {
    throw new Error('Duration must be positive');
  }
  
  const minutes = durationSeconds / 60;
  return Math.max(1, Math.ceil(minutes));
}
```

**Examples:**
- 30 seconds → 1 credit
- 1 minute → 1 credit
- 90 seconds → 2 credits
- 5 minutes → 5 credits
- 62 minutes → 62 credits

### 4. Modified Analysis Endpoint

**File:** `src/app/api/presentations/[id]/analyze/route.ts`

**New transcription flow (insert before analysis):**

```typescript
// After fetching presentation and checking permissions...

let transcript: string;
let transcriptionCost = 0;

if (presentation.type === 'TEXT_SCRIPT') {
  // Text presentations don't need transcription
  transcript = presentation.scriptText || '';
  if (!transcript) {
    return NextResponse.json(
      { error: 'Script text not found' },
      { status: 400 }
    );
  }
} else {
  // VIDEO_UPLOAD or VIDEO_RECORDING types
  
  // Check if video was uploaded
  if (!presentation.videoUrl) {
    return NextResponse.json(
      { error: 'Video not uploaded' },
      { status: 400 }
    );
  }
  
  // Check if already transcribed
  if (presentation.transcript) {
    // Use existing transcript (no cost)
    transcript = presentation.transcript;
  } else {
    // Need to transcribe
    
    // Estimate cost (use duration if available, else estimate from upload)
    const estimatedDuration = presentation.duration || 300; // 5 min default
    transcriptionCost = calculateTranscriptionCost(estimatedDuration);
    
    // Check credits BEFORE transcribing
    if (presentation.user.creditBalance < transcriptionCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits for transcription',
          required: transcriptionCost,
          balance: presentation.user.creditBalance,
        },
        { status: 402 }
      );
    }
    
    try {
      // Transcribe video
      const transcriptionResult = await transcribeVideo(presentation.videoUrl);
      transcript = transcriptionResult.transcript;
      
      // Deduct transcription credits
      await deductCredits(
        presentation.userId,
        transcriptionCost,
        'TRANSCRIPTION',
        presentation.id
      );
      
      // Store transcript in database
      await db.presentation.update({
        where: { id: presentation.id },
        data: {
          transcript: transcriptionResult.transcript,
          transcribedAt: new Date(),
          duration: transcriptionResult.durationSeconds,
        },
      });
      
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Update presentation status to FAILED
      await db.presentation.update({
        where: { id: presentation.id },
        data: { status: 'FAILED' },
      }).catch(() => {}); // Ignore update errors
      
      return NextResponse.json(
        { 
          error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          step: 'transcription',
        },
        { status: 500 }
      );
    }
  }
}

// Continue with existing analysis logic...
const analysis = await analyzePresentation(
  transcript,
  presentation.duration || Math.ceil(transcript.split(/\s+/).length / 2.5),
  presentation.user.goals
);

// ... rest of existing code
```

**Key changes:**
1. Check for existing transcript first
2. Calculate and check credits before transcribing
3. Call transcription service if needed
4. Store transcript immediately after success
5. Handle transcription errors separately from analysis errors

## Error Handling

### Error Response Format

**Transcription errors:**
```json
{
  "error": "Transcription failed: Unsupported video format",
  "step": "transcription",
  "code": "UNSUPPORTED_FORMAT"
}
```

**Insufficient credits:**
```json
{
  "error": "Insufficient credits for transcription",
  "required": 5,
  "balance": 3,
  "step": "transcription"
}
```

### Error Categories

**1. Configuration Errors (500):**
- Missing Deepgram API key
- Invalid Deepgram credentials
- S3 configuration issues

**2. Client Errors (400):**
- Video not uploaded
- Unsupported video format
- Corrupted video file
- No audio track in video

**3. Payment Errors (402):**
- Insufficient credits for transcription
- Deepgram account out of credits

**4. Server Errors (500 with retry):**
- Network timeout
- Deepgram API 5xx errors
- S3 fetch failures
- Database errors

**5. Rate Limiting (429):**
- Deepgram rate limit exceeded
- Handled by retry with backoff

### Retry Strategy

**Retryable conditions:**
- Network errors (ECONNRESET, ETIMEDOUT)
- HTTP 5xx from Deepgram
- HTTP 429 (rate limit)
- S3 temporary failures

**Non-retryable conditions:**
- HTTP 400, 401, 403, 404 (client errors)
- HTTP 402 (payment required)
- Unsupported format errors
- Invalid video structure

**Retry configuration:**
- Max attempts: 3
- Backoff: exponential (1s, 2s, 4s)
- Total max time: ~7 seconds of retries
- Timeout per attempt: 120 seconds

## Frontend Changes

### Presentation Detail Page

**File:** `src/app/presentations/[id]/page.tsx`

**New state management:**
```typescript
const [analysisStep, setAnalysisStep] = useState<
  'idle' | 'transcribing' | 'analyzing' | 'complete' | 'error'
>('idle');
const [analysisError, setAnalysisError] = useState<string | null>(null);
```

**Modified analyze handler:**
```typescript
const handleAnalyze = async () => {
  setAnalysisStep('transcribing'); // Assume transcription first
  setAnalysisError(null);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/presentations/${presentationId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Analysis failed');
    }
    
    setAnalysisStep('complete');
    
    // Refresh presentation data
    const refreshResponse = await fetch(`/api/presentations/${presentationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      setPresentation(data.presentation);
    }
  } catch (err) {
    console.error('Analysis error:', err);
    setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    setAnalysisStep('error');
  }
};
```

**UI updates:**

**1. Loading states:**
```tsx
{analysisStep === 'transcribing' && (
  <Card>
    <div className="flex items-center space-x-3">
      <Spinner />
      <div>
        <h3 className="font-semibold">Transcribing video...</h3>
        <p className="text-sm text-gray-600">
          This may take a minute. Processing audio from your video.
        </p>
      </div>
    </div>
  </Card>
)}

{analysisStep === 'analyzing' && (
  <Card>
    <div className="flex items-center space-x-3">
      <Spinner />
      <div>
        <h3 className="font-semibold">Analyzing content...</h3>
        <p className="text-sm text-gray-600">
          AI is evaluating your presentation.
        </p>
      </div>
    </div>
  </Card>
)}
```

**2. Analyze button:**
```tsx
<Button
  onClick={handleAnalyze}
  loading={analysisStep === 'transcribing' || analysisStep === 'analyzing'}
  disabled={analysisStep !== 'idle' && analysisStep !== 'error'}
>
  {analysisStep === 'transcribing' 
    ? 'Transcribing...' 
    : analysisStep === 'analyzing'
    ? 'Analyzing...'
    : 'Analyze with AI'}
</Button>
```

**3. Transcript viewer:**
```tsx
{presentation.transcript && (
  <Card>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">
      Transcript
    </h2>
    <div className="text-sm text-gray-600 mb-3 flex items-center gap-4">
      <span>{wordCount} words</span>
      <span>•</span>
      <span>{formatDuration(presentation.duration)}</span>
      {presentation.transcribedAt && (
        <>
          <span>•</span>
          <span>Transcribed {formatDate(presentation.transcribedAt)}</span>
        </>
      )}
    </div>
    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
      <p className="text-gray-700 whitespace-pre-wrap">
        {presentation.transcript}
      </p>
    </div>
  </Card>
)}
```

**4. Enhanced error display:**
```tsx
{analysisError && (
  <Card>
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-2">Analysis Failed</h3>
      <p className="text-red-800">{analysisError}</p>
      
      {analysisError.includes('Insufficient credits') && (
        <div className="mt-3">
          <p className="text-sm text-red-700">
            You need more credits to transcribe this video.
          </p>
          {/* Future: Link to credit purchase/earning */}
        </div>
      )}
      
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setAnalysisError(null)}
        className="mt-3"
      >
        Dismiss
      </Button>
    </div>
  </Card>
)}
```

## Testing Strategy

### Unit Tests

**1. Deepgram client (`src/lib/deepgram/client.test.ts`):**
- ✓ Throws error when API key missing
- ✓ Creates client with valid key
- ✓ Returns same instance (singleton)

**2. Transcription service (`src/lib/deepgram/transcribe.test.ts`):**
- ✓ Successfully transcribes video (mocked)
- ✓ Retries on network error (mock failure → success)
- ✓ Fails after max retries
- ✓ Doesn't retry on 400 errors
- ✓ Parses Deepgram response correctly
- ✓ Handles missing audio track
- ✓ Handles unsupported format

**3. Credit calculation (`src/lib/credits/calculate.test.ts`):**
- ✓ Calculates cost correctly for various durations
- ✓ Rounds up correctly (30s → 1, 90s → 2)
- ✓ Minimum 1 credit
- ✓ Throws on invalid duration

### Integration Tests

**1. Full transcription flow:**
```typescript
describe('Transcription flow', () => {
  it('transcribes video and stores result', async () => {
    // Create presentation with video
    const presentation = await createTestPresentation({
      type: 'VIDEO_UPLOAD',
      videoUrl: 'test-video-key.mp4',
    });
    
    // Mock Deepgram response
    mockDeepgram.transcribe.mockResolvedValue({
      transcript: 'Test transcript',
      durationSeconds: 30,
      confidence: 0.95,
    });
    
    // Trigger analysis
    const response = await POST(`/api/presentations/${presentation.id}/analyze`);
    
    // Verify transcript stored
    const updated = await db.presentation.findUnique({
      where: { id: presentation.id },
    });
    
    expect(updated.transcript).toBe('Test transcript');
    expect(updated.transcribedAt).toBeTruthy();
  });
});
```

**2. Credit deduction:**
```typescript
it('deducts transcription credits correctly', async () => {
  const user = await createTestUser({ creditBalance: 100 });
  const presentation = await createTestPresentation({
    userId: user.id,
    videoUrl: 'test-video.mp4',
    duration: 300, // 5 minutes
  });
  
  await POST(`/api/presentations/${presentation.id}/analyze`);
  
  // Check transactions
  const transactions = await db.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  
  const transcriptionTx = transactions.find(t => t.type === 'TRANSCRIPTION');
  expect(transcriptionTx.amount).toBe(-5); // 5 minutes = 5 credits
});
```

**3. Insufficient credits:**
```typescript
it('returns 402 when insufficient credits', async () => {
  const user = await createTestUser({ creditBalance: 2 });
  const presentation = await createTestPresentation({
    userId: user.id,
    videoUrl: 'test-video.mp4',
    duration: 300, // Needs 5 credits
  });
  
  const response = await POST(`/api/presentations/${presentation.id}/analyze`);
  
  expect(response.status).toBe(402);
  expect(response.body.required).toBe(5);
  expect(response.body.balance).toBe(2);
});
```

### Manual Testing

**Checklist:**
- [ ] Set up Deepgram API key
- [ ] Upload 1-minute test video
- [ ] Click "Analyze with AI"
- [ ] Verify transcription step shows in UI
- [ ] Verify analysis completes
- [ ] Check transcript appears on page
- [ ] Verify 2 credit transactions (transcription + analysis)
- [ ] Test with insufficient credits
- [ ] Test with 10-minute video (longer transcription)
- [ ] Test re-analyzing same video (no re-transcription)
- [ ] Test with corrupted video file
- [ ] Test with video without audio

### Test Fixtures

**Sample video:**
- Store in: `tests/fixtures/sample-presentation.mp4`
- Duration: 30 seconds
- Content: Simple speech about public speaking
- Size: ~2MB
- Format: MP4, H.264 video, AAC audio

**Mock Deepgram responses:**
```typescript
export const mockDeepgramSuccess = {
  results: {
    channels: [{
      alternatives: [{
        transcript: "Hello everyone. Today I want to talk about effective public speaking. The key is practice and preparation.",
        confidence: 0.95,
        words: [
          { word: "hello", start: 0.0, end: 0.5, confidence: 0.98 },
          { word: "everyone", start: 0.6, end: 1.0, confidence: 0.97 },
          // ... more words
        ]
      }]
    }]
  },
  metadata: {
    duration: 30.5,
    model_uuid: "nova-2-general",
    request_id: "test-request-123"
  }
};

export const mockDeepgramError = {
  error: {
    message: "Unsupported audio format",
    type: "invalid_request_error"
  }
};
```

## Configuration & Environment

### Environment Variables

**Required:**
```bash
DEEPGRAM_API_KEY="your-deepgram-api-key"
```

**Optional:**
```bash
DEEPGRAM_API_URL="https://api.deepgram.com"  # For testing
```

### Getting Deepgram API Key

1. Sign up at https://deepgram.com/
2. Navigate to API Keys in console
3. Create new API key
4. Copy to `.env` file

**Free tier:**
- $200 credit
- Enough for ~45 hours of transcription
- No credit card required

### .env.example Update

```bash
# Add to .env.example:

# Deepgram (required for video transcription)
DEEPGRAM_API_KEY="your-deepgram-api-key"

# Get your API key from: https://deepgram.com/
# Free tier: $200 credit (~45 hours of transcription)
```

## Documentation Updates

### 1. README.md

Add Deepgram setup section:

```markdown
## Video Transcription Setup

The platform uses Deepgram for automatic speech-to-text transcription.

### Get API Key
1. Sign up at https://deepgram.com/
2. Get $200 free credits
3. Create API key from console

### Configure
```bash
# Add to .env
DEEPGRAM_API_KEY="your-key-here"
```

### Test
Upload a video and click "Analyze with AI". The system will:
1. Transcribe the video audio
2. Analyze the content with AI
3. Display results and transcript
```

### 2. New: docs/TRANSCRIPTION_GUIDE.md

Create comprehensive transcription guide covering:
- How transcription works
- Credit costs
- Supported formats
- Troubleshooting
- Deepgram configuration

### 3. API Documentation

Update analysis endpoint docs:

```markdown
## POST /api/presentations/:id/analyze

Analyzes a presentation with AI. For video presentations, automatically 
transcribes if not already done.

**Flow:**
1. Check if transcript exists
2. If not: Transcribe video (costs 1 credit/minute)
3. Then: Analyze content (costs 5 + duration + word-based credits)

**Responses:**
- `200 OK`: Analysis complete
- `400 Bad Request`: Video not uploaded, invalid presentation
- `402 Payment Required`: Insufficient credits
- `500 Internal Server Error`: Transcription or analysis failed
```

## Implementation Order

### Phase 1: Core Transcription (Priority)
1. Add Deepgram client (`src/lib/deepgram/client.ts`)
2. Add transcription service (`src/lib/deepgram/transcribe.ts`)
3. Add credit calculator function
4. Create database migration (add transcript fields)
5. Update Prisma schema
6. Run migration and generate Prisma client

### Phase 2: API Integration
7. Update analysis endpoint with transcription flow
8. Update credit transaction enum
9. Test with Postman/curl

### Phase 3: Frontend
10. Update presentation detail page UI
11. Add loading states for transcription
12. Add transcript viewer component
13. Update error handling

### Phase 4: Testing & Documentation
14. Write unit tests
15. Write integration tests
16. Create test fixtures
17. Update documentation
18. Manual testing with real videos

## Success Criteria

**Implementation is complete when:**
- ✓ Users can upload videos and get real transcripts
- ✓ Transcription costs credits (1 per minute)
- ✓ Transcripts are stored and reused (no re-transcription)
- ✓ Transcripts are visible on detail page
- ✓ Retry logic handles transient failures
- ✓ Clear error messages for different failure types
- ✓ Frontend shows transcription progress
- ✓ Unit and integration tests pass
- ✓ Documentation is complete
- ✓ Manual testing checklist completed

## Future Enhancements (Out of Scope)

**Not included in this implementation:**
- Real-time transcription during upload
- Transcript editing UI
- Speaker diarization (who said what)
- Custom vocabulary/training
- Language detection and multi-language support
- Word-level timestamps in UI (highlighting as video plays)
- Cost estimation before transcribing
- Batch transcription for multiple videos
- Transcript export (PDF, SRT, VTT)
- Re-transcription workflow (if user wants to retry)

These can be added in future iterations based on user feedback.

## Security Considerations

### Video Access
- Videos are fetched from S3 with authenticated credentials
- S3 URLs are never exposed to Deepgram
- Server proxies video data to Deepgram
- No presigned URLs shared with third parties

### API Key Protection
- Deepgram API key stored in environment variables
- Never exposed to frontend
- Server-side only usage

### Credit Fraud Prevention
- Check credits BEFORE transcribing (avoid wasted API calls)
- Credits deducted in transaction (atomic operation)
- Verify user owns presentation before transcribing
- Rate limiting on analyze endpoint (future: implement)

### Data Privacy
- Transcripts stored in our database (full control)
- Deepgram doesn't store audio after processing
- Users can delete presentations (cascade deletes transcript)
- No transcript data sent to third parties (except Anthropic for analysis)

## Performance Considerations

### Streaming
- Video is streamed from S3 to Deepgram (not loaded into memory)
- Supports large video files without memory issues
- Node.js streams handle backpressure automatically

### Timeouts
- S3 fetch timeout: 60 seconds
- Deepgram API timeout: 120 seconds (2 minutes)
- Total max time per attempt: ~180 seconds
- With 3 retries: max ~540 seconds (9 minutes)

### Database
- Transcript stored as TEXT (supports large transcripts)
- Index on userId for efficient queries
- Consider: Add index on transcribedAt if needed for analytics

### Cost Optimization
- Transcript stored in database (no re-transcription cost)
- Only transcribe when user clicks "Analyze"
- Don't transcribe TEXT_SCRIPT presentations
- Future: Prompt caching for Anthropic API (separate initiative)

## Monitoring & Observability

### Metrics to Track (Future)
- Transcription success rate
- Average transcription time by video length
- Deepgram API errors by type
- Retry counts
- Cost per transcription
- Credit usage patterns

### Logging
```typescript
console.log('Transcription started', { presentationId, videoKey });
console.log('Transcription completed', { presentationId, duration, confidence });
console.error('Transcription failed', { presentationId, error, attempt });
```

### Error Tracking
- Log transcription failures with context
- Track retry counts
- Monitor Deepgram API errors
- Alert on high failure rates

## Rollback Plan

**If transcription causes issues:**
1. Set `DEEPGRAM_API_KEY=""` (empty)
2. System will fail early with clear error
3. Users can still analyze TEXT_SCRIPT presentations
4. Existing transcripts in database remain usable
5. No data loss

**Database rollback:**
```sql
-- If needed to remove fields
ALTER TABLE presentations 
DROP COLUMN transcript,
DROP COLUMN transcribed_at;
```

## Acceptance Criteria

**Definition of Done:**

1. **Functionality:**
   - [ ] Videos are transcribed automatically when clicking "Analyze"
   - [ ] Transcripts are stored in Presentation table
   - [ ] Existing transcripts are reused (no re-transcription)
   - [ ] Credits are deducted correctly (1 per minute)
   - [ ] Retry logic works (3 attempts)

2. **User Experience:**
   - [ ] Clear loading states ("Transcribing..." → "Analyzing...")
   - [ ] Transcripts are visible on detail page
   - [ ] Error messages are specific and helpful
   - [ ] Insufficient credit error shows balance and required amount

3. **Technical:**
   - [ ] Unit tests pass (90%+ coverage for new code)
   - [ ] Integration tests pass
   - [ ] No memory leaks (streaming works correctly)
   - [ ] Database migration runs cleanly
   - [ ] Environment variables documented

4. **Documentation:**
   - [ ] README updated with Deepgram setup
   - [ ] TRANSCRIPTION_GUIDE.md created
   - [ ] API docs updated
   - [ ] .env.example includes Deepgram key

5. **Testing:**
   - [ ] Manual testing checklist completed
   - [ ] Tested with various video lengths (30s, 5min, 30min)
   - [ ] Tested error scenarios (insufficient credits, bad video)
   - [ ] Tested on fresh database migration

## Sign-off

**Design approved by:** [User]  
**Date:** 2026-05-14  
**Ready for implementation:** Yes

---

**Next Steps:**
1. Review this specification
2. Create detailed implementation plan
3. Begin Phase 1 development
