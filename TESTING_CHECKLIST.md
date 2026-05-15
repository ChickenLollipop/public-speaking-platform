# Transcription Feature - Testing Checklist

## Setup Completed ✅
- [x] Database: Supabase PostgreSQL connected
- [x] Schema: All tables created
- [ ] Deepgram API Key: **PENDING**
- [ ] App running: **PENDING**

## Next Steps

### 1. Add Deepgram API Key to .env
```bash
DEEPGRAM_API_KEY="your-key-here"
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Test the Feature

**Create Account:**
- Go to http://localhost:3000
- Sign up with email/password
- You'll get 50 free credits

**Upload Video:**
- Go to Practice → New Presentation
- Title: "Test Transcription"
- Upload a short video (30-60 seconds with speech)
- Submit

**Test Transcription:**
- Click "Analyze with AI"
- Watch for progress indicators:
  - ✅ "Transcribing video..." appears
  - ✅ Progress spinner shows
  - ✅ "Analyzing content..." appears
  - ✅ Results display

**Verify Results:**
- [ ] Transcript section appears
- [ ] Word count is accurate
- [ ] Duration shows correctly (e.g., "2:15")
- [ ] Transcribed date displayed
- [ ] Transcript text is readable
- [ ] Credits deducted (check balance)

**Test Credit Caching:**
- Click "Analyze with AI" again on same video
- [ ] Should use cached transcript (no extra transcription cost)
- [ ] AI analysis runs again (charges analysis credits only)

## Test Video Sources

If you don't have a video, you can:
1. **Record yourself** speaking for 30 seconds (use phone/webcam)
2. **Use sample speech videos** from YouTube (download with youtube-dl)
3. **Create test video** with text-to-speech

## Expected Behavior

**Successful Flow:**
1. Upload video → Status: READY
2. Click "Analyze with AI" → Status: PROCESSING
3. Transcription starts → Progress: "Transcribing video..."
4. Transcription complete → Progress: "Analyzing..."
5. Analysis complete → Shows transcript + AI results
6. Credits deducted: ~1 credit/min for transcription + analysis cost

**Error Scenarios to Test:**
- [ ] Upload video with no audio → Error: "No audio track found"
- [ ] Insufficient credits → Error: "Insufficient credits for transcription"
- [ ] Invalid video format → Error: "Unsupported video format"

## Troubleshooting

**"DEEPGRAM_API_KEY is required"**
- Add key to .env
- Restart dev server

**"S3 is not configured"**
- This is OK for testing - videos stored locally in mock mode
- Or add AWS credentials if you have S3

**Build errors**
- Run: `npm run build`
- Check for TypeScript errors

**Database connection issues**
- Verify DATABASE_URL in .env
- Check Supabase database is running

## Current Status

✅ **Implementation Complete**
✅ **Database Connected**
⏳ **Waiting for Deepgram API Key**
⏳ **Ready to Start Dev Server**
