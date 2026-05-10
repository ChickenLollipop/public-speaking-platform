# Docker Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize the public speaking platform with Docker for both development and production environments.

**Architecture:** Multi-stage Dockerfile with three build stages (dependencies, builder, runner). Docker Compose orchestrates Next.js app + PostgreSQL main database + PostgreSQL test database. Hot-reload in dev via volume mounts, optimized production builds.

**Tech Stack:** Docker, Docker Compose, Node.js 20 Alpine, PostgreSQL 16 Alpine, Next.js 15

---

## File Structure

**New Files to Create:**
- `Dockerfile` - Multi-stage build for Next.js app (dev + prod stages)
- `docker-compose.yml` - Development environment configuration
- `docker-compose.prod.yml` - Production environment configuration
- `.dockerignore` - Files to exclude from Docker build context
- `src/app/api/health/route.ts` - Health check endpoint for Docker
- `.env.docker.example` - Example Docker environment variables

**Files to Modify:**
- `.env` - Update DATABASE_URL to use Docker service names
- `README.md` - Add Docker setup instructions
- `.gitignore` - Ensure .env.production is ignored

---

## Task 1: Create .dockerignore File

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create .dockerignore file**

```
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next
out

# Git
.git
.gitignore

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production

# IDE
.vscode
.idea
*.swp
*.swo
*~

# Documentation
docs
*.md
README.md

# Tests
coverage
.nyc_output

# Docker files
docker-compose*.yml
Dockerfile
.dockerignore

# OS files
.DS_Store
Thumbs.db

# Claude
.claude

# Misc
*.log
.vercel
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la .dockerignore`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore for Docker builds"
```

---

## Task 2: Create Health Check Endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Create health check route file**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
```

- [ ] **Step 2: Test health check endpoint locally (before Docker)**

Run: `npm run dev`
Then in another terminal: `curl http://localhost:3000/api/health`
Expected: Returns JSON with status "healthy" or "unhealthy"

- [ ] **Step 3: Stop dev server**

Press Ctrl+C to stop the dev server

- [ ] **Step 4: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add health check endpoint for Docker"
```

---

## Task 3: Create Multi-Stage Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create Dockerfile with all three stages**

```dockerfile
# Stage 1: Dependencies - Install all dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Stage 2: Builder - Build Next.js for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Stage 3: Runner - Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

Run: `docker build --dry-run -f Dockerfile .` (if supported) or just check file exists
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for Next.js app"
```

---

## Task 4: Update Next.js Config for Standalone Build

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Update next.config.js to enable standalone output**

Replace the entire contents with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'speaking-platform-videos.s3.amazonaws.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add next.config.js
git commit -m "chore: enable standalone output for Docker builds"
```

---

## Task 5: Create Development Docker Compose File

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml for development**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: dependencies
    container_name: speaking-platform-app-dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
      - ./public:/app/public
      - ./.env:/app/.env
      - ./package.json:/app/package.json
      - ./tsconfig.json:/app/tsconfig.json
      - ./next.config.js:/app/next.config.js
      - ./tailwind.config.js:/app/tailwind.config.js
      - ./postcss.config.js:/app/postcss.config.js
      - ./jest.config.js:/app/jest.config.js
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/speaking_platform_dev
      - DATABASE_URL_TEST=postgresql://postgres:postgres@db-test:5433/speaking_platform_test
    command: sh -c "npx prisma generate && npx prisma migrate deploy && npm run dev"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    container_name: speaking-platform-db-dev
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=speaking_platform_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  db-test:
    image: postgres:16-alpine
    container_name: speaking-platform-db-test
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=speaking_platform_test
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

- [ ] **Step 2: Verify YAML syntax**

Run: `docker-compose config` (or just check file was created)
Expected: Valid YAML, no errors

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Docker Compose configuration for development"
```

---

## Task 6: Create Production Docker Compose File

**Files:**
- Create: `docker-compose.prod.yml`

- [ ] **Step 1: Create docker-compose.prod.yml**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: speaking-platform-app-prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    command: sh -c "npx prisma migrate deploy && node server.js"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    restart: always

  db:
    image: postgres:16-alpine
    container_name: speaking-platform-db-prod
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-speaking_platform_prod}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

volumes:
  postgres_prod_data:
    driver: local
```

- [ ] **Step 2: Verify YAML syntax**

Run: `docker-compose -f docker-compose.prod.yml config` (or just check file exists)
Expected: Valid YAML, no errors

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: add Docker Compose configuration for production"
```

---

## Task 7: Update Environment Variables for Docker

**Files:**
- Modify: `.env`

- [ ] **Step 1: Update .env file with Docker-compatible DATABASE_URL**

Find the line with `DATABASE_URL` and replace it with:

```
DATABASE_URL="postgresql://postgres:postgres@db:5432/speaking_platform_dev"
```

Add a new line for test database:

```
DATABASE_URL_TEST="postgresql://postgres:postgres@db-test:5433/speaking_platform_test"
```

The complete .env file should look like:

```
DATABASE_URL="postgresql://postgres:postgres@db:5432/speaking_platform_dev"
DATABASE_URL_TEST="postgresql://postgres:postgres@db-test:5433/speaking_platform_test"
JWT_SECRET="dev-secret-key-at-least-32-characters-long"
```

- [ ] **Step 2: Commit**

```bash
git add .env
git commit -m "chore: update DATABASE_URL for Docker service names"
```

---

## Task 8: Create Example Production Environment File

**Files:**
- Create: `.env.production.example`

- [ ] **Step 1: Create .env.production.example**

```
NODE_ENV=production

# Database (use strong password in production)
DATABASE_URL="postgresql://produser:CHANGE_THIS_PASSWORD@db:5432/speaking_platform_prod"
POSTGRES_USER=produser
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=speaking_platform_prod

# Auth (use cryptographically random secret)
JWT_SECRET="CHANGE_THIS_TO_RANDOM_32_PLUS_CHARS"

# AWS S3 (add your production credentials)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your-bucket

# AI Services (add your production API keys)
# ANTHROPIC_API_KEY=sk-ant-your-key
# DEEPGRAM_API_KEY=your-key
```

- [ ] **Step 2: Commit**

```bash
git add .env.production.example
git commit -m "docs: add example production environment file"
```

---

## Task 9: Update .gitignore for Docker Files

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Check if .env.production is already in .gitignore**

Run: `grep "\.env\.production" .gitignore`
Expected: Should show .env.production is ignored (or not found)

- [ ] **Step 2: Add .env.production to .gitignore if not present**

If the grep command from Step 1 found nothing, add this line to .gitignore:

```
.env.production
```

Run: `echo ".env.production" >> .gitignore`

- [ ] **Step 3: Commit if changes were made**

```bash
git add .gitignore
git commit -m "chore: ensure .env.production is gitignored"
```

---

## Task 10: Test Development Environment

**Files:**
- None (testing only)

- [ ] **Step 1: Build development images**

Run: `docker-compose build`
Expected: Build completes successfully, images created

- [ ] **Step 2: Start development environment**

Run: `docker-compose up -d`
Expected: All three containers start (app, db, db-test)

- [ ] **Step 3: Check container status**

Run: `docker-compose ps`
Expected: All containers show "Up" status

- [ ] **Step 4: Check app logs for successful startup**

Run: `docker-compose logs app`
Expected: Should see "Ready on http://0.0.0.0:3000" or similar

- [ ] **Step 5: Test health check endpoint**

Run: `curl http://localhost:3000/api/health`
Expected: Returns JSON with status "healthy" and database "connected"

- [ ] **Step 6: Test hot-reload by modifying a file**

Edit `src/app/page.tsx` (change any text)
Run: `docker-compose logs -f app`
Expected: See "compiling..." message and page reloads

- [ ] **Step 7: Revert the test change**

Undo the change to `src/app/page.tsx`

- [ ] **Step 8: Run tests in container**

Run: `docker-compose exec app npm test`
Expected: Tests run and pass

- [ ] **Step 9: Stop development environment**

Run: `docker-compose down`
Expected: All containers stop

---

## Task 11: Test Production Build

**Files:**
- None (testing only)

- [ ] **Step 1: Create temporary .env.production file for testing**

Run: `cp .env.production.example .env.production`

Edit `.env.production` and set:
```
DATABASE_URL="postgresql://postgres:testpassword123@db:5432/speaking_platform_prod"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=testpassword123
POSTGRES_DB=speaking_platform_prod
JWT_SECRET="test-production-secret-at-least-32-characters-long"
```

- [ ] **Step 2: Build production images**

Run: `docker-compose -f docker-compose.prod.yml build`
Expected: Build completes, production image created

- [ ] **Step 3: Check image size**

Run: `docker images | grep speaking-platform`
Expected: Production image should be ~150-250MB

- [ ] **Step 4: Start production environment**

Run: `docker-compose -f docker-compose.prod.yml up -d`
Expected: Containers start successfully

- [ ] **Step 5: Wait for health check to pass**

Run: `docker-compose -f docker-compose.prod.yml ps`
Wait 40 seconds, then run again
Expected: app container shows "healthy" status

- [ ] **Step 6: Test health endpoint**

Run: `curl http://localhost:3000/api/health`
Expected: Returns healthy status

- [ ] **Step 7: Stop production environment**

Run: `docker-compose -f docker-compose.prod.yml down`

- [ ] **Step 8: Remove test .env.production file**

Run: `rm .env.production`
Expected: File deleted (we don't want to commit this)

---

## Task 12: Create Docker Documentation

**Files:**
- Create: `docs/DOCKER.md`

- [ ] **Step 1: Create Docker documentation file**

```markdown
# Docker Setup Guide

This document explains how to run the Public Speaking Platform using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

## Quick Start (Development)

1. Clone the repository:
   \`\`\`bash
   git clone <repo-url>
   cd public-speaking-platform
   \`\`\`

2. Start the development environment:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. Access the application:
   - App: http://localhost:3000
   - Database: localhost:5432 (postgres/postgres)
   - Test DB: localhost:5433 (postgres/postgres)

4. View logs:
   \`\`\`bash
   docker-compose logs -f app
   \`\`\`

## Development Commands

### Starting/Stopping

\`\`\`bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
\`\`\`

### Viewing Logs

\`\`\`bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
\`\`\`

### Running Commands

\`\`\`bash
# Run tests
docker-compose exec app npm test

# Prisma commands
docker-compose exec app npx prisma migrate dev
docker-compose exec app npx prisma studio

# Shell access
docker-compose exec app sh
\`\`\`

### Database Access

\`\`\`bash
# Connect to dev database
docker-compose exec db psql -U postgres -d speaking_platform_dev

# Connect to test database
docker-compose exec db-test psql -U postgres -d speaking_platform_test
\`\`\`

## Production Deployment

### Setup

1. Create production environment file:
   \`\`\`bash
   cp .env.production.example .env.production
   \`\`\`

2. Edit \`.env.production\` with your production credentials:
   - Strong database password
   - Random JWT secret (32+ characters)
   - AWS credentials (if using S3)
   - AI API keys (if using AI features)

3. Build production images:
   \`\`\`bash
   docker-compose -f docker-compose.prod.yml build
   \`\`\`

### Running Production

\`\`\`bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production
docker-compose -f docker-compose.prod.yml down
\`\`\`

### Production Updates

\`\`\`bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Verify health
curl http://localhost:3000/api/health
\`\`\`

## Troubleshooting

### Port Already in Use

\`\`\`bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Change port in docker-compose.yml or kill the process
\`\`\`

### Database Connection Issues

1. Check if database container is running:
   \`\`\`bash
   docker-compose ps db
   \`\`\`

2. Check database logs:
   \`\`\`bash
   docker-compose logs db
   \`\`\`

3. Verify DATABASE_URL uses \`db\` as hostname (not \`localhost\`)

### Container Keeps Restarting

\`\`\`bash
# View error logs
docker-compose logs app

# Run without restart to see error
docker-compose run --rm app npm run dev
\`\`\`

### Out of Disk Space

\`\`\`bash
# Remove unused images and volumes
docker system prune -a --volumes
\`\`\`

### Hot-Reload Not Working

1. Restart app container:
   \`\`\`bash
   docker-compose restart app
   \`\`\`

2. Check if file changes are visible in container:
   \`\`\`bash
   docker-compose exec app ls -la /app/src
   \`\`\`

## Architecture

### Development

- **app**: Next.js dev server with hot-reload
- **db**: PostgreSQL 16 (persistent volume)
- **db-test**: PostgreSQL 16 (ephemeral, for tests)

### Production

- **app**: Optimized Next.js build (~150-200MB)
- **db**: PostgreSQL 16 (persistent volume, internal only)

## Health Checks

The application includes a health check endpoint at \`/api/health\`:

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

Returns:
- \`200\`: Healthy (database connected)
- \`503\`: Unhealthy (database disconnected)

## Backup and Restore

### Backup

\`\`\`bash
# Development database
docker-compose exec db pg_dump -U postgres speaking_platform_dev > backup.sql

# Production database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres speaking_platform_prod > backup.sql
\`\`\`

### Restore

\`\`\`bash
# Development database
docker-compose exec -T db psql -U postgres speaking_platform_dev < backup.sql

# Production database
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres speaking_platform_prod < backup.sql
\`\`\`

## Environment Variables

### Development (.env)

\`\`\`env
DATABASE_URL="postgresql://postgres:postgres@db:5432/speaking_platform_dev"
DATABASE_URL_TEST="postgresql://postgres:postgres@db-test:5433/speaking_platform_test"
JWT_SECRET="dev-secret-key-at-least-32-characters-long"
\`\`\`

### Production (.env.production)

See \`.env.production.example\` for required variables. Never commit \`.env.production\` to git.

## Performance

### Image Sizes

- Development: ~1.2 GB (includes all dev dependencies)
- Production: ~150-200 MB (optimized, production only)

### Resource Usage

Production containers have resource limits:
- Memory: 512MB-1GB
- CPU: 0.5-1.0 cores

Adjust in \`docker-compose.prod.yml\` based on your needs.

## Security

### Development

- Database ports exposed for debugging
- Default credentials (postgres/postgres)
- Suitable for local development only

### Production

- Database not exposed to host network
- Strong credentials required
- Health checks enabled
- Resource limits enforced
- Non-root user in container

## Further Reading

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
```

- [ ] **Step 2: Commit documentation**

```bash
git add docs/DOCKER.md
git commit -m "docs: add comprehensive Docker setup guide"
```

---

## Task 13: Update Main README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Docker section to README.md**

Add the following section after the existing setup instructions (or create README.md if it doesn't exist):

```markdown
## Docker Setup

### Quick Start with Docker

1. Start the development environment:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

2. Access the application at http://localhost:3000

3. View logs:
   \`\`\`bash
   docker-compose logs -f app
   \`\`\`

For detailed Docker instructions, see [docs/DOCKER.md](docs/DOCKER.md).

### Common Docker Commands

\`\`\`bash
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
\`\`\`

## Local Development (without Docker)

If you prefer to run without Docker, you'll need:
- Node.js 20+
- PostgreSQL 16

Then follow the standard npm setup:
\`\`\`bash
npm install
npm run dev
\`\`\`
```

- [ ] **Step 2: Commit README update**

```bash
git add README.md
git commit -m "docs: add Docker setup section to README"
```

---

## Task 14: Final Verification and Cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Ensure all containers are stopped**

Run: `docker-compose down`
Run: `docker-compose -f docker-compose.prod.yml down`
Expected: All containers stopped and removed

- [ ] **Step 2: Verify no .env.production file exists**

Run: `ls -la .env.production`
Expected: File does not exist (or error "No such file")

- [ ] **Step 3: Run full development test**

Run: `docker-compose up -d && sleep 30 && curl http://localhost:3000/api/health && docker-compose down`
Expected: Health check returns healthy status

- [ ] **Step 4: Check git status**

Run: `git status`
Expected: All files committed, working directory clean (except .env if modified)

- [ ] **Step 5: Create final commit if needed**

If there are any uncommitted files:
```bash
git add .
git commit -m "chore: finalize Docker setup"
```

- [ ] **Step 6: Push to remote**

```bash
git push origin master
```

---

## Completion Checklist

After completing all tasks, verify:

- [ ] `.dockerignore` file exists and excludes appropriate files
- [ ] `Dockerfile` exists with three stages (dependencies, builder, runner)
- [ ] `docker-compose.yml` exists for development
- [ ] `docker-compose.prod.yml` exists for production
- [ ] Health check endpoint at `/api/health` works
- [ ] `.env` file updated with Docker service names
- [ ] `.env.production.example` exists (but not `.env.production`)
- [ ] `docs/DOCKER.md` contains comprehensive documentation
- [ ] `README.md` updated with Docker instructions
- [ ] Development environment starts successfully with `docker-compose up`
- [ ] Production build completes successfully
- [ ] Hot-reload works in development
- [ ] Tests run successfully in container
- [ ] All changes committed to git

---

## Self-Review

**Spec Coverage Check:**

✅ Multi-stage Dockerfile - Task 3 (all three stages defined)
✅ Development docker-compose - Task 5
✅ Production docker-compose - Task 6
✅ .dockerignore - Task 1
✅ Health checks - Task 2 (endpoint) + Task 6 (Docker config)
✅ Volume mounts for hot-reload - Task 5
✅ Database migrations on startup - Task 5, Task 6 (command includes migrate)
✅ Test database - Task 5 (db-test service)
✅ Non-root user - Task 3 (runner stage creates nextjs user)
✅ Environment variables - Task 7, Task 8
✅ Resource limits - Task 6 (deploy.resources)
✅ Security (internal db, no exposed ports in prod) - Task 6
✅ Documentation - Task 12, Task 13
✅ Testing - Task 10, Task 11

**Placeholder Check:**
- No TBDs, TODOs, or "implement later" found
- All code blocks complete
- All file paths specified
- All commands include expected output

**Type Consistency Check:**
- Service names consistent: `app`, `db`, `db-test`
- Port numbers consistent: 3000, 5432, 5433
- Environment variables consistent across all files
- Database names consistent: `speaking_platform_dev`, `speaking_platform_test`, `speaking_platform_prod`

No issues found. Plan is complete.
