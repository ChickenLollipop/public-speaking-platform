# Feedback Pages Design Spec

**Date:** 2026-05-08
**Status:** Approved
**Scope:** Give Feedback browse page, feedback submission form, confirmation page

---

## Overview

Two-page flow for the community feedback feature. Users browse open feedback requests, claim one, watch the presentation and submit rated written feedback, then see a confirmation with credits earned.

---

## Pages

### 1. Browse Page — `/feedback/give`

Lists pending feedback requests that the current user has not created and has not already claimed.

**Filter bar (client state, triggers re-fetch):**
- Length: All / Short (<5 min) / Medium (5–10 min) / Long (10+ min)
- Sort: Most Credits / Newest

**Request card (2-col grid on desktop, 1-col on mobile):**
- Presentation title
- Duration formatted as "X min"
- Credits offered (highlighted)
- Requester name + skill level
- "Claim & Give Feedback" button

**Claiming:**
- Button calls `POST /api/feedback-requests/[id]/claim`
- On success: navigate to `/feedback/give/[requestId]`
- On failure (already claimed): show inline error on card, refresh list

**Edge states:**
- Empty list: "No feedback requests right now — check back later"
- User balance = 0: warning banner at top, claim buttons disabled

---

### 2. Submission Page — `/feedback/give/[requestId]`

Two-column layout. User watches the presentation and submits feedback.

**Left column (60%):**
- Native `<video>` player with signed S3 URL
- Presentation title, description, requester skill level + goals

**Right column (40%, sticky):**
- Three star rating rows: Delivery, Content, Overall (1–5 stars)
- Written feedback textarea with live word counter (minimum 50 words)
- "Add timestamp comment" button — captures current video time, opens inline input. Each comment shows time + text with a remove button. Multiple comments supported.
- Credits preview near submit button: "You'll earn X credits" (base amount from video length, per `calculateFeedbackEarnings` with `recipientRating: null`)
- Submit button disabled until: all 3 ratings set AND written feedback ≥ 50 words

**On submit:**
- Calls `POST /api/feedback-requests/[id]/submit`
- On success: navigate to `/feedback/give/[requestId]/confirmation?credits=X`

**Back link:** "← Give Feedback" → `/feedback/give`

---

### 3. Confirmation Page — `/feedback/give/[requestId]/confirmation`

Centered card. Credits earned passed via `?credits=X` query param.

**Content:**
- "Feedback submitted!" heading
- "You earned **X credits**" (prominent)
- Note: "Your final credits may increase up to 2x if the recipient rates your feedback highly"
- Summary: three star ratings + first 100 chars of written feedback
- Actions: "Give More Feedback" (→ `/feedback/give`) | "Go to Dashboard" (→ `/dashboard`)

---

## API Routes

### `GET /api/feedback-requests`

Returns pending requests, excluding those created by or claimed by the current user.

**Query params:**
- `length`: `short` | `medium` | `long` (optional)
  - `short` = duration < 300s
  - `medium` = 300s–600s
  - `long` = 600s+
- `sort`: `credits_desc` (default) | `newest`

**Response:**
```json
{
  "feedbackRequests": [
    {
      "id": "...",
      "creditsOffered": 8,
      "presentation": {
        "title": "...",
        "duration": 720,
        "description": "...",
        "user": { "name": "...", "skillLevel": "INTERMEDIATE" }
      }
    }
  ]
}
```

---

### `POST /api/feedback-requests/[id]/claim`

Locks the request to the current user. Fails if already claimed.

**Response:**
```json
{
  "feedbackRequest": {
    "id": "...",
    "presentation": {
      "title": "...",
      "duration": 720,
      "videoUrl": "...",
      "description": "...",
      "user": { "name": "...", "skillLevel": "INTERMEDIATE", "goals": [] }
    }
  }
}
```

---

### `POST /api/feedback-requests/[id]/submit`

Submits feedback. Awards base credits immediately (quality multiplier applied later when recipient rates).

**Request body:**
```json
{
  "deliveryRating": 4,
  "contentRating": 5,
  "overallRating": 4,
  "writtenFeedback": "...",
  "timestampComments": [{ "time": 30, "comment": "Good opening" }]
}
```

**Response:**
```json
{
  "feedback": { "id": "..." },
  "creditsEarned": 5
}
```

**Credit logic:** Uses `calculateFeedbackEarnings(duration, wordCount, null)` — base credits only. Calls `createCreditTransaction` with `FEEDBACK_GIVEN` type.

---

## Data Model Notes

No schema changes needed. Uses existing `FeedbackRequest`, `Feedback`, and `CreditTransaction` models.

`videoUrl` on `Presentation` stores the S3 key. The submit API generates a fresh signed URL for the video player using the S3 key.

---

## Validation

- `writtenFeedback`: minimum 50 **words** (per design doc anti-gaming rules). Note: the existing `submitFeedbackSchema` currently enforces 50 characters — this needs to be corrected to 50 words during implementation.
- All three ratings: 1–5 integer
- Timestamp comments: optional, each requires `time` (int ≥ 0) and `comment` (non-empty string)

---

## Out of Scope

- Recipient rating flow (bonus credits multiplier)
- Feedback request expiry job (48h auto-refund)
- Anti-gaming enforcement (>3 feedbacks/week to same person)
