-- C-A1: Remediation task tracking on control_results

ALTER TABLE "control_results"
  ADD COLUMN IF NOT EXISTS "remediation_owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "remediation_due_date" timestamp,
  ADD COLUMN IF NOT EXISTS "remediation_status" text,
  ADD COLUMN IF NOT EXISTS "remediation_started_at" timestamp,
  ADD COLUMN IF NOT EXISTS "remediation_completed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "remediation_overdue_alerted_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_control_results_remediation_owner"
  ON "control_results" ("remediation_owner_id");

CREATE INDEX IF NOT EXISTS "idx_control_results_remediation_due"
  ON "control_results" ("remediation_due_date")
  WHERE "remediation_due_date" IS NOT NULL;
