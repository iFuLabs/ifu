-- F-A5: Extend recommendation states with dismissal support
-- Add 'dismissed' to the recommendation_state enum
ALTER TYPE recommendation_state ADD VALUE IF NOT EXISTS 'dismissed';

-- Add dismissal columns
ALTER TABLE finops_recommendation_states
  ADD COLUMN IF NOT EXISTS dismissal_reason text,
  ADD COLUMN IF NOT EXISTS dismissal_note text,
  ADD COLUMN IF NOT EXISTS first_detected_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS applied_verified_at timestamp,
  ADD COLUMN IF NOT EXISTS last_verified_status text,
  ADD COLUMN IF NOT EXISTS verified_savings_monthly numeric(12,2);
