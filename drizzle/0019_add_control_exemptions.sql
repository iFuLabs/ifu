-- C-A3: Control exemption workflow
CREATE TABLE IF NOT EXISTS "control_exemptions" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "control_def_id"  uuid NOT NULL REFERENCES "control_definitions"("id"),
  "requested_by"    uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reason"          text NOT NULL,
  "justification"   text,
  "expires_at"      timestamp,
  "status"          text NOT NULL DEFAULT 'pending',
  "decided_at"      timestamp,
  "created_at"      timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_exemptions_org_id" ON "control_exemptions"("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_exemptions_org_control_active" ON "control_exemptions"("org_id", "control_def_id") WHERE "status" IN ('pending', 'approved');
