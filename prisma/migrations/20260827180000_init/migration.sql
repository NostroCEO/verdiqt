-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('QUEUED', 'NORMALIZING', 'GATHERING', 'CLASSIFYING', 'SCORING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "VerdictKind" AS ENUM ('BUILD', 'PIVOT', 'KILL');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('PROBLEM_SEVERITY', 'DEMAND_SIGNALS', 'COMPETITION', 'MONETIZATION', 'DISTRIBUTION', 'BUILD_COST');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('WEB_SEARCH', 'REDDIT', 'HACKERNEWS', 'PRODUCT_HUNT', 'GITHUB');

-- CreateEnum
CREATE TYPE "HumanState" AS ENUM ('NEUTRAL', 'PINNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Actor" AS ENUM ('HUMAN', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('DEEP_SCAN', 'PORTFOLIO_RANK');

-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('PENDING_HUMAN_APPROVAL', 'APPROVED', 'RUNNING', 'COMPLETED', 'REJECTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PipelineRunKind" AS ENUM ('FULL', 'RESCORE', 'DEEP_SCAN');

-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousSession" (
    "id" TEXT NOT NULL,
    "capabilityHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnonymousSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousSessionId" TEXT,
    "ideaText" TEXT,
    "repoUrl" TEXT,
    "parentTrialId" TEXT,
    "status" "TrialStatus" NOT NULL DEFAULT 'QUEUED',
    "weights" JSONB NOT NULL,
    "compositeScore" INTEGER,
    "verdict" "VerdictKind",
    "pivotDirection" TEXT,
    "nextStep" JSONB,
    "ipHash" TEXT,
    "pipelineRevision" INTEGER NOT NULL DEFAULT 1,
    "completedRevision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedIdea" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[],
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "strength" INTEGER NOT NULL,
    "humanState" "HumanState" NOT NULL DEFAULT 'NEUTRAL',
    "fingerprint" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimensionScore" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "score" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidenceIds" TEXT[],

    CONSTRAINT "DimensionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialEvent" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "pipelineRunId" TEXT,
    "dedupeKey" TEXT,
    "actor" "Actor" NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "kind" "PipelineRunKind" NOT NULL,
    "deepDimension" "Dimension",
    "jobKey" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "heartbeatAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "state" "ApprovalState" NOT NULL DEFAULT 'PENDING_HUMAN_APPROVAL',
    "trialId" TEXT,
    "userId" TEXT,
    "anonymousSessionId" TEXT,
    "requestedBy" "Actor" NOT NULL DEFAULT 'AGENT',
    "requestedRevision" INTEGER,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceDoc" TEXT NOT NULL,
    "headingIndex" INTEGER NOT NULL,
    "tags" TEXT[],
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PortfolioScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "trialId" TEXT,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousSession_capabilityHash_key" ON "AnonymousSession"("capabilityHash");

-- CreateIndex
CREATE INDEX "AnonymousSession_expiresAt_idx" ON "AnonymousSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Trial_userId_createdAt_idx" ON "Trial"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Trial_anonymousSessionId_createdAt_idx" ON "Trial"("anonymousSessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedIdea_trialId_key" ON "NormalizedIdea"("trialId");

-- CreateIndex
CREATE INDEX "Evidence_trialId_dimension_idx" ON "Evidence"("trialId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_trialId_fingerprint_key" ON "Evidence"("trialId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "DimensionScore_trialId_dimension_key" ON "DimensionScore"("trialId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "TrialEvent_dedupeKey_key" ON "TrialEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "TrialEvent_trialId_createdAt_idx" ON "TrialEvent"("trialId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_jobKey_key" ON "PipelineRun"("jobKey");

-- CreateIndex
CREATE INDEX "PipelineRun_status_createdAt_idx" ON "PipelineRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PipelineRun_status_leaseExpiresAt_idx" ON "PipelineRun"("status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_trialId_revision_key" ON "PipelineRun"("trialId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_dedupeKey_key" ON "Approval"("dedupeKey");

-- CreateIndex
CREATE INDEX "Approval_trialId_state_idx" ON "Approval"("trialId", "state");

-- CreateIndex
CREATE INDEX "Approval_userId_state_idx" ON "Approval"("userId", "state");

-- CreateIndex
CREATE INDEX "Approval_anonymousSessionId_state_idx" ON "Approval"("anonymousSessionId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_sourceDoc_headingIndex_key" ON "KnowledgeChunk"("sourceDoc", "headingIndex");

-- CreateIndex
CREATE INDEX "ApiCache_expiresAt_idx" ON "ApiCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScan_trialId_key" ON "PortfolioScan"("trialId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScan_userId_repoFullName_key" ON "PortfolioScan"("userId", "repoFullName");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitHit_ipHash_day_key" ON "RateLimitHit"("ipHash", "day");

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "AnonymousSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_parentTrialId_fkey" FOREIGN KEY ("parentTrialId") REFERENCES "Trial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedIdea" ADD CONSTRAINT "NormalizedIdea_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionScore" ADD CONSTRAINT "DimensionScore_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialEvent" ADD CONSTRAINT "TrialEvent_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialEvent" ADD CONSTRAINT "TrialEvent_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "AnonymousSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScan" ADD CONSTRAINT "PortfolioScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScan" ADD CONSTRAINT "PortfolioScan_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_exactly_one_owner_check" CHECK (
  (("userId" IS NOT NULL)::int + ("anonymousSessionId" IS NOT NULL)::int) = 1
);

-- AddCheckConstraint
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_exactly_one_input_check" CHECK (
  (("ideaText" IS NOT NULL)::int + ("repoUrl" IS NOT NULL)::int) = 1
);

-- AddCheckConstraint
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_compositeScore_range_check" CHECK (
  "compositeScore" IS NULL OR ("compositeScore" >= 0 AND "compositeScore" <= 100)
);

-- AddCheckConstraint
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_revision_order_check" CHECK (
  "pipelineRevision" >= 1 AND "completedRevision" >= 0 AND "completedRevision" <= "pipelineRevision"
);

-- AddCheckConstraint
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_strength_range_check" CHECK (
  "strength" >= 1 AND "strength" <= 5
);

-- AddCheckConstraint
ALTER TABLE "DimensionScore" ADD CONSTRAINT "DimensionScore_score_range_check" CHECK (
  "score" >= 0 AND "score" <= 100
);

-- AddCheckConstraint
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_exactly_one_owner_check" CHECK (
  (("userId" IS NOT NULL)::int + ("anonymousSessionId" IS NOT NULL)::int) = 1
);

-- AddCheckConstraint
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_deep_scan_owner_check" CHECK (
  "kind" <> 'DEEP_SCAN' OR "trialId" IS NOT NULL
);

-- AddCheckConstraint
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_portfolio_rank_owner_check" CHECK (
  "kind" <> 'PORTFOLIO_RANK' OR ("userId" IS NOT NULL AND "anonymousSessionId" IS NULL AND "trialId" IS NULL)
);

-- AddTrigger
CREATE OR REPLACE FUNCTION "validate_deep_scan_approval_owner"()
RETURNS trigger AS $$
DECLARE
  trial_owner RECORD;
BEGIN
  IF NEW."kind" = 'DEEP_SCAN' THEN
    SELECT "userId", "anonymousSessionId"
      INTO trial_owner
      FROM "Trial"
      WHERE "id" = NEW."trialId";

    IF trial_owner IS NULL THEN
      RAISE EXCEPTION 'Deep scan approval must reference an existing trial';
    END IF;

    IF trial_owner."userId" IS DISTINCT FROM NEW."userId"
      OR trial_owner."anonymousSessionId" IS DISTINCT FROM NEW."anonymousSessionId" THEN
      RAISE EXCEPTION 'Deep scan approval owner must match trial owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Approval_deep_scan_owner_trigger"
BEFORE INSERT OR UPDATE OF "kind", "trialId", "userId", "anonymousSessionId"
ON "Approval"
FOR EACH ROW
EXECUTE FUNCTION "validate_deep_scan_approval_owner"();
