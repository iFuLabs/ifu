-- FinOps recommendation workflow states
-- Tracks user actions on findings (open, snoozed, done)

CREATE TYPE recommendation_state AS ENUM ('open', 'snoozed', 'done');

CREATE TABLE IF NOT EXISTS "finops_recommendation_states" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "resource_id" text NOT NULL,
  "category"    text NOT NULL,
  "state"       recommendation_state NOT NULL DEFAULT 'open',
  "snoozed_until" timestamp,
  "notes"       text,
  "updated_by"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"  timestamp NOT NULL DEFAULT NOW(),
  "updated_at"  timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_finops_states_org_resource" ON "finops_recommendation_states"("org_id", "resource_id", "category");
CREATE INDEX IF NOT EXISTS "idx_finops_states_org_state" ON "finops_recommendation_states"("org_id", "state");
