-- Debounce field so we email the org owner at most once per 24h about a
-- connection error on this integration. Without this, every retry the worker
-- attempts could fire another email.
ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "last_failure_email_at" timestamp;
