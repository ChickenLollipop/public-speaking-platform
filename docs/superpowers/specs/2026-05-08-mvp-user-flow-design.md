# Public Speaking Platform - MVP User Flow Design

**Date:** 2026-05-08  
**Status:** Ready for Implementation  
**Target:** Complete single-user practice flow with AI feedback  
**Approach:** Frontend-first with mock data, then API integration

---

## Executive Summary

This design outlines the implementation of the core MVP user flow for the public speaking platform: a user can sign up, record a video presentation in their browser, and receive comprehensive AI-powered feedback on both delivery and content. This phase focuses on the single-user experience before building community features.

**Key Decisions:**
- Frontend-first approach: Build all UI with mock data, then integrate real APIs
- Browser recording only: MediaRecorder API, no file uploads in MVP
- Free AI analysis: No credit deductions during MVP testing phase
- Manual processing trigger: Button to kick off AI analysis for testing
- 7 core pages: Complete journey from landing page to results

**Success Metric:** A user can go from signup → record presentation → receive AI feedback in under 10 minutes.

---

## Scope

### In Scope for This Phase

**Pages (7 total):**
1. Landing page (marketing/hero)
2. Signup page
3. Login page
4. Dashboard (authenticated home)
5. Practice/recording page
6. Processing page (AI analysis status)
7. Results page (AI feedback display)

**Features:**
- User authentication (signup, login, session management)
- Browser-based video recording (camera + microphone)
- Video upload to S3
- AI-powered analysis (transcription + delivery metrics + content analysis)
- Comprehensive results display
- Credit balance tracking (display only, no deductions)
- Responsive design (desktop + mobile)

### Out of Scope for This Phase

- Community feedback requests
- Giving feedback to others
- Practice partner matching
- Credit transactions (earning/spending)
- File upload for videos
- Text script analysis
- OAuth login
- Email verification
- Password reset
- Native mobile apps (Capacitor)
- Push notifications
- Video editing/trimming

---

## User Flow

```
Landing Page
    ↓ (Sign Up)
Signup Page → [Create Account]
    ↓
Dashboard → (displays: credit balance, action cards, presentations list)
    ↓ (New Practice)
Practice Page
    ↓ [States: Setup → Recording → Preview → Upload]
Processing Page → [Manual Trigger] → [Poll for completion]
    ↓ (status: ready)
Results Page → (displays: video, transcript, delivery metrics, content analysis)
    ↓ (Practice Again)
[Loop back to Practice Page]
```

---

## Technical Approach

### Phase 1: Frontend with Mock Data (3-4 days)

Build all 7 pages with complete UI/UX using:
- Mock data stored in localStorage
- Video blobs stored in IndexedDB
- React Context for auth state
- No real API calls (except existing auth endpoints optionally)

**Why this approach:**
- Get UX right before backend complexity
- Visual progress for demos and feedback
- Backend already has most pieces (auth, S3, AI libs)
- Easy to test and iterate on UI

### Phase 2: API Integration (2-3 days)

Replace mocks with real APIs:
- Connect to existing auth endpoints
- Build missing presentation/analysis endpoints
- Integrate Deepgram for transcription
- Integrate Claude API for content analysis
- Implement S3 upload flow
- Add React Query for data fetching

---

## Page Designs

### 1. Landing Page (`/page.tsx`)

**Purpose:** Convert visitors to signups

**Sections:**

**Hero:**
- Headline: "Master Public Speaking with AI-Powered Feedback"
- Subheadline: "Practice presentations, get instant feedback on delivery and content"
- CTA buttons: "Get Started Free" (→ signup), "Sign In" (→ login)
- Hero image/video: Screenshot or demo of platform

**Features (3 columns):**
1. **Instant AI Feedback**
   - Icon: Brain/robot
   - Description: "Get detailed analysis on pace, filler words, structure, and persuasiveness"

2. **Practice Anywhere**
   - Icon: Camera/video
   - Description: "Record directly in your browser, no software to install"

3. **Track Progress**
   - Icon: Chart/graph
   - Description: "See your improvement over time with every practice session"

**How It Works (3 steps):**
1. Record your presentation
2. AI analyzes delivery and content
3. Get actionable feedback

**Footer:**
- Links: About, Privacy, Terms
- Copyright notice

**Mock Data:** None (static content)

**Mobile Responsive:**
- Stack sections vertically
- Full-width CTAs
- Hamburger menu if needed

---

### 2. Signup Page (`/signup/page.tsx`)

**Purpose:** User registration

**Layout:**

**Left Side (or top on mobile):**
- Heading: "Create Your Account"
- Subheading: "Start improving your public speaking skills"

**Right Side (or below on mobile):**

**Form Fields:**
1. **Name**
   - Type: text
   - Required
   - Placeholder: "Your full name"
   - Validation: Min 2 characters

2. **Email**
   - Type: email
   - Required
   - Placeholder: "you@example.com"
   - Validation: Valid email format, unique (API check)

3. **Password**
   - Type: password (with show/hide toggle)
   - Required
   - Placeholder: "Min 8 characters"
   - Validation: Min 8 characters
   - Show strength indicator (weak/medium/strong)

4. **Skill Level**
   - Type: select dropdown
   - Required
   - Options: "Beginner", "Intermediate", "Advanced"
   - Default: "Beginner"

5. **Goals** (checkboxes, at least one required)
   - [ ] Job interviews
   - [ ] Sales pitches
   - [ ] Academic presentations
   - [ ] Casual speaking

**Submit Button:**
- Text: "Create Account"
- Disabled until form valid
- Loading spinner during submission

**Footer:**
- "Already have an account? [Sign In](#)"

**Flow:**
1. User fills form
2. Submit → `POST /api/auth/signup`
3. Success → Store JWT token → Show toast "Welcome! You've received 50 free credits" → Redirect to `/dashboard`
4. Error → Show error message inline

**Mock Approach (Phase 1):**
- Form validation works client-side
- Submit stores user to localStorage
- Generate fake JWT token
- Redirect to dashboard

**Real API (Phase 2):**
- Connect to existing `POST /api/auth/signup`
- Handle validation errors from backend
- Store real JWT token in httpOnly cookie or localStorage

**Validation Rules:**
- Name: Required, 2-100 chars
- Email: Required, valid format, not already registered
- Password: Required, min 8 chars, recommend strong password
- Skill level: Required
- Goals: At least one selected

**Error Messages:**
- "Email already registered" → Show link to login
- "Password too weak" → Show requirements
- Network error → "Connection failed. Please try again."

---

### 3. Login Page (`/login/page.tsx`)

**Purpose:** User authentication

**Layout:**

**Left Side (or top on mobile):**
- Heading: "Welcome Back"
- Subheading: "Sign in to continue practicing"

**Right Side (or below on mobile):**

**Form Fields:**
1. **Email**
   - Type: email
   - Required
   - Placeholder: "you@example.com"

2. **Password**
   - Type: password (with show/hide toggle)
   - Required
   - Placeholder: "Your password"

**Additional Elements:**
- [ ] Remember me (optional checkbox)
- "Forgot password?" link (placeholder for MVP, shows "Coming soon" toast)

**Submit Button:**
- Text: "Sign In"
- Disabled until both fields filled
- Loading spinner during submission

**Footer:**
- "Don't have an account? [Sign Up](#)"

**Flow:**
1. User enters credentials
2. Submit → `POST /api/auth/login`
3. Success → Store JWT → Redirect to `/dashboard`
4. Error → Show "Invalid email or password"

**Mock Approach (Phase 1):**
- Check against localStorage user
- Simple email/password match
- Set auth context

**Real API (Phase 2):**
- Connect to existing `POST /api/auth/login`
- Handle auth errors
- Store JWT securely

**Error States:**
- Invalid credentials: "Email or password incorrect"
- Network error: "Connection failed. Please try again."
- Account locked (future): "Too many attempts. Try again in X minutes."

---

### 4. Dashboard (`/dashboard/page.tsx`)

**Purpose:** Central hub showing user state and available actions

**Layout:**

**Header (Navbar):**
- Logo/brand: "Public Speaking Platform"
- Right side:
  - User name
  - Credit balance component (using existing `CreditBalance.tsx`)
  - Logout link

**Main Content:**

**Welcome Section:**
- Heading: "Dashboard"
- Credit balance display (large, prominent)
  - Shows current balance
  - Icon: Coin/star
  - Format: "50 Credits"

**Action Cards (3-column grid):**

1. **New Practice Card**
   - Icon: Camera/microphone (large)
   - Heading: "New Practice"
   - Description: "Record a presentation to get AI feedback"
   - Button: "Start Recording" → `/practice`
   - Style: Primary color, prominent

2. **Give Feedback Card**
   - Icon: Heart/message
   - Heading: "Give Feedback"
   - Description: "Help others and earn credits"
   - Badge: "Coming Soon" (gray)
   - Button: Disabled
   - Style: Muted/grayed out

3. **Credit History Card**
   - Icon: List/transaction
   - Heading: "Credit History"
   - Description: "View your transaction history"
   - Badge: "Coming Soon" (gray)
   - Button: Disabled
   - Style: Muted/grayed out

**Presentations Section:**

**Header:**
- "Your Presentations"
- Filter/sort options (future)

**List/Table View:**

If presentations exist, show cards/rows with:
- Thumbnail (video poster or placeholder)
- Title
- Created date (formatted: "May 8, 2026" or "2 hours ago")
- Duration (formatted: "3:45")
- Status badge:
  - "Processing" (yellow/orange)
  - "Ready" (green)
  - "Failed" (red)
- Overall score (if ready): "78/100"
- Click card → Navigate to `/presentations/[id]/results`

**Empty State:**
- Illustration or icon
- Message: "No presentations yet. Start practicing!"
- Button: "Create Your First Practice" → `/practice`

**Mock Data Structure (Phase 1):**
```typescript
{
  user: {
    id: "mock-user-1",
    name: "Test User",
    email: "test@example.com",
    creditBalance: 50,
    skillLevel: "BEGINNER"
  },
  presentations: [
    {
      id: "pres-1",
      title: "My First Practice",
      createdAt: "2026-05-08T10:30:00Z",
      duration: 180, // seconds
      status: "ready",
      overallScore: 78
    }
  ]
}
```

**Real API (Phase 2):**
- Fetch user: `GET /api/auth/me`
- Fetch presentations: `GET /api/presentations`
- Use React Query for caching

**Responsive Design:**
- Mobile: Stack action cards vertically
- Tablet: 2-column grid
- Desktop: 3-column grid
- Presentations: Cards on mobile, table on desktop

---

### 5. Practice/Recording Page (`/practice/page.tsx`)

**Purpose:** Record video presentation using browser camera/microphone

**Page States:**

#### State 1: Setup (Initial)

**UI Elements:**
- Page title: "New Practice Session"
- Breadcrumb: Dashboard > New Practice

**Form:**
1. **Presentation Title** (required)
   - Input field
   - Placeholder: "e.g., Sales Pitch Practice"
   - Max 100 chars

2. **Description** (optional)
   - Textarea
   - Placeholder: "What are you working on? (optional)"
   - Max 500 chars

**Camera Preview:**
- Show camera feed preview (muted, mirrored)
- Permission request if not granted
- "Allow camera and microphone access" prompt

**Buttons:**
- "Start Recording" (primary, disabled until permissions granted)
- "Cancel" → Back to dashboard

**Permission Denied State:**
- Error message: "Camera and microphone access required"
- Instructions: "Please allow access in your browser settings"
- "Try Again" button to re-request permissions
- Link to help documentation

#### State 2: Recording

**UI Elements:**
- Large camera preview (full width or 16:9)
- Recording indicator:
  - Red dot (pulsing animation)
  - Timer: "00:45" (elapsed time)
- Status text: "Recording..."

**Controls:**
- Large "Stop Recording" button (bottom center, red)
- Small "Pause" button (future feature, not in MVP)

**Visual Feedback:**
- Audio level meter (optional)
- Red border around video preview

#### State 3: Preview

**UI Elements:**
- Video playback player
  - Standard controls (play, pause, seek, volume)
  - Show duration
- Display entered title and description
- Playback starts automatically on preview load

**Controls:**
- "Re-record" button (secondary) → Back to State 1, discard current recording
- "Submit" button (primary) → Proceed to upload

**Layout:**
- Video player: Top or left side
- Metadata: Right side or below
- Buttons: Bottom, side-by-side

#### State 4: Uploading

**UI Elements:**
- Progress bar (0-100%)
- Status text: "Uploading your presentation..."
- Upload speed (optional): "2.5 MB/s"
- ETA (optional): "30 seconds remaining"

**Controls:**
- "Cancel Upload" button (secondary, optional)
  - Shows confirmation: "Are you sure? Progress will be lost."

**On Success:**
- Show success message: "Upload complete!"
- Redirect to `/presentations/[id]/processing`

**On Error:**
- Show error message: "Upload failed. Please try again."
- "Retry" button → Attempt upload again
- "Save for Later" button → Store video locally in IndexedDB (future)

**Technical Implementation:**

**Recording:**
```typescript
const startRecording = async () => {
  // Request permissions
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { 
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true
    }
  });

  // Create MediaRecorder
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9,opus'
  });

  const chunks: Blob[] = [];
  
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    setVideoBlob(blob);
    setState('preview');
    
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
  };

  recorder.start();
  setMediaRecorder(recorder);
  setState('recording');
};
```

**Upload:**
```typescript
const uploadVideo = async (title: string, description: string, blob: Blob) => {
  // Create presentation record
  const createResponse = await fetch('/api/presentations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description,
      type: 'VIDEO_RECORDING',
      duration: Math.floor(blob.size / 50000) // Rough estimate
    })
  });
  
  const { id } = await createResponse.json();

  // Get signed upload URL
  const urlResponse = await fetch(`/api/presentations/${id}/upload-url`, {
    method: 'POST'
  });
  
  const { uploadUrl } = await urlResponse.json();

  // Upload to S3 with progress
  await uploadWithProgress(uploadUrl, blob, (progress) => {
    setUploadProgress(progress);
  });

  // Navigate to processing page
  router.push(`/presentations/${id}/processing`);
};
```

**Mock Approach (Phase 1):**
- Recording works with real MediaRecorder API
- Save blob to IndexedDB with fake ID
- Store presentation metadata in localStorage
- Skip S3 upload, just save locally
- Navigate to processing page

**Real API (Phase 2):**
- Create presentation: `POST /api/presentations` (exists)
- Get upload URL: `POST /api/presentations/[id]/upload-url` (exists)
- Upload to S3 using signed URL
- Real video available in results

**Error Handling:**
- Permission denied → Clear message + retry button
- Recording failed → Error message + refresh suggestion
- Upload failed → Retry mechanism (up to 3 attempts)
- Network lost during upload → Save to IndexedDB, resume later (future)

**Browser Compatibility:**
- Chrome/Edge: Full support (vp9 codec)
- Firefox: Full support
- Safari: May need mp4/h264 codec fallback
- Detect codec support, use appropriate mimeType

**Responsive Design:**
- Mobile: Full-screen camera preview
- Desktop: Centered preview, max 720p display
- Buttons always accessible, not hidden behind video

---

### 6. Processing Page (`/presentations/[id]/processing`)

**Purpose:** Show feedback while AI analyzes the presentation

**Layout:**

**Header:**
- Breadcrumb: Dashboard > New Practice > Processing
- Presentation title (from metadata)

**Main Content:**

**Visual Feedback:**
- Large animated spinner or illustration
- Animation: Loading dots, analyzing brain, etc.

**Status Messages (cycle through):**
- "Analyzing your presentation..." (immediate)
- "Transcribing speech..." (after 5s)
- "Evaluating delivery and content..." (after 15s)
- "Almost done..." (after 30s)

**Progress Indicator:**
- Indeterminate progress bar (pulsing)
- OR fake progress: 0% → 30% → 60% → 90% (not 100% until actually done)

**Manual Trigger (MVP Only):**
- Button: "Process AI Analysis"
- Sub-text: "Click to start analyzing your presentation"
- Disabled state after clicked
- Shows spinner on button while processing

**Info Box:**
- "This usually takes 2-5 minutes"
- "Processing includes transcription, delivery metrics, and content analysis"

**Polling Logic:**
```typescript
useEffect(() => {
  if (!isProcessing) return;
  
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/presentations/${id}`);
    const data = await response.json();
    
    if (data.status === 'ready') {
      clearInterval(pollInterval);
      router.push(`/presentations/${id}/results`);
    } else if (data.status === 'failed') {
      clearInterval(pollInterval);
      setError('Analysis failed. Please try again.');
    }
  }, 3000); // Poll every 3 seconds
  
  return () => clearInterval(pollInterval);
}, [id, isProcessing]);
```

**Navigation:**
- No back button (prevent leaving processing)
- OR allow back with warning: "Analysis will continue in background"

**Mock Approach (Phase 1):**
- Show processing UI for 5 seconds
- Generate mock AI analysis data
- Save to localStorage
- Auto-redirect to results

**Real API (Phase 2):**
- Click "Process AI Analysis" → `POST /api/analysis/[id]/process`
- Poll `GET /api/presentations/[id]` for status
- Redirect when status changes to 'ready'

**Error States:**
- Processing failed: "Analysis failed. [Retry Button]"
- Network error: "Connection lost. Retrying..."
- Timeout (>10 min): "Taking longer than expected. [Contact Support]"

**Responsive Design:**
- Centered content on all screen sizes
- Spinner scales appropriately
- Messages readable on mobile

---

### 7. Results Page (`/presentations/[id]/results`)

**Purpose:** Display comprehensive AI feedback

**Layout:**

**Header:**
- Breadcrumb: Dashboard > Presentations > [Title]
- Presentation title (editable, inline edit)
- Created date: "May 8, 2026 at 10:45 AM"
- Duration: "3:45"

**Overall Score Section:**
- Large score display: "78" out of 100
- Visual: Circular progress ring or score card
- Color-coded: Green (70-100), Yellow (50-69), Red (0-49)
- Sub-text: "Good! Here's how to improve."

**Video Player Section:**
- Embedded video player
  - Standard controls (play, pause, seek, fullscreen, volume)
  - Video URL from S3 or IndexedDB blob
- Responsive: 16:9 aspect ratio, scales to container

**Transcript Section:**
- Collapsible panel: "View Transcript"
- Scrollable transcript text
- Timestamps every ~10 seconds
- Format:
  ```
  [00:15] Welcome everyone to today's presentation about...
  [00:32] The main topic I want to discuss is the impact...
  [00:58] First, let's look at the data. As you can see...
  ```
- Clickable timestamps → Seek video to that time (future)

**Delivery Metrics Section:**

**Card Layout (2 columns on desktop, 1 on mobile):**

1. **Pace**
   - Value: "142 WPM" (words per minute)
   - Status: ✓ Good | ⚠ Too Fast/Slow
   - Target range: "125-150 WPM recommended"
   - Color: Green if in range, yellow if slightly off, red if way off

2. **Filler Words**
   - Value: "8 times" (total count)
   - Rate: "2.7 per minute"
   - Status: ✓ Excellent | ⚠ Moderate | ✗ Needs Work
   - Detail: "um (3x), uh (2x), like (3x)"
   - Timeline visualization (optional): Bar showing when they occurred

3. **Volume**
   - Value: "-18 dB" (average)
   - Status: ✓ Good | ⚠ Too Quiet/Loud
   - Range: "-20 to -15 dB recommended"

4. **Pauses**
   - Value: "5 pauses"
   - Status: ✓ Natural | ⚠ Too Many/Few
   - Detail: "Used effectively after key points"

5. **Eye Contact**
   - Value: "72%" (percentage of time facing camera)
   - Status: ✓ Good | ⚠ Needs Improvement
   - Target: "60%+ recommended"
   - Note: "Based on face detection"

**Visual Style:**
- Each metric in a card
- Icon for each metric type
- Color-coded status (green, yellow, red)
- Progress bars or gauges for visual feedback

**Content Analysis Section:**

**Card Layout:**

**Structure Score:**
- Score: "85/100"
- Status: ✓ Clear introduction and conclusion
- Feedback: "Your presentation has a strong opening hook and clear main points. The conclusion effectively summarizes your message."

**Clarity Score:**
- Score: "78/100"
- Feedback: "Most ideas are well-explained. Some transitions between sections could be smoother."
- Issues noted:
  - "Transition from point 2 to point 3 felt abrupt (at 2:15)"
  - "Consider clarifying the term 'synergy' for broader audiences"

**Persuasiveness Score:**
- Score: "72/100"
- Feedback: "Good use of examples to support your points. Adding more data or statistics could strengthen your arguments."

**What Worked Well:**
- Bulleted list of positives:
  - Strong opening hook that captures attention
  - Clear main points with logical flow
  - Effective use of examples (especially the customer success story)
  - Confident delivery tone

**Areas for Improvement:**
- Bulleted list with specific, actionable suggestions:
  - Transition between points 2 and 3 needs smoothing (timestamp 2:15)
  - Conclusion could be more actionable - consider adding a clear call-to-action
  - Add supporting data at 1:45 to strengthen the claim about market growth
  - Reduce filler words, especially "um" which appeared frequently in the middle section
  - Practice maintaining eye contact during transitions between topics

**Action Buttons (Bottom):**
- "Practice Again" (primary) → `/practice`
- "Request Community Feedback" (secondary, disabled) → Badge: "Coming Soon"
- "Download Report" (secondary, future) → Export as PDF
- "Delete Presentation" (danger, small) → Confirmation modal

**Mock Data Structure (Phase 1):**
```typescript
{
  presentation: {
    id: "pres-1",
    title: "My First Practice",
    videoUrl: "blob:indexeddb://...", // Or sample video
    duration: 180,
    createdAt: "2026-05-08T10:30:00Z",
    status: "ready"
  },
  aiAnalysis: {
    transcript: "Welcome everyone to today's presentation...",
    overallScore: 78,
    deliveryMetrics: {
      pace_wpm: 142,
      filler_word_count: 8,
      filler_words_list: ["um (3x)", "uh (2x)", "like (3x)"],
      avg_volume: -18,
      pause_count: 5,
      eye_contact_score: 72
    },
    contentAnalysis: {
      has_intro: true,
      has_conclusion: true,
      structure_score: 85,
      clarity_feedback: "Most ideas are well-explained. Some transitions could be smoother.",
      persuasiveness_score: 72,
      weak_transitions: [
        "Transition from point 2 to point 3 felt abrupt (at 2:15)"
      ],
      improvement_suggestions: [
        "Add supporting data at 1:45 to strengthen market growth claim",
        "Make conclusion more actionable with clear call-to-action",
        "Practice maintaining eye contact during topic transitions",
        "Reduce filler words in the middle section",
        "Smooth out the transition at 2:15"
      ]
    }
  }
}
```

**Real API (Phase 2):**
- Fetch presentation: `GET /api/presentations/[id]`
- Fetch analysis: `GET /api/analysis/[id]`
- Video URL from S3

**Responsive Design:**
- Desktop: 2-column layout for metrics, side-by-side
- Tablet: 2-column grid
- Mobile: Single column, stacked cards
- Video player: Full width, responsive aspect ratio

**Error States:**
- Analysis not found: "No analysis available for this presentation"
- Video load failed: "Video unavailable. [Contact Support]"
- Partial data: Show what's available, note missing sections

---

## Component Architecture

### Shared UI Components (`/components/ui/`)

**`Button.tsx`**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```
- Primary: Blue background, white text
- Secondary: White background, blue border
- Danger: Red background, white text
- Ghost: Transparent, text only

**`Input.tsx`**
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
```
- Label above input
- Error message below in red
- Focus state with blue border
- Disabled state grayed out

**`Card.tsx`**
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}
```
- White background
- Border radius: 8px
- Shadow: subtle elevation
- Hover effect if clickable

**`Badge.tsx`**
```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}
```
- Success: Green background
- Warning: Yellow/orange background
- Danger: Red background
- Info: Blue background
- Neutral: Gray background

**`ProgressBar.tsx`**
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'determinate' | 'indeterminate';
  color?: string;
  height?: number;
}
```
- Determinate: Shows exact progress
- Indeterminate: Pulsing/animated

**`Modal.tsx`**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```
- Overlay with backdrop
- Centered content
- Close button (X) in top right
- ESC key to close

### Layout Components (`/components/layout/`)

**`Navbar.tsx`**
- Logo/brand on left
- User info + credit balance on right
- Logout link
- Responsive: Hamburger menu on mobile

**`AuthLayout.tsx`**
- Wrapper for login/signup pages
- Centers content
- Optional left/right split design
- Background styling

**`DashboardLayout.tsx`**
- Includes Navbar
- Main content area with padding
- Footer (optional)

### Presentation Components (`/components/presentation/`)

**`PresentationCard.tsx`**
```typescript
interface PresentationCardProps {
  presentation: {
    id: string;
    title: string;
    createdAt: string;
    duration: number | null;
    status: 'processing' | 'ready' | 'failed';
    overallScore: number | null;
  };
  onClick: () => void;
}
```
- Thumbnail (video poster or icon)
- Title, date, duration
- Status badge
- Score (if available)
- Hover effect

**`VideoRecorder.tsx`**
```typescript
interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}
```
- Manages MediaRecorder API
- Handles states: setup, recording, preview
- Emits blob when done

**`VideoPlayer.tsx`**
```typescript
interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (time: number) => void;
}
```
- Standard video controls
- Responsive 16:9 aspect ratio
- Optional callback for seeking

**`DeliveryMetrics.tsx`**
```typescript
interface DeliveryMetricsProps {
  metrics: {
    pace_wpm: number;
    filler_word_count: number;
    filler_words_list: string[];
    avg_volume: number;
    pause_count: number;
    eye_contact_score: number;
  };
}
```
- Grid layout of metric cards
- Color-coded status
- Visual indicators (progress bars, icons)

**`ContentAnalysis.tsx`**
```typescript
interface ContentAnalysisProps {
  analysis: {
    structure_score: number;
    clarity_feedback: string;
    persuasiveness_score: number;
    weak_transitions: string[];
    improvement_suggestions: string[];
  };
}
```
- Sections for structure, clarity, persuasiveness
- Bulleted lists for feedback
- Expandable/collapsible sections

**`ScoreDisplay.tsx`**
```typescript
interface ScoreDisplayProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```
- Circular progress ring OR large number
- Color-coded by score range
- Optional label ("Overall Score")

**`TranscriptView.tsx`**
```typescript
interface TranscriptViewProps {
  transcript: string;
  onTimestampClick?: (time: number) => void;
}
```
- Scrollable text
- Timestamps formatted and clickable
- Collapsible

---

## State Management

### Auth Context (`/lib/contexts/AuthContext.tsx`)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  creditBalance: number;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  goals: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

**Phase 1 Implementation:**
- Store user in Context + localStorage
- Simple login/signup with mock validation
- Persist across page reloads

**Phase 2 Implementation:**
- Add JWT token management
- API calls for auth
- Token refresh logic

### Presentation State

**Phase 1:**
- localStorage for presentation metadata
- IndexedDB for video blobs
- Component-level state for UI

**Phase 2:**
- React Query for API data fetching
- Cache invalidation on mutations
- Optimistic updates

---

## Data Storage

### Phase 1: Mock Storage

**localStorage Schema:**
```json
{
  "auth_token": "mock-jwt-token",
  "user": {
    "id": "mock-user-1",
    "email": "user@example.com",
    "name": "Test User",
    "creditBalance": 50,
    "skillLevel": "BEGINNER",
    "goals": ["job_interviews", "sales_pitches"]
  },
  "presentations": [
    {
      "id": "pres-1",
      "userId": "mock-user-1",
      "title": "Practice Presentation",
      "description": "First practice session",
      "type": "VIDEO_RECORDING",
      "status": "ready",
      "duration": 180,
      "createdAt": "2026-05-08T10:30:00Z"
    }
  ]
}
```

**IndexedDB Schema:**
```typescript
// Database: "presentations"
// Store: "videos"
{
  id: "pres-1",
  blob: Blob, // Video data
  mimeType: "video/webm",
  size: 15728640 // bytes
}

// Store: "analyses"
{
  presentationId: "pres-1",
  transcript: "...",
  deliveryMetrics: {...},
  contentAnalysis: {...},
  overallScore: 78
}
```

**Utility Functions:**
```typescript
// /lib/storage/localStorage.ts
export const getUserFromStorage = (): User | null;
export const saveUserToStorage = (user: User): void;
export const getPresentationsFromStorage = (): Presentation[];
export const savePresentationToStorage = (presentation: Presentation): void;

// /lib/storage/indexedDB.ts
export const saveVideoBlob = (id: string, blob: Blob): Promise<void>;
export const getVideoBlob = (id: string): Promise<Blob | null>;
export const deleteVideoBlob = (id: string): Promise<void>;
export const saveAnalysis = (presentationId: string, analysis: Analysis): Promise<void>;
export const getAnalysis = (presentationId: string): Promise<Analysis | null>;
```

### Phase 2: Real Database

**API Endpoints:**

✅ **Existing:**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/presentations`
- `POST /api/presentations/[id]/upload-url`

🔨 **To Build:**
- `GET /api/presentations` - List user's presentations
- `GET /api/presentations/[id]` - Get single presentation
- `PATCH /api/presentations/[id]` - Update presentation (status, etc.)
- `DELETE /api/presentations/[id]` - Delete presentation
- `POST /api/analysis/[id]/process` - Trigger AI analysis
- `GET /api/analysis/[id]` - Get analysis results

**Database (Prisma):**
- Already configured with full schema
- No schema changes needed
- Use existing models: User, Presentation, AIAnalysis, CreditTransaction

---

## API Implementation Details (Phase 2)

### `GET /api/presentations`

**Purpose:** List user's presentations

**Request:**
- Headers: `Authorization: Bearer <JWT>`
- Query params (optional):
  - `status`: filter by status
  - `limit`: pagination
  - `offset`: pagination

**Response:**
```json
{
  "presentations": [
    {
      "id": "uuid",
      "title": "Practice Presentation",
      "description": "First session",
      "type": "VIDEO_RECORDING",
      "status": "ready",
      "duration": 180,
      "createdAt": "2026-05-08T10:30:00Z",
      "overallScore": 78
    }
  ],
  "total": 5
}
```

**Implementation:**
```typescript
export async function GET(request: Request) {
  const userId = await getUserIdFromToken(request);
  
  const presentations = await prisma.presentation.findMany({
    where: { userId },
    include: {
      aiAnalysis: {
        select: { overallScore: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return Response.json({ presentations });
}
```

### `GET /api/presentations/[id]`

**Purpose:** Get single presentation details

**Request:**
- Headers: `Authorization: Bearer <JWT>`
- Params: `id` (presentation UUID)

**Response:**
```json
{
  "id": "uuid",
  "title": "Practice Presentation",
  "description": "First session",
  "type": "VIDEO_RECORDING",
  "videoUrl": "https://s3.../video.webm",
  "duration": 180,
  "status": "ready",
  "createdAt": "2026-05-08T10:30:00Z"
}
```

**Implementation:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromToken(request);
  
  const presentation = await prisma.presentation.findUnique({
    where: { id: params.id }
  });
  
  // Verify ownership
  if (presentation.userId !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Generate signed URL for video
  const videoUrl = await getVideoUrl(presentation.videoUrl);
  
  return Response.json({ ...presentation, videoUrl });
}
```

### `POST /api/analysis/[presentationId]/process`

**Purpose:** Trigger AI analysis (manual for MVP)

**Request:**
- Headers: `Authorization: Bearer <JWT>`
- Params: `presentationId` (UUID)

**Response:**
```json
{
  "status": "processing",
  "estimatedTime": "2-5 minutes"
}
```

**Implementation (Simplified for MVP):**
```typescript
export async function POST(
  request: Request,
  { params }: { params: { presentationId: string } }
) {
  const userId = await getUserIdFromToken(request);
  
  const presentation = await prisma.presentation.findUnique({
    where: { id: params.presentationId }
  });
  
  // Verify ownership
  if (presentation.userId !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // For MVP: Process immediately (in real system, queue this job)
  await processPresentation(params.presentationId);
  
  return Response.json({ status: 'processing' });
}

async function processPresentation(presentationId: string) {
  // 1. Get presentation
  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId }
  });
  
  // 2. Download video from S3
  const videoBuffer = await downloadFromS3(presentation.videoUrl);
  
  // 3. Extract audio
  const audioBuffer = await extractAudio(videoBuffer);
  
  // 4. Transcribe with Deepgram
  const transcript = await transcribeAudio(audioBuffer);
  
  // 5. Calculate delivery metrics
  const deliveryMetrics = calculateDeliveryMetrics(transcript, audioBuffer);
  
  // 6. Analyze content with Claude
  const contentAnalysis = await analyzeContent(transcript, {
    duration: presentation.duration,
    type: presentation.type
  });
  
  // 7. Calculate overall score
  const deliveryScore = calculateDeliveryScore(deliveryMetrics);
  const contentScore = calculateContentScore(contentAnalysis);
  const overallScore = Math.round(deliveryScore * 0.4 + contentScore * 0.6);
  
  // 8. Save analysis
  await prisma.aIAnalysis.create({
    data: {
      presentationId,
      transcript,
      deliveryMetrics,
      contentAnalysis,
      overallScore,
      creditsSpent: 0 // Free for MVP
    }
  });
  
  // 9. Update presentation status
  await prisma.presentation.update({
    where: { id: presentationId },
    data: { status: 'READY' }
  });
}
```

### `GET /api/analysis/[presentationId]`

**Purpose:** Get analysis results

**Request:**
- Headers: `Authorization: Bearer <JWT>`
- Params: `presentationId` (UUID)

**Response:**
```json
{
  "id": "uuid",
  "presentationId": "uuid",
  "transcript": "Welcome everyone...",
  "deliveryMetrics": {
    "pace_wpm": 142,
    "filler_word_count": 8,
    "filler_words_list": ["um (3x)", "uh (2x)", "like (3x)"],
    "avg_volume": -18,
    "pause_count": 5,
    "eye_contact_score": 72
  },
  "contentAnalysis": {
    "has_intro": true,
    "has_conclusion": true,
    "structure_score": 85,
    "clarity_feedback": "Most ideas are well-explained...",
    "persuasiveness_score": 72,
    "weak_transitions": ["Transition at 2:15 felt abrupt"],
    "improvement_suggestions": [
      "Add data at 1:45",
      "Make conclusion more actionable"
    ]
  },
  "overallScore": 78,
  "creditsSpent": 0,
  "createdAt": "2026-05-08T10:35:00Z"
}
```

**Implementation:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { presentationId: string } }
) {
  const userId = await getUserIdFromToken(request);
  
  // Verify ownership via presentation
  const presentation = await prisma.presentation.findUnique({
    where: { id: params.presentationId }
  });
  
  if (presentation.userId !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const analysis = await prisma.aIAnalysis.findUnique({
    where: { presentationId: params.presentationId }
  });
  
  if (!analysis) {
    return Response.json({ error: 'Analysis not found' }, { status: 404 });
  }
  
  return Response.json(analysis);
}
```

---

## AI Integration Details

### Deepgram Integration (Transcription)

**Setup:**
```typescript
// /lib/ai/transcription.ts
import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const { result } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-2',
      language: 'en',
      punctuate: true,
      diarize: false,
      utterances: true
    }
  );
  
  return result.results.channels[0].alternatives[0].transcript;
}
```

**Environment Variable:**
- `DEEPGRAM_API_KEY=your_api_key_here`

### Claude API Integration (Content Analysis)

**Setup:**
```typescript
// /lib/ai/content-analysis.ts (already exists, may need updates)
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function analyzeContent(
  transcript: string,
  context: { duration: number; type: string }
): Promise<ContentAnalysis> {
  const prompt = `You are analyzing a presentation transcript. Provide structured feedback on:

1. STRUCTURE (0-100):
   - Does it have a clear introduction, body, and conclusion?
   - Are main points organized logically?

2. CLARITY (0-100):
   - Are ideas well-explained?
   - Any confusing or unclear sections?

3. PERSUASIVENESS (0-100):
   - Are arguments effective?
   - Does it use examples and evidence?
   - Is the message compelling?

4. TRANSITIONS:
   - List any weak transitions between sections
   - Note where flow could improve

5. IMPROVEMENT SUGGESTIONS:
   - Provide 3-5 specific, actionable recommendations

TRANSCRIPT:
${transcript}

CONTEXT:
- Duration: ${context.duration} seconds
- Presentation type: ${context.type}

Provide your analysis in valid JSON format matching this structure:
{
  "has_intro": boolean,
  "has_conclusion": boolean,
  "structure_score": number,
  "clarity_feedback": string,
  "persuasiveness_score": number,
  "weak_transitions": string[],
  "improvement_suggestions": string[]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  const content = message.content[0].text;
  return JSON.parse(content);
}
```

**Environment Variable:**
- `ANTHROPIC_API_KEY=your_api_key_here`

### Delivery Metrics Calculation

**Implementation:**
```typescript
// /lib/ai/delivery-metrics.ts (already exists, may need updates)

interface DeliveryMetrics {
  pace_wpm: number;
  filler_word_count: number;
  filler_words_list: string[];
  avg_volume: number;
  pause_count: number;
  eye_contact_score: number;
}

export function calculateDeliveryMetrics(
  transcript: string,
  audioBuffer: Buffer,
  duration: number
): DeliveryMetrics {
  // Pace calculation
  const words = transcript.split(/\s+/).length;
  const minutes = duration / 60;
  const pace_wpm = Math.round(words / minutes);
  
  // Filler words detection
  const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically'];
  const fillerMatches: Record<string, number> = {};
  
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = transcript.match(regex);
    if (matches) {
      fillerMatches[filler] = matches.length;
    }
  });
  
  const filler_word_count = Object.values(fillerMatches).reduce((a, b) => a + b, 0);
  const filler_words_list = Object.entries(fillerMatches)
    .filter(([_, count]) => count > 0)
    .map(([word, count]) => `${word} (${count}x)`);
  
  // Volume analysis (simplified)
  const avg_volume = analyzeAudioVolume(audioBuffer);
  
  // Pause detection (simplified)
  const pause_count = detectPauses(audioBuffer);
  
  // Eye contact (placeholder for MVP, needs face detection)
  const eye_contact_score = 70; // Mock value
  
  return {
    pace_wpm,
    filler_word_count,
    filler_words_list,
    avg_volume,
    pause_count,
    eye_contact_score
  };
}

function analyzeAudioVolume(audioBuffer: Buffer): number {
  // Simplified: Use audio processing library
  // Return average dB level
  return -18; // Mock value
}

function detectPauses(audioBuffer: Buffer): number {
  // Simplified: Detect silence periods >2 seconds
  return 5; // Mock value
}
```

**Note:** Full audio analysis requires additional libraries:
- `fluent-ffmpeg` for audio extraction
- `node-wav` or similar for audio processing
- For MVP, can use simplified calculations or mock some values

---

## Mock Data Samples

### Sample User
```typescript
const mockUser: User = {
  id: "mock-user-1",
  email: "demo@example.com",
  name: "Demo User",
  creditBalance: 50,
  skillLevel: "BEGINNER",
  goals: ["job_interviews", "sales_pitches"]
};
```

### Sample Presentation
```typescript
const mockPresentation: Presentation = {
  id: "pres-1",
  userId: "mock-user-1",
  title: "Product Demo Practice",
  description: "Practicing my pitch for the upcoming sales meeting",
  type: "VIDEO_RECORDING",
  videoUrl: "blob:indexeddb://video-pres-1",
  duration: 185, // 3:05
  visibility: "PRIVATE",
  status: "ready",
  createdAt: "2026-05-08T10:30:00Z"
};
```

### Sample AI Analysis
```typescript
const mockAnalysis: AIAnalysis = {
  id: "analysis-1",
  presentationId: "pres-1",
  transcript: `Welcome everyone to today's presentation about our new product features. 
    Um, I'm excited to share what we've been working on. 
    First, let me show you the main dashboard improvements. 
    As you can see here, we've redesigned the interface to be more intuitive. 
    The key features include real-time analytics, um, improved search functionality, and better mobile support. 
    Now let's talk about the technical architecture. 
    We've moved to a microservices approach which gives us better scalability. 
    This means faster load times and, you know, better reliability overall. 
    In conclusion, these updates represent a significant improvement to our platform. 
    Thank you for your time, and I'm happy to answer any questions.`,
  
  deliveryMetrics: {
    pace_wpm: 142,
    filler_word_count: 8,
    filler_words_list: ["um (3x)", "uh (2x)", "you know (1x)", "like (2x)"],
    avg_volume: -18,
    pause_count: 5,
    eye_contact_score: 72
  },
  
  contentAnalysis: {
    has_intro: true,
    has_conclusion: true,
    structure_score: 85,
    clarity_feedback: "Your presentation has a clear structure with distinct sections. Most technical concepts are explained well, though some transitions could be smoother.",
    persuasiveness_score: 72,
    weak_transitions: [
      "Transition from feature overview to technical architecture felt abrupt (around 1:30)",
      "Could use a clearer segue when moving to the conclusion"
    ],
    improvement_suggestions: [
      "Reduce filler words, especially 'um' which appeared frequently in the opening and middle sections",
      "Add a brief transition phrase before diving into technical architecture (e.g., 'Now that you've seen the features, let me explain how we built this')",
      "Consider adding specific metrics or data points to support claims about 'better scalability' and 'faster load times'",
      "Make the conclusion more actionable - consider adding a clear call-to-action or next steps",
      "Practice maintaining consistent eye contact, especially during technical explanations"
    ]
  },
  
  overallScore: 78,
  creditsSpent: 0,
  createdAt: "2026-05-08T10:35:00Z"
};
```

### Sample Transcript with Timestamps
```typescript
const mockTranscriptWithTimestamps = `
[00:00] Welcome everyone to today's presentation about our new product features.
[00:05] Um, I'm excited to share what we've been working on.
[00:10] First, let me show you the main dashboard improvements.
[00:15] As you can see here, we've redesigned the interface to be more intuitive.
[00:22] The key features include real-time analytics, um, improved search functionality, and better mobile support.
[00:32] Now let's talk about the technical architecture.
[00:37] We've moved to a microservices approach which gives us better scalability.
[00:44] This means faster load times and, you know, better reliability overall.
[00:52] In conclusion, these updates represent a significant improvement to our platform.
[00:59] Thank you for your time, and I'm happy to answer any questions.
`;
```

---

## Error Handling

### Error Types and Responses

**1. Permission Errors (Camera/Microphone)**
```typescript
// User denied permissions
{
  type: 'PERMISSION_DENIED',
  message: 'Camera and microphone access is required to record presentations',
  action: 'Please allow access in your browser settings and try again',
  helpUrl: '/help/camera-permissions'
}
```

**UI Response:**
- Show error modal with clear message
- "Try Again" button to re-request permissions
- Link to help documentation with browser-specific instructions
- Option to "Upload Video Instead" (future feature)

**2. Recording Errors**
```typescript
// MediaRecorder API failed
{
  type: 'RECORDING_FAILED',
  message: 'Unable to record video',
  technicalDetails: error.message,
  action: 'Please refresh the page and try again'
}
```

**UI Response:**
- Show error notification
- Log technical details for debugging
- Suggest browser refresh
- Offer to contact support if issue persists

**3. Upload Errors**
```typescript
// Network failure during upload
{
  type: 'UPLOAD_FAILED',
  message: 'Upload failed due to network error',
  bytesUploaded: 5242880,
  totalBytes: 15728640,
  action: 'Retry upload',
  canResume: true
}
```

**UI Response:**
- Show error notification with progress info
- "Retry Upload" button (up to 3 automatic retries)
- Save video to IndexedDB as backup
- Option to "Save and Upload Later" (future feature)

**4. API Errors**
```typescript
// Backend returned error
{
  type: 'API_ERROR',
  statusCode: 500,
  message: 'Server error occurred',
  action: 'Please try again in a moment'
}
```

**UI Response:**
- Show toast notification for non-critical errors
- Full-page error for critical failures
- Retry button where appropriate
- Log errors for monitoring

**5. Analysis Errors**
```typescript
// AI processing failed
{
  type: 'ANALYSIS_FAILED',
  reason: 'TRANSCRIPTION_FAILED' | 'LLM_ERROR' | 'TIMEOUT',
  message: 'Unable to analyze presentation',
  action: 'Your video has been saved. Please try processing again.',
  creditsRefunded: 0
}
```

**UI Response:**
- Redirect from processing page to error state
- Show specific error message
- "Try Again" button to re-process
- Confirm credits refunded (when credit system active)
- Option to contact support

**6. Authentication Errors**
```typescript
// Invalid credentials
{
  type: 'AUTH_ERROR',
  message: 'Invalid email or password',
  action: 'Please check your credentials and try again'
}

// Session expired
{
  type: 'SESSION_EXPIRED',
  message: 'Your session has expired',
  action: 'Please log in again'
}
```

**UI Response:**
- Show inline error on login form
- For expired sessions: redirect to login with message
- Clear stored tokens
- Preserve redirect URL to return after login

### Error Boundary

**Global Error Boundary:**
```typescript
// /components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <p>We're sorry for the inconvenience.</p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## Responsive Design Guidelines

### Breakpoints
- **Mobile:** 0-639px (sm)
- **Tablet:** 640-1023px (md)
- **Desktop:** 1024px+ (lg)

### Layout Adaptations

**Landing Page:**
- Mobile: Stack sections vertically, full-width CTAs
- Desktop: Hero with side-by-side layout, 3-column features

**Auth Pages:**
- Mobile: Full-width forms, stack elements vertically
- Desktop: Split layout (left content, right form)

**Dashboard:**
- Mobile: Single column, stacked cards
- Tablet: 2-column grid for action cards
- Desktop: 3-column grid, table view for presentations

**Practice/Recording:**
- Mobile: Full-screen camera preview, stacked controls
- Desktop: Centered preview (max 720p), side-by-side buttons

**Results Page:**
- Mobile: Single column, stacked metrics
- Tablet: 2-column grid for metrics
- Desktop: 2-column layout, video on left, metrics on right

### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons (8px minimum)

### Typography
- Base font size: 16px (never smaller)
- Scale up headings appropriately
- Line height: 1.5 for body text

### Video Player
- Always maintain 16:9 aspect ratio
- Responsive width: 100% of container
- Max width: 1280px

---

## Timeline and Milestones

### Phase 1: Frontend with Mock Data (3-4 days)

**Day 1: Foundation (6-8 hours)**
- ✅ Set up shared UI components (Button, Input, Card, Badge, ProgressBar, Modal)
- ✅ Create auth context and localStorage utilities
- ✅ Build landing page
- ✅ Build signup page with validation
- ✅ Build login page
- ✅ Test auth flow end-to-end with mocks

**Day 2: Dashboard & Recording Setup (6-8 hours)**
- ✅ Build dashboard layout with navbar
- ✅ Update existing CreditBalance component
- ✅ Create PresentationCard component
- ✅ Build practice page (States 1-2: setup and recording)
- ✅ Test MediaRecorder API and camera permissions

**Day 3: Recording Complete & Processing (6-8 hours)**
- ✅ Finish practice page (States 3-4: preview and upload)
- ✅ Implement IndexedDB storage utilities
- ✅ Build processing page with manual trigger
- ✅ Wire up navigation: practice → processing → results
- ✅ Test complete recording flow

**Day 4: Results Page & Polish (6-8 hours)**
- ✅ Build results page layout
- ✅ Create DeliveryMetrics component
- ✅ Create ContentAnalysis component
- ✅ Implement VideoPlayer and TranscriptView
- ✅ Add comprehensive mock data
- ✅ End-to-end testing of entire flow
- ✅ Responsive design polish
- ✅ Fix bugs and edge cases

**Phase 1 Deliverable:** Fully functional UI with mock data, ready for demo

---

### Phase 2: API Integration (2-3 days)

**Day 5: Backend APIs (6-8 hours)**
- ✅ Build `GET /api/presentations` (list)
- ✅ Build `GET /api/presentations/[id]` (single)
- ✅ Build `GET /api/analysis/[id]` (get results)
- ✅ Build `POST /api/analysis/[id]/process` (trigger)
- ✅ Test all endpoints with Postman/Thunder Client
- ✅ Add error handling and validation

**Day 6: Frontend Integration (6-8 hours)**
- ✅ Replace localStorage with API calls
- ✅ Add React Query for data fetching
- ✅ Implement JWT token management
- ✅ Connect S3 upload flow (use existing endpoints)
- ✅ Test auth with real database
- ✅ Handle loading and error states

**Day 7: AI Processing & Testing (6-8 hours)**
- ✅ Integrate Deepgram for transcription
- ✅ Integrate Claude API for content analysis
- ✅ Implement delivery metrics calculation
- ✅ Test AI analysis with sample videos
- ✅ End-to-end testing with real data
- ✅ Performance optimization
- ✅ Bug fixes and polish

**Phase 2 Deliverable:** Fully functional MVP with real AI analysis

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All 7 pages are built and navigable
- ✅ Video recording works (camera, start/stop, preview, re-record)
- ✅ Video blob successfully saved to IndexedDB
- ✅ Mock presentation appears on dashboard with correct data
- ✅ Processing page displays and transitions to results
- ✅ Results page shows comprehensive mock AI analysis
- ✅ All components are responsive (mobile, tablet, desktop)
- ✅ User flow works end-to-end without backend APIs
- ✅ No critical UI bugs or visual issues

### Phase 2 Complete When:
- ✅ Real signup/login with database persistence
- ✅ Videos upload to S3 successfully with progress tracking
- ✅ AI analysis processes real videos (Deepgram + Claude)
- ✅ Real analysis data displays correctly on results page
- ✅ Credit balance updates correctly (no deductions for MVP)
- ✅ All error states handled gracefully
- ✅ Performance is acceptable:
  - Page load: <2s
  - Upload: Shows progress, completes successfully
  - AI analysis: 2-5 minutes average
- ✅ Works on Chrome and Firefox (Safari nice-to-have)

### MVP Ready for Alpha Testing When:
- ✅ Happy path works flawlessly:
  - Signup → Dashboard → Record → Upload → Process → View Results
- ✅ User can complete flow in under 10 minutes
- ✅ AI feedback is useful and actionable
- ✅ No critical bugs or blockers
- ✅ Basic error handling in place
- ✅ Responsive design works well
- ✅ Ready for 10-20 alpha users to test

---

## Post-MVP Enhancements

**Not in this phase, but next steps:**

1. **Automatic Processing**
   - Remove manual trigger button
   - Background job queue (BullMQ or Vercel Cron)
   - S3 event triggers for auto-processing

2. **File Upload**
   - Allow users to upload pre-recorded videos
   - Support multiple formats (mp4, mov, webm)
   - File size/duration validation

3. **Credit System Activation**
   - Enable credit deductions for full AI analysis
   - Implement credit earning through feedback
   - Add credit transaction history page

4. **Community Features**
   - Feedback request/give flow
   - Community queue
   - Rating and quality scoring

5. **Notifications**
   - Email notifications for completed analysis
   - Push notifications (web push API)
   - In-app notification center

6. **Analytics & Tracking**
   - User engagement metrics
   - AI analysis quality monitoring
   - Performance tracking

7. **Mobile App**
   - Wrap in Capacitor
   - iOS/Android builds
   - App store deployment

---

## Conclusion

This design provides a complete blueprint for building the MVP user flow of the public speaking platform. The frontend-first approach allows rapid iteration on UX while leveraging the existing backend infrastructure. After Phase 1, you'll have a fully functional demo to show users and gather feedback. Phase 2 brings it to life with real AI analysis.

**Key Success Factors:**
- Clear separation between Phase 1 (mock) and Phase 2 (real)
- Reusable component architecture for maintainability
- Comprehensive error handling for production readiness
- Responsive design for multi-device support
- Focus on core value: recording → AI feedback

**Next Steps After This Design:**
1. User reviews and approves this spec
2. Create detailed implementation plan (writing-plans skill)
3. Begin Phase 1 development
4. Alpha testing with real users
5. Iterate based on feedback
6. Build community features (next phase)
