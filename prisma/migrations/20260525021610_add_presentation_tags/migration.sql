-- Add tags column to presentations table
ALTER TABLE "presentations" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
