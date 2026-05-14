# Public Speaking Platform

## Docker Setup

### Quick Start with Docker

1. Start the development environment:
   ```bash
   docker-compose up -d
   ```

2. Access the application at http://localhost:3000

3. View logs:
   ```bash
   docker-compose logs -f app
   ```

For detailed Docker instructions, see [docs/DOCKER.md](docs/DOCKER.md).

### Common Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Run tests
docker-compose exec app npm test

# Run Prisma migrations
docker-compose exec app npx prisma migrate dev

# Shell access
docker-compose exec app sh
```

## Local Development (without Docker)

If you prefer to run without Docker, you'll need:
- Node.js 20+
- PostgreSQL 16

Then follow the standard npm setup:
```bash
npm install
npm run dev
```

## Video Transcription Setup

The platform uses Deepgram for automatic speech-to-text transcription.

### Get API Key

1. Sign up at https://deepgram.com/
2. Get $200 free credits (no credit card required)
3. Navigate to API Keys in console
4. Create new API key
5. Copy to `.env` file

### Configure

```bash
# Add to .env
DEEPGRAM_API_KEY="your-key-here"
```

### Test

1. Start the application: `npm run dev`
2. Upload a video at http://localhost:3000/practice
3. Click "Analyze with AI" on the presentation detail page
4. Watch as the system:
   - Transcribes the video audio
   - Analyzes the content with AI
   - Displays results and transcript

### Troubleshooting

**"DEEPGRAM_API_KEY is required" error:**
- Make sure you added the API key to `.env`
- Restart the dev server after adding the key

**"Insufficient credits for transcription":**
- Transcription costs 1 credit per minute of video
- Upload shorter videos or earn more credits

**"Transcription failed" error:**
- Check video has audio track
- Verify video format is MP4, MOV, or WebM
- Check Deepgram account has credits
- View server logs for detailed error message
