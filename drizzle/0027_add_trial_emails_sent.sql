-- Tracks which trial-lifecycle emails have already been sent to an org so the
-- hourly trial-reminder cron is idempotent. Each key is null if not sent, or
-- an ISO timestamp string of when it went out.
--
-- Card-on-file is mandatory at signup, so a "no card on file" branch is
-- impossible — only the T-24h charge reminder is tracked here. First-charge
-- receipt + payment-failed emails are driven by Paystack webhooks, not this
-- cron, so they don't need an idempotency key.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "trial_emails_sent" jsonb DEFAULT
    '{"ending_tomorrow": null}'::jsonb;
