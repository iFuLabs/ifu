-- Soft-delete for integrations: track when an integration was disconnected
-- instead of deleting the row. This preserves the relationship between
-- integrations and their scan history, and enables clean reconnection.
ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "disconnected_at" timestamp;
