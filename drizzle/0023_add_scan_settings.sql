-- Per-org scheduled-scan controls. Defaults match the previous hardcoded
-- cron times (compliance 02:00 UTC, finops 03:00 UTC, anomaly 03:30 UTC).
-- The scheduler now ticks hourly and consults this column to decide which
-- orgs to enqueue.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "scan_settings" jsonb DEFAULT
    '{"comply":  {"enabled": true, "hourUtc": 2},
      "finops":  {"enabled": true, "hourUtc": 3},
      "anomaly": {"enabled": true, "hourUtc": 3}}'::jsonb;
