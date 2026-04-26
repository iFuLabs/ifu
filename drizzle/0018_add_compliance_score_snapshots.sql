-- C-A2: Compliance score snapshots for historical trend
CREATE TABLE IF NOT EXISTS "compliance_score_snapshots" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"         uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "framework"      text NOT NULL,
  "score_overall"  integer NOT NULL DEFAULT 0,
  "score_pass"     integer NOT NULL DEFAULT 0,
  "score_fail"     integer NOT NULL DEFAULT 0,
  "score_review"   integer NOT NULL DEFAULT 0,
  "score_total"    integer NOT NULL DEFAULT 0,
  "captured_at"    timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_score_snapshots_org_framework" ON "compliance_score_snapshots"("org_id", "framework");
CREATE INDEX IF NOT EXISTS "idx_score_snapshots_captured_at" ON "compliance_score_snapshots"("captured_at");
