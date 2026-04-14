-- Drop the existing non-unique index and replace with a unique index
DROP INDEX IF EXISTS "idx_control_results_org_control";
CREATE UNIQUE INDEX "idx_control_results_org_control" ON "control_results" ("org_id", "control_def_id");
