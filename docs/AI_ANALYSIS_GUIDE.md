# AI Analysis Integration Guide

This guide explains how the AI analysis feature works in the Public Speaking Platform.

## Overview

The AI analysis system provides automated feedback on presentations using Claude AI. It evaluates:

- **Delivery Metrics** (rule-based):
  - Speaking pace (words per minute)
  - Filler word detection
  - Volume analysis (placeholder)
  - Pause detection (placeholder)
  - Eye contact scoring (placeholder)

- **Content Analysis** (AI-powered):
  - Structure quality (intro, body, conclusion)
  - Clarity of communication
  - Persuasiveness and engagement
  - Transition quality between sections
  - Specific improvement suggestions

## How It Works

### 1. Presentation Creation

When a user creates a presentation via `/practice`:

1. User uploads video or enters text script
2. Presentation record is created with `PROCESSING` status
3. AI analysis is triggered automatically in the background
4. User is redirected to presentation detail page

### 2. AI Analysis Process

The analysis happens in these steps:

```
┌─────────────────┐
│  Presentation   │
│    Created      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Get/Generate  │ ← For videos: would use Deepgram transcription
│   Transcript    │   For text: use script directly
└────────┬────────┘   For mock: generate sample transcript
         │
         ▼
┌─────────────────┐
│Calculate Metrics│ ← Pace, filler words (synchronous)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analyze with   │ ← Structure, clarity, persuasiveness (async)
│   Claude API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Calculate Overall│ ← Weighted combination of all metrics
│     Score       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deduct Credits  │ ← Based on transcript length and duration
│  Store Results  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Update Status to │
│      READY      │
└─────────────────┘
```

### 3. Viewing Results

On the presentation detail page (`/presentations/[id]`):

- **PROCESSING**: Shows loading animation
- **READY**: Displays full analysis results
  - Overall score (0-100)
  - Delivery metrics breakdown
  - Content analysis feedback
  - Full transcript
- **FAILED**: Shows error message with retry button

## API Endpoints

### Trigger Analysis

```http
POST /api/presentations/:id/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "transcript": "optional transcript text"
}
```

**Response (Success):**
```json
{
  "success": true,
  "analysis": {
    "id": "...",
    "presentationId": "...",
    "transcript": "...",
    "deliveryMetrics": { ... },
    "contentAnalysis": { ... },
    "overallScore": 78,
    "creditsSpent": 12
  },
  "creditsSpent": 12
}
```

**Response (Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "required": 12
}
```

## Mock Mode (No API Key)

For development without an Anthropic API key:

1. Set `ANTHROPIC_API_KEY=` (empty or unset) in `.env`
2. Analysis will use mock data:
   - Predefined scores (structure: 75, persuasiveness: 70)
   - Generic feedback messages
   - Mock improvement suggestions

This allows UI development and testing without API costs.

## Production Mode (With API Key)

1. Get API key from https://console.anthropic.com/
2. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY="sk-ant-..."
   ```
3. Real Claude analysis will be used

## Credit Costs

Analysis cost is calculated as:

```
Base Cost: 5 credits
+ Duration Cost: 1 credit per minute
+ Word Cost: 1 credit per 100 words
```

**Examples:**
- 2-minute, 300-word presentation: 5 + 2 + 3 = **10 credits**
- 5-minute, 750-word presentation: 5 + 5 + 8 = **18 credits**
- 10-minute, 1500-word presentation: 5 + 10 + 15 = **30 credits**

## Overall Score Calculation

The overall score (0-100) is a weighted average:

```
Overall = (
  Pace Score × 0.2 +
  Filler Score × 0.2 +
  Structure Score × 0.3 +
  Persuasiveness Score × 0.3
)
```

**Pace Score:**
- 100 points: 120-150 WPM (optimal)
- 80 points: 100-170 WPM (good)
- 60 points: 80-190 WPM (acceptable)
- 40 points: <80 or >190 WPM (needs work)

**Filler Score:**
- Starts at 100
- Deduct 2 points per filler word
- Max penalty: 30 points

**Structure & Persuasiveness:**
- Directly from Claude AI analysis (0-100)

## Manual Trigger

If automatic analysis fails or doesn't run:

1. Go to presentation detail page
2. Click "Analyze with AI" button
3. Wait for analysis to complete (usually 5-10 seconds)
4. Results appear automatically

## Error Handling

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `ANTHROPIC_API_KEY not configured` | API key missing | Add key to `.env` or use mock mode |
| `Insufficient credits` | Not enough credits | Earn more credits via feedback |
| `Presentation already analyzed` | Analysis already exists | View existing results |
| `Transcript cannot be empty` | No content to analyze | Check video upload or script |
| `Analysis failed` | API error | Retry analysis manually |

## Testing

### Without API Key (Mock Mode)

```bash
# 1. Ensure no API key
grep ANTHROPIC_API_KEY .env  # Should be commented out

# 2. Start dev server
npm run dev

# 3. Create presentation
# Visit http://localhost:3000/practice
# Upload or enter content
# Submit

# 4. Check results
# Should show mock analysis immediately
```

### With API Key (Real Analysis)

```bash
# 1. Add API key
echo 'ANTHROPIC_API_KEY="sk-ant-..."' >> .env

# 2. Start dev server
npm run dev

# 3. Create presentation
# Analysis will take 5-10 seconds

# 4. Verify results
# Should show real Claude analysis
```

## File Structure

```
src/lib/ai/
├── content-analysis.ts       # Claude API integration
├── delivery-metrics.ts        # Rule-based metrics
└── analyze-presentation.ts    # Main analysis orchestrator

src/app/api/presentations/[id]/
└── analyze/route.ts          # Analysis API endpoint

src/app/presentations/[id]/
└── page.tsx                  # Detail page with results
```

## Future Enhancements

1. **Video Transcription**: Integrate Deepgram for automatic speech-to-text
2. **Audio Analysis**: Extract volume, pauses, and tone from audio
3. **Video Analysis**: Detect eye contact, gestures, and body language
4. **Historical Tracking**: Show improvement over time
5. **Custom Goals**: Tailor feedback to user-specified goals
6. **Comparative Analysis**: Benchmark against similar presentations

## Troubleshooting

### Analysis Stuck on "Processing"

**Check logs:**
```bash
docker compose logs -f app
# or
npm run dev  # Check terminal output
```

**Common causes:**
- API rate limit exceeded
- Network timeout
- Invalid transcript format

**Solution:**
- Wait and retry
- Check API key validity
- Use manual trigger button

### Mock Data Not Appearing

**Verify configuration:**
```bash
node -e "console.log(process.env.ANTHROPIC_API_KEY || 'NOT SET')"
```

Should show "NOT SET" for mock mode.

### Credits Not Deducted

**Check transaction:**
```sql
SELECT * FROM credit_transactions 
WHERE user_id = '...' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Verify balance:**
```sql
SELECT credit_balance FROM users WHERE id = '...';
```

## Security Considerations

1. **API Key Protection**:
   - Never commit `.env` file
   - Use environment variables in production
   - Rotate keys regularly

2. **Rate Limiting**:
   - Consider implementing rate limits per user
   - Monitor API usage costs

3. **Input Validation**:
   - Transcript length limits (currently unlimited)
   - Sanitize user input before sending to AI

4. **Credit Fraud Prevention**:
   - Verify user owns presentation before analysis
   - Check credit balance before charging
   - Use database transactions for atomicity

---

## Support

For issues or questions:
- Check application logs
- Review this documentation
- Open an issue on GitHub
- Contact the development team
