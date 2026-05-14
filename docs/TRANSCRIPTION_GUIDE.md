# Video Transcription Guide

This guide explains how video transcription works in the Public Speaking Platform.

## Overview

When you upload a video and click "Analyze with AI", the system automatically transcribes the audio using Deepgram's speech-to-text API. This transcript is then fed into Claude AI for content analysis.

## How It Works

### Step 1: Upload Video
- Go to `/practice` and create a new presentation
- Upload your video (MP4, MOV, or WebM)
- Video is stored in S3

### Step 2: Transcription
- Click "Analyze with AI" on the presentation detail page
- System checks if transcript already exists
- If not, video is transcribed via Deepgram API
- Transcription typically takes 30-60 seconds for a 5-minute video
- Progress indicator shows "Transcribing video..."

### Step 3: AI Analysis
- Once transcript is ready, AI analysis begins
- Claude analyzes structure, clarity, persuasiveness
- Delivery metrics calculated (pace, filler words)
- Overall score computed

### Step 4: View Results
- Transcript appears in its own section
- AI analysis results displayed
- Both are saved for future reference

## Credit Costs

### Transcription
- **Cost:** 1 credit per minute (rounded up)
- **Minimum:** 1 credit
- **Examples:**
  - 30-second video → 1 credit
  - 5-minute video → 5 credits
  - 12.5-minute video → 13 credits

### Analysis
- **Base cost:** 5 credits
- **Duration cost:** +1 credit per minute
- **Word cost:** +1 credit per 100 words

### Total Example
For a 5-minute video (~750 words):
- Transcription: 5 credits
- Analysis: 5 + 5 + 8 = 18 credits
- **Total: 23 credits**

## Reusing Transcripts

Once a video is transcribed, the transcript is saved in the database. If you:
- Re-analyze the same presentation
- View the presentation again

The system uses the existing transcript at **no additional cost**.

## Supported Formats

### Video Formats
- ✅ MP4 (H.264 video, AAC audio)
- ✅ MOV (QuickTime)
- ✅ WebM

### Audio Requirements
- Video must contain an audio track
- Clear speech works best
- Background noise may reduce accuracy
- Multiple speakers are supported (mixed together)

### File Size Limits
- Maximum: 500 MB per video
- Minimum: 1 KB (sanity check)
- Recommended: Under 100 MB for faster processing

## Transcription Quality

### Accuracy
- Deepgram's Nova-2 model averages 90-95% accuracy
- Better audio quality = better transcription
- Confidence score is saved with transcript

### Tips for Better Transcripts
1. **Clear audio** - Reduce background noise
2. **Good microphone** - Better input = better output
3. **Speak clearly** - Avoid mumbling
4. **Moderate pace** - Not too fast or slow
5. **Standard English** - Model trained on English

### What's Included
- Automatic punctuation
- Capitalization
- Smart formatting (numbers, dates)
- Word-level timestamps (saved but not displayed yet)

## Troubleshooting

### "DEEPGRAM_API_KEY is required"
**Cause:** API key not configured
**Solution:** Add `DEEPGRAM_API_KEY` to `.env` file and restart server

### "Insufficient credits for transcription"
**Cause:** Not enough credits for video length
**Solution:** 
- Upload a shorter video, or
- Earn more credits (future: giving feedback)

### "Video not uploaded"
**Cause:** Presentation has no video file
**Solution:** Upload a video first at `/practice`

### "Transcription failed: Unsupported video format"
**Cause:** Video format not supported by Deepgram
**Solution:** Convert video to MP4, MOV, or WebM

### "Transcription failed after 3 attempts"
**Cause:** Network issues or Deepgram service problems
**Solution:** 
- Check internet connection
- Wait a few minutes and try again
- Contact support if persists

### "No audio track found in video"
**Cause:** Video file has no audio stream
**Solution:** Re-record video with audio or add voiceover

## Privacy & Security

### Video Access
- Videos are stored in your private S3 bucket
- Server proxies video to Deepgram (Deepgram never gets S3 credentials)
- No presigned URLs shared with third parties

### Transcript Storage
- Transcripts stored in your database
- Full control over data
- Delete presentation = delete transcript

### Deepgram Policy
- Deepgram does not store audio after processing
- SOC 2 Type II certified
- GDPR compliant

## API Reference

### Transcription Endpoint

**Endpoint:** Automatic via `/api/presentations/:id/analyze`

**Flow:**
1. POST to `/api/presentations/:id/analyze`
2. System checks if `presentation.transcript` exists
3. If not, transcribes video automatically
4. Returns analysis results including transcript

**Response includes:**
```json
{
  "success": true,
  "analysis": {
    "transcript": "...",
    "deliveryMetrics": {...},
    "contentAnalysis": {...},
    "overallScore": 85
  },
  "creditsSpent": 18
}
```

### Checking Transcript Status

**Endpoint:** GET `/api/presentations/:id`

**Check for transcript:**
```json
{
  "presentation": {
    "id": "...",
    "transcript": "text here" | null,
    "transcribedAt": "2026-05-14T10:30:00Z" | null
  }
}
```

## Future Enhancements

**Not yet implemented:**
- Real-time transcription during upload
- Speaker diarization (who said what)
- Transcript editing
- Custom vocabulary
- Multi-language support
- Word highlighting as video plays
- Export transcript (PDF, SRT, VTT)

## Support

For issues or questions:
- Check server logs: `docker compose logs -f app`
- Review this guide
- Check Deepgram status: https://status.deepgram.com/
- Open an issue on GitHub
