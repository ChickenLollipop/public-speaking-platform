-- Add TRANSCRIPTION to CreditTransactionType enum
ALTER TYPE "CreditTransactionType" ADD VALUE 'TRANSCRIPTION';

-- Add transcript and transcribedAt columns to presentations table
ALTER TABLE "presentations" ADD COLUMN "transcript" TEXT,
ADD COLUMN "transcribed_at" TIMESTAMP(3);
