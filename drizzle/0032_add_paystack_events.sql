-- Phase 2: Paystack webhook event deduplication table
CREATE TABLE IF NOT EXISTS "paystack_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  "payload" jsonb
);

CREATE INDEX IF NOT EXISTS "idx_paystack_events_type" ON "paystack_events" ("type");

-- Add past_due status support to subscriptions
-- (already text column, no enum change needed — just documenting the new valid value)
COMMENT ON COLUMN "subscriptions"."status" IS 'active | trialing | cancelled | expired | past_due';
