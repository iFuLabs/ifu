-- F-A1: Add finops_settings jsonb column to organizations for tag-key config
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "finops_settings" jsonb DEFAULT '{"tagKeys": ["Environment", "Team", "Project", "CostCenter"]}';
