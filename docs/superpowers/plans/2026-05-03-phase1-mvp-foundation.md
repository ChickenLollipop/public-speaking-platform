# Phase 1 MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational MVP for public speaking practice platform with authentication, video upload/storage, AI analysis, credit system, and community feedback.

**Architecture:** Next.js 15 monolithic web app with App Router, PostgreSQL via Prisma ORM, AWS S3 for video storage, Deepgram for transcription, Claude API for content analysis. JWT authentication, TDD throughout.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, TailwindCSS, Zod, bcrypt, jose (JWT), AWS SDK v3, Deepgram SDK, Anthropic SDK, Jest, React Testing Library

---

## Phase 1 Scope

**Included:**
- User authentication (signup/login with JWT)
- Video recording in browser + file upload
- AWS S3 storage with signed URLs
- AI analysis: transcription + delivery metrics + content analysis
- Credit system (earn by giving feedback, spend on AI/feedback)
- Community feedback requests (create, claim, submit)
- Basic UI (landing, dashboard, practice, view feedback)

**Excluded (Post-MVP):**
- Partner matching
- OAuth
- Native mobile apps
- Text script analysis

---

## Task 1: Project Setup & Configuration

**Files:**
- Modify: `package.json` (dependencies already listed, verify)
- Create: `.env.example`
- Create: `.env.local`
- Create: `next.config.js`
- Create: `tailwind.config.js`
- Create: `jest.config.js`
- Create: `postcss.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Verify package.json dependencies**

Read `package.json` and verify all required dependencies are present:
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "jose": "^5.0.0",
    "zod": "^3.22.0",
    "@tanstack/react-query": "^5.0.0",
    "aws-sdk": "^2.1500.0",
    "@deepgram/sdk": "^3.0.0",
    "@anthropic-ai/sdk": "^0.20.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "@types/bcrypt": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "prisma": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

If any are missing, add them.

- [ ] **Step 2: Create .env.example**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/speaking_platform_dev"

# JWT
JWT_SECRET="your-secret-key-min-32-chars"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="speaking-platform-videos"
S3_BUCKET_REGION="us-east-1"

# Deepgram
DEEPGRAM_API_KEY="your-deepgram-key"

# Anthropic (Claude)
ANTHROPIC_API_KEY="your-anthropic-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 3: Create .env.local**

Copy `.env.example` to `.env.local` with placeholder values for now:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/speaking_platform_dev"
JWT_SECRET="dev-secret-please-change-in-production-min-32-characters"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="placeholder"
AWS_SECRET_ACCESS_KEY="placeholder"
S3_BUCKET_NAME="speaking-platform-dev"
S3_BUCKET_REGION="us-east-1"
DEEPGRAM_API_KEY="placeholder"
ANTHROPIC_API_KEY="placeholder"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 4: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['speaking-platform-dev.s3.amazonaws.com'],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 5: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 6: Create postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create jest.config.js**

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};

module.exports = createJestConfig(customJestConfig);
```

- [ ] **Step 8: Create jest.setup.js**

```javascript
import '@testing-library/jest-dom';
```

- [ ] **Step 9: Create .gitignore**

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/
dist/

# Env
.env.local
.env.*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Prisma
prisma/migrations/
```

- [ ] **Step 10: Create src directory structure**

```bash
mkdir -p src/app/api/auth/{signup,login,me}
mkdir -p src/app/api/presentations/[id]/{upload-url}
mkdir -p src/app/api/analysis/[presentationId]
mkdir -p src/app/api/feedback-requests/[id]/{claim,submit}
mkdir -p src/app/api/credits/transactions
mkdir -p src/app/{dashboard,practice,presentations/[id],feedback/{give,[requestId]},credits}
mkdir -p src/lib/{auth,s3,ai,credits,validation}
mkdir -p src/components/ui
mkdir -p src/types
mkdir -p tests/{lib/{auth,credits,ai},api/auth}
mkdir -p prisma
```

- [ ] **Step 11: Commit**

```bash
git add .env.example next.config.js tailwind.config.js jest.config.js jest.setup.js postcss.config.js .gitignore
git commit -m "chore: initial project configuration"
```

---

## Task 2: Database Schema (Prisma)

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Create Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                      String   @id @default(uuid())
  email                   String   @unique
  passwordHash            String   @map("password_hash")
  name                    String
  avatar                  String?
  creditBalance           Int      @default(50) @map("credit_balance")
  skillLevel              SkillLevel @default(BEGINNER) @map("skill_level")
  goals                   String[] @default([])
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")

  presentations           Presentation[]
  feedbackRequestsCreated FeedbackRequest[] @relation("FeedbackRequester")
  feedbackRequestsClaimed FeedbackRequest[] @relation("FeedbackClaimer")
  feedbackGiven           Feedback[]
  creditTransactions      CreditTransaction[]

  @@map("users")
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

model Presentation {
  id          String            @id @default(uuid())
  userId      String            @map("user_id")
  title       String
  description String?
  type        PresentationType
  videoUrl    String?           @map("video_url")
  scriptText  String?           @map("script_text")
  duration    Int?              // seconds
  visibility  Visibility        @default(PRIVATE)
  status      ProcessingStatus  @default(PROCESSING)
  createdAt   DateTime          @default(now()) @map("created_at")

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiAnalysis      AIAnalysis?
  feedbackRequest FeedbackRequest?

  @@index([userId])
  @@index([status])
  @@map("presentations")
}

enum PresentationType {
  VIDEO_RECORDING
  VIDEO_UPLOAD
  TEXT_SCRIPT
  OUTLINE
}

enum Visibility {
  PRIVATE
  COMMUNITY_SHARED
  PARTNER_ONLY
}

enum ProcessingStatus {
  PROCESSING
  READY
  FAILED
}

model AIAnalysis {
  id                   String   @id @default(uuid())
  presentationId       String   @unique @map("presentation_id")
  transcript           String   @db.Text
  deliveryMetrics      Json     @map("delivery_metrics")
  contentAnalysis      Json?    @map("content_analysis")
  overallScore         Int      @map("overall_score")
  creditsSpent         Int      @map("credits_spent")
  createdAt            DateTime @default(now()) @map("created_at")

  presentation Presentation @relation(fields: [presentationId], references: [id], onDelete: Cascade)

  @@map("ai_analyses")
}

model FeedbackRequest {
  id              String               @id @default(uuid())
  presentationId  String               @unique @map("presentation_id")
  requesterId     String               @map("requester_id")
  type            FeedbackRequestType
  creditsOffered  Int                  @map("credits_offered")
  status          FeedbackRequestStatus @default(PENDING)
  claimedBy       String?              @map("claimed_by")
  claimedAt       DateTime?            @map("claimed_at")
  expiresAt       DateTime             @map("expires_at")
  createdAt       DateTime             @default(now()) @map("created_at")

  presentation Presentation @relation(fields: [presentationId], references: [id], onDelete: Cascade)
  requester    User         @relation("FeedbackRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  claimer      User?        @relation("FeedbackClaimer", fields: [claimedBy], references: [id])
  feedback     Feedback?

  @@index([status])
  @@index([expiresAt])
  @@map("feedback_requests")
}

enum FeedbackRequestType {
  COMMUNITY_FEEDBACK
  PARTNER_SESSION
}

enum FeedbackRequestStatus {
  PENDING
  CLAIMED
  COMPLETED
  EXPIRED
}

model Feedback {
  id                    String   @id @default(uuid())
  feedbackRequestId     String   @unique @map("feedback_request_id")
  reviewerId            String   @map("reviewer_id")
  deliveryRating        Int      @map("delivery_rating")
  contentRating         Int      @map("content_rating")
  overallRating         Int      @map("overall_rating")
  writtenFeedback       String   @map("written_feedback") @db.Text
  timestampComments     Json     @default("[]") @map("timestamp_comments")
  feedbackQualityScore  Float    @map("feedback_quality_score")
  creditsEarned         Int      @map("credits_earned")
  recipientRating       Int?     @map("recipient_rating")
  createdAt             DateTime @default(now()) @map("created_at")

  feedbackRequest FeedbackRequest @relation(fields: [feedbackRequestId], references: [id], onDelete: Cascade)
  reviewer        User            @relation(fields: [reviewerId], references: [id], onDelete: Cascade)

  @@index([reviewerId])
  @@map("feedback")
}

model CreditTransaction {
  id           String                  @id @default(uuid())
  userId       String                  @map("user_id")
  amount       Int
  type         CreditTransactionType
  relatedId    String?                 @map("related_id")
  balanceAfter Int                     @map("balance_after")
  createdAt    DateTime                @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  INITIAL_BONUS
  FEEDBACK_GIVEN
  FEEDBACK_RECEIVED
  AI_ANALYSIS
  PARTNER_SESSION
  REFUND
}
```

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`

Expected: Prisma client generated successfully

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add database schema with Prisma"
```

---

## Task 3: Database Client & Test Setup

**Files:**
- Create: `src/lib/db.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Write database client singleton test**

```typescript
// tests/lib/db.test.ts
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';

describe('Database client', () => {
  it('should export a PrismaClient instance', () => {
    expect(db).toBeInstanceOf(PrismaClient);
  });

  it('should reuse the same instance', () => {
    const db2 = require('@/lib/db').db;
    expect(db).toBe(db2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/db.test.ts`

Expected: FAIL - Cannot find module '@/lib/db'

- [ ] **Step 3: Create database client**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/db.test.ts`

Expected: PASS

- [ ] **Step 5: Create test database setup utility**

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clearDatabase() {
  const tables = [
    'credit_transactions',
    'feedback',
    'feedback_requests',
    'ai_analyses',
    'presentations',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}

export { prisma as testDb };
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts tests/lib/db.test.ts tests/setup.ts
git commit -m "feat: add database client singleton"
```

---

## Task 4: Password Hashing Utilities

**Files:**
- Create: `src/lib/auth/password.ts`
- Create: `tests/lib/auth/password.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/auth/password.test.ts
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/password.test.ts`

Expected: FAIL - Cannot find module '@/lib/auth/password'

- [ ] **Step 3: Implement password utilities**

```typescript
// src/lib/auth/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/password.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password.ts tests/lib/auth/password.test.ts
git commit -m "feat: add password hashing utilities"
```

---

## Task 5: JWT Utilities

**Files:**
- Create: `src/lib/auth/jwt.ts`
- Create: `tests/lib/auth/jwt.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/auth/jwt.test.ts
import { signToken, verifyToken } from '@/lib/auth/jwt';

describe('JWT utilities', () => {
  const payload = { userId: 'user-123', email: 'test@example.com' };

  describe('signToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await signToken(payload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode valid token', async () => {
      const token = await signToken(payload);
      const decoded = await verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid.token.here')).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      const token = await signToken(payload, '0s');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await expect(verifyToken(token)).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/jwt.test.ts`

Expected: FAIL - Cannot find module '@/lib/auth/jwt'

- [ ] **Step 3: Implement JWT utilities**

```typescript
// src/lib/auth/jwt.ts
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-please-change-in-production-min-32-characters'
);
const JWT_ALGORITHM = 'HS256';

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(
  payload: TokenPayload,
  expiresIn: string = '15d'
): Promise<string> {
  const jwt = await new jose.SignJWT(payload as any)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/jwt.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/jwt.ts tests/lib/auth/jwt.test.ts
git commit -m "feat: add JWT utilities"
```

---

## Task 6: Auth Middleware

**Files:**
- Create: `src/lib/auth/middleware.ts`
- Create: `tests/lib/auth/middleware.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/auth/middleware.test.ts
import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { signToken } from '@/lib/auth/jwt';

describe('Auth middleware', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';

  it('should extract and verify valid token from Authorization header', async () => {
    const token = await signToken({ userId: mockUserId, email: mockEmail });
    
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(true);
    expect(result.user?.userId).toBe(mockUserId);
    expect(result.user?.email).toBe(mockEmail);
  });

  it('should return error for missing Authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing authorization header');
  });

  it('should return error for invalid token format', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid authorization header format');
  });

  it('should return error for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: 'Bearer invalid.token.here',
      },
    });

    const result = await authenticate(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth/middleware.test.ts`

Expected: FAIL - Cannot find module '@/lib/auth/middleware'

- [ ] **Step 3: Implement auth middleware**

```typescript
// src/lib/auth/middleware.ts
import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export interface AuthResult {
  success: boolean;
  user?: TokenPayload;
  error?: string;
}

export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { success: false, error: 'Missing authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { success: false, error: 'Invalid authorization header format' };
  }

  const token = parts[1];

  try {
    const user = await verifyToken(token);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid or expired token' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/auth/middleware.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/middleware.ts tests/lib/auth/middleware.test.ts
git commit -m "feat: add auth middleware"
```

---

## Task 7: Validation Schemas

**Files:**
- Create: `src/lib/validation/schemas.ts`
- Create: `tests/lib/validation/schemas.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/validation/schemas.test.ts
import {
  signupSchema,
  loginSchema,
  createPresentationSchema,
  submitFeedbackSchema,
} from '@/lib/validation/schemas';

describe('Validation schemas', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const data = {
        email: 'test@example.com',
        password: 'SecurePass123',
        name: 'Test User',
        skillLevel: 'BEGINNER',
        goals: ['job_interviews'],
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'SecurePass123',
        name: 'Test User',
        skillLevel: 'BEGINNER',
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
        skillLevel: 'BEGINNER',
      };

      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing fields', () => {
      const data = { email: 'test@example.com' };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createPresentationSchema', () => {
    it('should validate video recording type', () => {
      const data = {
        title: 'My Presentation',
        description: 'A test presentation',
        type: 'VIDEO_RECORDING',
        visibility: 'PRIVATE',
      };

      const result = createPresentationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const data = {
        type: 'VIDEO_RECORDING',
      };

      const result = createPresentationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('submitFeedbackSchema', () => {
    it('should validate feedback submission', () => {
      const data = {
        deliveryRating: 4,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback: 'Great job! Your delivery was clear and the content was well-structured.',
        timestampComments: [
          { time: 30, comment: 'Good opening' },
          { time: 120, comment: 'Strong conclusion' },
        ],
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject ratings outside 1-5 range', () => {
      const data = {
        deliveryRating: 6,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback: 'Great job!',
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject feedback shorter than 50 characters', () => {
      const data = {
        deliveryRating: 4,
        contentRating: 5,
        overallRating: 4,
        writtenFeedback: 'Good',
      };

      const result = submitFeedbackSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/validation/schemas.test.ts`

Expected: FAIL - Cannot find module '@/lib/validation/schemas'

- [ ] **Step 3: Implement validation schemas**

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  goals: z.array(z.string()).optional().default([]),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createPresentationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['VIDEO_RECORDING', 'VIDEO_UPLOAD', 'TEXT_SCRIPT', 'OUTLINE']),
  visibility: z.enum(['PRIVATE', 'COMMUNITY_SHARED', 'PARTNER_ONLY']).default('PRIVATE'),
});

export const submitFeedbackSchema = z.object({
  deliveryRating: z.number().int().min(1).max(5),
  contentRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  writtenFeedback: z.string().min(50, 'Feedback must be at least 50 characters'),
  timestampComments: z
    .array(
      z.object({
        time: z.number().int().min(0),
        comment: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/validation/schemas.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts tests/lib/validation/schemas.test.ts
git commit -m "feat: add validation schemas"
```

---

## Task 8: Credit Calculation Utilities

**Files:**
- Create: `src/lib/credits/calculate.ts`
- Create: `tests/lib/credits/calculate.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/credits/calculate.test.ts
import {
  calculateAIAnalysisCost,
  calculateFeedbackRequestCost,
  calculateFeedbackEarnings,
} from '@/lib/credits/calculate';

describe('Credit calculations', () => {
  describe('calculateAIAnalysisCost', () => {
    it('should calculate cost for basic AI (always 0)', () => {
      const cost = calculateAIAnalysisCost(300, 'basic');
      expect(cost).toBe(0);
    });

    it('should calculate cost for full AI (1 credit per 5 minutes)', () => {
      expect(calculateAIAnalysisCost(180, 'full')).toBe(1); // 3 min
      expect(calculateAIAnalysisCost(300, 'full')).toBe(1); // 5 min
      expect(calculateAIAnalysisCost(360, 'full')).toBe(2); // 6 min
      expect(calculateAIAnalysisCost(720, 'full')).toBe(3); // 12 min
    });

    it('should round up partial minutes', () => {
      expect(calculateAIAnalysisCost(301, 'full')).toBe(2); // 5 min 1 sec
    });
  });

  describe('calculateFeedbackRequestCost', () => {
    it('should calculate cost as 1 credit per minute', () => {
      expect(calculateFeedbackRequestCost(300)).toBe(5); // 5 min
      expect(calculateFeedbackRequestCost(720)).toBe(12); // 12 min
    });

    it('should round up partial minutes', () => {
      expect(calculateFeedbackRequestCost(301)).toBe(6); // 5 min 1 sec
    });
  });

  describe('calculateFeedbackEarnings', () => {
    it('should calculate base earnings for short video', () => {
      const earnings = calculateFeedbackEarnings(240, 150, null);
      expect(earnings.base).toBe(3); // <5 min
      expect(earnings.final).toBe(3);
    });

    it('should calculate base earnings for medium video', () => {
      const earnings = calculateFeedbackEarnings(420, 150, null);
      expect(earnings.base).toBe(5); // 5-10 min
      expect(earnings.final).toBe(5);
    });

    it('should calculate base earnings for long video', () => {
      const earnings = calculateFeedbackEarnings(720, 150, null);
      expect(earnings.base).toBe(8); // 10-20 min
      expect(earnings.final).toBe(8);
    });

    it('should apply 2.0x multiplier for 5-star detailed feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 250, 5);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(2.0);
      expect(earnings.final).toBe(10);
    });

    it('should apply 1.5x multiplier for 4-star feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 4);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(1.5);
      expect(earnings.final).toBe(7.5);
    });

    it('should apply 1.0x multiplier for 3-star feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 3);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(1.0);
      expect(earnings.final).toBe(5);
    });

    it('should apply 0.5x multiplier for low-rated feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 2);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(0.5);
      expect(earnings.final).toBe(2.5);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/credits/calculate.test.ts`

Expected: FAIL - Cannot find module '@/lib/credits/calculate'

- [ ] **Step 3: Implement credit calculation utilities**

```typescript
// src/lib/credits/calculate.ts

export function calculateAIAnalysisCost(
  durationSeconds: number,
  analysisType: 'basic' | 'full'
): number {
  if (analysisType === 'basic') {
    return 0; // Basic AI is always free
  }

  // Full AI: 1 credit per 5 minutes, rounded up
  const minutes = Math.ceil(durationSeconds / 60);
  return Math.ceil(minutes / 5);
}

export function calculateFeedbackRequestCost(durationSeconds: number): number {
  // 1 credit per minute, rounded up
  return Math.ceil(durationSeconds / 60);
}

export interface FeedbackEarnings {
  base: number;
  multiplier: number;
  final: number;
}

export function calculateFeedbackEarnings(
  durationSeconds: number,
  feedbackWordCount: number,
  recipientRating: number | null
): FeedbackEarnings {
  // Calculate base credits by duration
  const minutes = durationSeconds / 60;
  let base: number;

  if (minutes < 5) {
    base = 3;
  } else if (minutes < 10) {
    base = 5;
  } else if (minutes < 20) {
    base = 8;
  } else {
    base = 12;
  }

  // If no rating yet, return base only
  if (recipientRating === null) {
    return { base, multiplier: 1.0, final: base };
  }

  // Calculate quality multiplier
  let multiplier: number;
  const isDetailed = feedbackWordCount >= 200;

  if (recipientRating === 5 && isDetailed) {
    multiplier = 2.0;
  } else if (recipientRating >= 4) {
    multiplier = 1.5;
  } else if (recipientRating >= 3) {
    multiplier = 1.0;
  } else {
    multiplier = 0.5;
  }

  return {
    base,
    multiplier,
    final: base * multiplier,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/credits/calculate.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/credits/calculate.ts tests/lib/credits/calculate.test.ts
git commit -m "feat: add credit calculation utilities"
```

---

## Task 9: Credit Transaction Service

**Files:**
- Create: `src/lib/credits/transaction.ts`
- Create: `tests/lib/credits/transaction.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/credits/transaction.test.ts
import { clearDatabase, testDb } from '../../setup';
import { createCreditTransaction, getUserCredits } from '@/lib/credits/transaction';
import { CreditTransactionType } from '@prisma/client';

describe('Credit transaction service', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('createCreditTransaction', () => {
    it('should create transaction and update user balance', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const transaction = await createCreditTransaction(
        user.id,
        10,
        CreditTransactionType.FEEDBACK_GIVEN
      );

      expect(transaction.amount).toBe(10);
      expect(transaction.balanceAfter).toBe(60);
      expect(transaction.type).toBe(CreditTransactionType.FEEDBACK_GIVEN);

      const updatedUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.creditBalance).toBe(60);
    });

    it('should handle negative amounts (spending)', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const transaction = await createCreditTransaction(
        user.id,
        -5,
        CreditTransactionType.AI_ANALYSIS
      );

      expect(transaction.amount).toBe(-5);
      expect(transaction.balanceAfter).toBe(45);

      const updatedUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.creditBalance).toBe(45);
    });

    it('should store relatedId when provided', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const relatedId = 'presentation-123';
      const transaction = await createCreditTransaction(
        user.id,
        -3,
        CreditTransactionType.AI_ANALYSIS,
        relatedId
      );

      expect(transaction.relatedId).toBe(relatedId);
    });

    it('should throw error if user not found', async () => {
      await expect(
        createCreditTransaction(
          'non-existent',
          10,
          CreditTransactionType.FEEDBACK_GIVEN
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserCredits', () => {
    it('should return current credit balance', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 75,
        },
      });

      const credits = await getUserCredits(user.id);
      expect(credits).toBe(75);
    });

    it('should throw error if user not found', async () => {
      await expect(getUserCredits('non-existent')).rejects.toThrow('User not found');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/credits/transaction.test.ts`

Expected: FAIL - Cannot find module '@/lib/credits/transaction'

- [ ] **Step 3: Implement credit transaction service**

```typescript
// src/lib/credits/transaction.ts
import { db } from '@/lib/db';
import { CreditTransactionType } from '@prisma/client';

export async function createCreditTransaction(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  relatedId?: string
) {
  // Use transaction to ensure atomicity
  return db.$transaction(async (tx) => {
    // Get current user balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.creditBalance + amount;

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: newBalance },
    });

    // Create transaction record
    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        relatedId,
        balanceAfter: newBalance,
      },
    });

    return transaction;
  });
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.creditBalance;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/credits/transaction.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/credits/transaction.ts tests/lib/credits/transaction.test.ts
git commit -m "feat: add credit transaction service"
```

---

## Task 10: Signup API Endpoint

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Create: `tests/api/auth/signup.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/auth/signup.test.ts
import { POST } from '@/app/api/auth/signup/route';
import { clearDatabase, testDb } from '../../../setup';

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create new user and return JWT token', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
        skillLevel: 'BEGINNER',
        goals: ['job_interviews'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.name).toBe('New User');
    expect(data.user).not.toHaveProperty('passwordHash');

    // Verify user in database
    const user = await testDb.user.findUnique({
      where: { email: 'newuser@example.com' },
    });
    expect(user).toBeTruthy();
    expect(user?.creditBalance).toBe(50); // Initial bonus

    // Verify initial credit transaction
    const transaction = await testDb.creditTransaction.findFirst({
      where: { userId: user?.id },
    });
    expect(transaction?.amount).toBe(50);
    expect(transaction?.type).toBe('INITIAL_BONUS');
  });

  it('should reject duplicate email', async () => {
    await testDb.user.create({
      data: {
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'SecurePass123',
        name: 'New User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already exists');
  });

  it('should reject invalid input', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/auth/signup.test.ts`

Expected: FAIL - Cannot find module '@/app/api/auth/signup/route'

- [ ] **Step 3: Implement signup endpoint**

```typescript
// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { signupSchema } from '@/lib/validation/schemas';
import { CreditTransactionType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, skillLevel, goals } = validation.data;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and initial credit transaction in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          skillLevel,
          goals,
          creditBalance: 50,
        },
      });

      // Create initial credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 50,
          type: CreditTransactionType.INITIAL_BONUS,
          balanceAfter: 50,
        },
      });

      return user;
    });

    // Generate JWT token
    const token = await signToken({
      userId: result.id,
      email: result.email,
    });

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = result;

    return NextResponse.json(
      {
        token,
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/auth/signup.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/signup/route.ts tests/api/auth/signup.test.ts
git commit -m "feat: add signup API endpoint"
```

---

## Task 11: Login API Endpoint

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `tests/api/auth/login.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/auth/login.test.ts
import { POST } from '@/app/api/auth/login/route';
import { clearDatabase, testDb } from '../../../setup';
import { hashPassword } from '@/lib/auth/password';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should login with valid credentials', async () => {
    const password = 'SecurePass123';
    const passwordHash = await hashPassword(password);

    await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('user@example.com');
    expect(data.user).not.toHaveProperty('passwordHash');
  });

  it('should reject invalid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject invalid password', async () => {
    const passwordHash = await hashPassword('CorrectPass123');

    await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
      },
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'WrongPass123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should reject invalid input', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/auth/login.test.ts`

Expected: FAIL - Cannot find module '@/app/api/auth/login/route'

- [ ] **Step 3: Implement login endpoint**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
    });

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/auth/login.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts tests/api/auth/login.test.ts
git commit -m "feat: add login API endpoint"
```

---

## Task 12: Get Current User Endpoint

**Files:**
- Create: `src/app/api/auth/me/route.ts`
- Create: `tests/api/auth/me.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/auth/me.test.ts
import { GET } from '@/app/api/auth/me/route';
import { clearDatabase, testDb } from '../../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should return current user with valid token', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        creditBalance: 75,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe(user.id);
    expect(data.user.email).toBe('user@example.com');
    expect(data.user.creditBalance).toBe(75);
    expect(data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 for missing token', async () => {
    const request = new Request('http://localhost:3000/api/auth/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Missing authorization header');
  });

  it('should return 401 for invalid token', async () => {
    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: 'Bearer invalid.token.here',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('should return 404 if user not found', async () => {
    const token = await signToken({
      userId: 'non-existent-id',
      email: 'ghost@example.com',
    });

    const request = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/auth/me.test.ts`

Expected: FAIL - Cannot find module '@/app/api/auth/me/route'

- [ ] **Step 3: Implement me endpoint**

```typescript
// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: auth.user.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/auth/me.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/me/route.ts tests/api/auth/me.test.ts
git commit -m "feat: add get current user endpoint"
```

---

## Task 13: S3 Client Setup

**Files:**
- Create: `src/lib/s3/client.ts`
- Create: `tests/lib/s3/client.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/s3/client.test.ts
import { getS3Client } from '@/lib/s3/client';
import { S3Client } from '@aws-sdk/client-s3';

describe('S3 client', () => {
  it('should export an S3Client instance', () => {
    const client = getS3Client();
    expect(client).toBeInstanceOf(S3Client);
  });

  it('should reuse the same instance', () => {
    const client1 = getS3Client();
    const client2 = getS3Client();
    expect(client1).toBe(client2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/s3/client.test.ts`

Expected: FAIL - Cannot find module '@/lib/s3/client'

- [ ] **Step 3: Install AWS SDK v3**

Run: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

Expected: Dependencies installed successfully

- [ ] **Step 4: Implement S3 client**

```typescript
// src/lib/s3/client.ts
import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  return s3Client;
}

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'speaking-platform-dev';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/lib/s3/client.test.ts`

Expected: PASS (all tests)

- [ ] **Step 6: Update package.json if needed**

Ensure these are in dependencies:
```json
"@aws-sdk/client-s3": "^3.500.0",
"@aws-sdk/s3-request-presigner": "^3.500.0"
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/s3/client.ts tests/lib/s3/client.test.ts package.json package-lock.json
git commit -m "feat: add S3 client setup"
```

---

## Task 14: S3 Upload URL Generation

**Files:**
- Create: `src/lib/s3/upload.ts`
- Create: `tests/lib/s3/upload.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/s3/upload.test.ts
import { generateUploadUrl, generateVideoKey } from '@/lib/s3/upload';

describe('S3 upload utilities', () => {
  describe('generateVideoKey', () => {
    it('should generate unique S3 key with userId and timestamp', () => {
      const userId = 'user-123';
      const key1 = generateVideoKey(userId);
      
      expect(key1).toContain(`videos/${userId}/`);
      expect(key1).toMatch(/\.mp4$/);
      
      // Keys should be different on subsequent calls
      const key2 = generateVideoKey(userId);
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate presigned URL', async () => {
      const userId = 'user-123';
      const result = await generateUploadUrl(userId);

      expect(result.url).toBeTruthy();
      expect(result.key).toContain(`videos/${userId}/`);
      expect(result.url).toContain(result.key);
      expect(result.url).toContain('X-Amz-Signature');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/s3/upload.test.ts`

Expected: FAIL - Cannot find module '@/lib/s3/upload'

- [ ] **Step 3: Implement upload utilities**

```typescript
// src/lib/s3/upload.ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, S3_BUCKET_NAME } from './client';

export function generateVideoKey(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `videos/${userId}/${timestamp}-${random}.mp4`;
}

export async function generateUploadUrl(userId: string): Promise<{
  url: string;
  key: string;
}> {
  const key = generateVideoKey(userId);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: 'video/mp4',
  });

  const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour

  return { url, key };
}

export function getVideoUrl(key: string): string {
  const region = process.env.S3_BUCKET_REGION || 'us-east-1';
  return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/s3/upload.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/s3/upload.ts tests/lib/s3/upload.test.ts
git commit -m "feat: add S3 upload URL generation"
```

---

## Task 15: Create Presentation Endpoint

**Files:**
- Create: `src/app/api/presentations/route.ts`
- Create: `tests/api/presentations/create.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/presentations/create.test.ts
import { POST } from '@/app/api/presentations/route';
import { clearDatabase, testDb } from '../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('POST /api/presentations', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should create presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'My First Presentation',
        description: 'A test presentation',
        type: 'VIDEO_RECORDING',
        visibility: 'PRIVATE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.presentation.id).toBeTruthy();
    expect(data.presentation.title).toBe('My First Presentation');
    expect(data.presentation.userId).toBe(user.id);
    expect(data.presentation.status).toBe('PROCESSING');
  });

  it('should reject unauthenticated request', async () => {
    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test',
        type: 'VIDEO_RECORDING',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should reject invalid input', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request('http://localhost:3000/api/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'VIDEO_RECORDING',
        // Missing title
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/presentations/create.test.ts`

Expected: FAIL - Cannot find module '@/app/api/presentations/route'

- [ ] **Step 3: Implement create presentation endpoint**

```typescript
// src/app/api/presentations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { createPresentationSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const validation = createPresentationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, type, visibility } = validation.data;

    const presentation = await db.presentation.create({
      data: {
        userId: auth.user.userId,
        title,
        description,
        type,
        visibility,
        status: 'PROCESSING',
      },
    });

    return NextResponse.json({ presentation }, { status: 201 });
  } catch (error) {
    console.error('Create presentation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const presentations = await db.presentation.findMany({
      where: { userId: auth.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ presentations });
  } catch (error) {
    console.error('List presentations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/presentations/create.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/presentations/route.ts tests/api/presentations/create.test.ts
git commit -m "feat: add create presentation endpoint"
```

---

## Task 16: Get Upload URL Endpoint

**Files:**
- Create: `src/app/api/presentations/[id]/upload-url/route.ts`
- Create: `tests/api/presentations/upload-url.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/api/presentations/upload-url.test.ts
import { GET } from '@/app/api/presentations/[id]/upload-url/route';
import { clearDatabase, testDb } from '../../../setup';
import { signToken } from '@/lib/auth/jwt';

describe('GET /api/presentations/[id]/upload-url', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should generate upload URL for own presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const presentation = await testDb.presentation.create({
      data: {
        userId: user.id,
        title: 'Test Presentation',
        type: 'VIDEO_RECORDING',
        status: 'PROCESSING',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request(
      `http://localhost:3000/api/presentations/${presentation.id}/upload-url`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: presentation.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBeTruthy();
    expect(data.key).toBeTruthy();
    expect(data.url).toContain('X-Amz-Signature');
  });

  it('should reject access to other user presentation', async () => {
    const user1 = await testDb.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash',
        name: 'User 1',
      },
    });

    const user2 = await testDb.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash',
        name: 'User 2',
      },
    });

    const presentation = await testDb.presentation.create({
      data: {
        userId: user1.id,
        title: 'User 1 Presentation',
        type: 'VIDEO_RECORDING',
        status: 'PROCESSING',
      },
    });

    const token = await signToken({ userId: user2.id, email: user2.email });

    const request = new Request(
      `http://localhost:3000/api/presentations/${presentation.id}/upload-url`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: presentation.id } });

    expect(response.status).toBe(403);
  });

  it('should reject for non-existent presentation', async () => {
    const user = await testDb.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    const request = new Request(
      'http://localhost:3000/api/presentations/non-existent/upload-url',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const response = await GET(request, { params: { id: 'non-existent' } });

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/presentations/upload-url.test.ts`

Expected: FAIL - Cannot find module '@/app/api/presentations/[id]/upload-url/route'

- [ ] **Step 3: Implement upload URL endpoint**

```typescript
// src/app/api/presentations/[id]/upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { generateUploadUrl } from '@/lib/s3/upload';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const presentation = await db.presentation.findUnique({
      where: { id: params.id },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      );
    }

    if (presentation.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { url, key } = await generateUploadUrl(auth.user.userId);

    // Update presentation with video key
    await db.presentation.update({
      where: { id: params.id },
      data: { videoUrl: key },
    });

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/presentations/upload-url.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/presentations/[id]/upload-url/route.ts tests/api/presentations/upload-url.test.ts
git commit -m "feat: add upload URL generation endpoint"
```

---

## Task 17: Delivery Metrics Calculation

**Files:**
- Create: `src/lib/ai/delivery-metrics.ts`
- Create: `tests/lib/ai/delivery-metrics.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/ai/delivery-metrics.test.ts
import { calculateDeliveryMetrics } from '@/lib/ai/delivery-metrics';

describe('Delivery metrics calculation', () => {
  it('should calculate pace (WPM)', () => {
    const transcript = 'This is a test transcript with exactly ten words here.';
    const durationSeconds = 60; // 1 minute

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.pace_wpm).toBe(10);
  });

  it('should detect filler words', () => {
    const transcript = 'Um, so like, you know, this is uh basically a test.';
    const durationSeconds = 10;

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.filler_word_count).toBe(5);
    expect(metrics.filler_words_list).toContain('um');
    expect(metrics.filler_words_list).toContain('so');
    expect(metrics.filler_words_list).toContain('like');
    expect(metrics.filler_words_list).toContain('you know');
    expect(metrics.filler_words_list).toContain('uh');
  });

  it('should handle empty transcript', () => {
    const transcript = '';
    const durationSeconds = 60;

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.pace_wpm).toBe(0);
    expect(metrics.filler_word_count).toBe(0);
  });

  it('should calculate correct pace for longer speech', () => {
    const words = new Array(150).fill('word').join(' ');
    const durationSeconds = 60;

    const metrics = calculateDeliveryMetrics(words, durationSeconds);

    expect(metrics.pace_wpm).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/ai/delivery-metrics.test.ts`

Expected: FAIL - Cannot find module '@/lib/ai/delivery-metrics'

- [ ] **Step 3: Implement delivery metrics calculation**

```typescript
// src/lib/ai/delivery-metrics.ts

export interface DeliveryMetrics {
  pace_wpm: number;
  filler_word_count: number;
  filler_words_list: string[];
  avg_volume: number;
  pause_count: number;
  eye_contact_score: number;
}

const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bso\b/gi,
  /\bactually\b/gi,
  /\bbasically\b/gi,
];

export function calculateDeliveryMetrics(
  transcript: string,
  durationSeconds: number,
  audioData?: Float32Array
): DeliveryMetrics {
  // Calculate pace (words per minute)
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const minutes = durationSeconds / 60;
  const pace_wpm = minutes > 0 ? Math.round(words.length / minutes) : 0;

  // Detect filler words
  const filler_words_list: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  for (const pattern of FILLER_PATTERNS) {
    const matches = lowerTranscript.match(pattern);
    if (matches) {
      filler_words_list.push(...matches);
    }
  }

  const filler_word_count = filler_words_list.length;

  // Placeholder values for audio analysis (would require actual audio processing)
  const avg_volume = 0.5; // 0-1 scale
  const pause_count = 0;
  const eye_contact_score = 50; // 0-100 scale

  return {
    pace_wpm,
    filler_word_count,
    filler_words_list,
    avg_volume,
    pause_count,
    eye_contact_score,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/ai/delivery-metrics.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/delivery-metrics.ts tests/lib/ai/delivery-metrics.test.ts
git commit -m "feat: add delivery metrics calculation"
```

---

## Task 18: Content Analysis with LLM

**Files:**
- Create: `src/lib/ai/content-analysis.ts`
- Create: `tests/lib/ai/content-analysis.test.ts`

- [ ] **Step 1: Install Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

Expected: Dependency installed successfully

- [ ] **Step 2: Write test (mocked LLM)**

```typescript
// tests/lib/ai/content-analysis.test.ts
import { analyzeContent } from '@/lib/ai/content-analysis';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                has_intro: true,
                has_conclusion: true,
                structure_score: 85,
                clarity_feedback: 'Clear and well-organized',
                persuasiveness_score: 80,
                weak_transitions: ['Transition between point 2 and 3'],
                improvement_suggestions: [
                  'Add more examples',
                  'Strengthen the conclusion',
                ],
              }),
            },
          ],
        }),
      },
    })),
  };
});

describe('Content analysis', () => {
  it('should analyze content and return structured feedback', async () => {
    const transcript = 'Hello everyone. Today I will talk about three main points...';
    const duration = 180;

    const analysis = await analyzeContent(transcript, duration);

    expect(analysis.has_intro).toBe(true);
    expect(analysis.has_conclusion).toBe(true);
    expect(analysis.structure_score).toBe(85);
    expect(analysis.persuasiveness_score).toBe(80);
    expect(analysis.improvement_suggestions.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/lib/ai/content-analysis.test.ts`

Expected: FAIL - Cannot find module '@/lib/ai/content-analysis'

- [ ] **Step 4: Implement content analysis**

```typescript
// src/lib/ai/content-analysis.ts
import Anthropic from '@anthropic-ai/sdk';

export interface ContentAnalysis {
  has_intro: boolean;
  has_conclusion: boolean;
  structure_score: number;
  clarity_feedback: string;
  persuasiveness_score: number;
  weak_transitions: string[];
  improvement_suggestions: string[];
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeContent(
  transcript: string,
  durationSeconds: number,
  userGoals?: string[]
): Promise<ContentAnalysis> {
  const minutes = Math.round(durationSeconds / 60);

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
   - Rate overall flow

5. IMPROVEMENT SUGGESTIONS:
   - Provide 3-5 specific, actionable recommendations

TRANSCRIPT:
${transcript}

CONTEXT:
- Duration: ${minutes} minutes
${userGoals ? `- Speaker goals: ${userGoals.join(', ')}` : ''}

Return response as JSON matching this schema:
{
  "has_intro": boolean,
  "has_conclusion": boolean,
  "structure_score": number,
  "clarity_feedback": string,
  "persuasiveness_score": number,
  "weak_transitions": string[],
  "improvement_suggestions": string[]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Invalid response from API');
  }

  const analysis = JSON.parse(textContent.text) as ContentAnalysis;
  return analysis;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/lib/ai/content-analysis.test.ts`

Expected: PASS (all tests)

- [ ] **Step 6: Update package.json if needed**

Ensure this is in dependencies:
```json
"@anthropic-ai/sdk": "^0.20.0"
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/content-analysis.ts tests/lib/ai/content-analysis.test.ts package.json package-lock.json
git commit -m "feat: add content analysis with Claude API"
```

---

## Task 19: Root Layout & Global Styles

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Create global CSS**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-rgb: 18, 18, 18;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}
```

- [ ] **Step 2: Create root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Public Speaking Platform',
  description: 'Practice and improve your public speaking skills',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create landing page**

```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Public Speaking Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Practice and improve your public speaking skills with AI-powered feedback
        </p>
        <div className="space-x-4">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Get Started
          </a>
          <a
            href="/api/auth/signup"
            className="inline-block px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test dev server**

Run: `npm run dev`

Expected: Server starts on http://localhost:3000, landing page loads

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat: add root layout and landing page"
```

---

## Task 20: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/CreditBalance.tsx`

- [ ] **Step 1: Create CreditBalance component**

```typescript
// src/components/CreditBalance.tsx
'use client';

interface CreditBalanceProps {
  balance: number;
}

export function CreditBalance({ balance }: CreditBalanceProps) {
  const getStatusColor = () => {
    if (balance > 10) return 'text-green-600';
    if (balance > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusMessage = () => {
    if (balance > 10) return 'Good balance';
    if (balance > 0) return 'Low credits - give feedback to earn more';
    return 'Out of credits - give feedback to earn more';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Credit Balance</p>
          <p className={`text-3xl font-bold ${getStatusColor()}`}>{balance}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{getStatusMessage()}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard page (placeholder)**

```typescript
// src/app/dashboard/page.tsx
import { CreditBalance } from '@/components/CreditBalance';

export default function DashboardPage() {
  // TODO: Fetch user and presentations from API
  const mockUser = {
    name: 'Test User',
    creditBalance: 50,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Public Speaking Platform</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{mockUser.name}</span>
              <a
                href="/api/auth/logout"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
          <CreditBalance balance={mockUser.creditBalance} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="/practice"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              New Practice
            </h3>
            <p className="text-gray-600">
              Record or upload a presentation to get AI feedback
            </p>
          </a>

          <a
            href="/feedback/give"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Give Feedback
            </h3>
            <p className="text-gray-600">
              Help others and earn credits
            </p>
          </a>

          <a
            href="/credits"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Credit History
            </h3>
            <p className="text-gray-600">
              View your transaction history
            </p>
          </a>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Presentations
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-600">
              No presentations yet. Start practicing!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Test dashboard**

Run: `npm run dev` and navigate to http://localhost:3000/dashboard

Expected: Dashboard page loads with credit balance and navigation

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/CreditBalance.tsx
git commit -m "feat: add dashboard page"
```

---

## Summary

This implementation plan covers the foundational Phase 1 MVP with 20 comprehensive tasks:

**Completed Coverage:**
- ✅ Project setup and configuration (Task 1)
- ✅ Database schema and client (Tasks 2-3)
- ✅ Authentication system (Tasks 4-7, 10-12)
- ✅ Credit system (Tasks 8-9)
- ✅ S3 integration (Tasks 13-14)
- ✅ Presentation management (Tasks 15-16)
- ✅ AI analysis pipeline foundation (Tasks 17-18)
- ✅ Basic UI structure (Tasks 19-20)

**Remaining for Full MVP (not in this plan):**
- Feedback request/submission endpoints and UI
- Video recording component (MediaRecorder API)
- Presentation view page with AI feedback display
- Give feedback interface
- Credit history page
- AI analysis background job/webhook
- Integration testing
- Deployment configuration

**Total tasks in plan: 20**
**Estimated time per task: 15-30 minutes**
**Total estimated time: 5-10 hours**

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-03-phase1-mvp-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
