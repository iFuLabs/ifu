-- Phase 1: Card-at-signup tracking columns
-- Tracks tokenization reference (for refund audit) and selected tier (for post-trial downgrade)

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "selected_tier" text,
  ADD COLUMN IF NOT EXISTS "tokenization_reference" text,
  ADD COLUMN IF NOT EXISTS "tokenization_refunded_at" timestamp;

-- Backfill: existing subscriptions have selected_tier = tier
UPDATE "subscriptions" SET "selected_tier" = "tier" WHERE "selected_tier" IS NULL AND "tier" IS NOT NULL;
