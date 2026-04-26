-- C-A6: Audit calendar and deadline tracking
CREATE TABLE IF NOT EXISTS "audits" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"            uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "framework"         text NOT NULL,
  "type"              text NOT NULL DEFAULT 'type2',
  "status"            text NOT NULL DEFAULT 'planning',
  "kickoff_at"        timestamp,
  "fieldwork_at"      timestamp,
  "expected_close_at" timestamp,
  "completed_at"      timestamp,
  "auditor_firm"      text,
  "notes"             text,
  "created_at"        timestamp NOT NULL DEFAULT NOW(),
  "updated_at"        timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audits_org_id" ON "audits"("org_id");
CREATE INDEX IF NOT EXISTS "idx_audits_expected_close" ON "audits"("expected_close_at");
