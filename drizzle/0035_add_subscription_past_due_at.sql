-- Add past_due_at timestamp so we can compute grace period expiry without
-- relying on updated_at (which changes on every row update).

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "past_due_at" timestamp;

-- Backfill: if any existing rows are already past_due, use updated_at as the
-- best-available estimate of when they entered that state.
UPDATE "subscriptions"
   SET "past_due_at" = "updated_at"
 WHERE "status" = 'past_due'
   AND "past_due_at" IS NULL;
