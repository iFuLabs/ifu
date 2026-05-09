-- Phase 2: Add Ghara unified plan SKUs and product entitlements
--
-- New plan codes: ghara_starter, ghara_growth, ghara_scale, ghara_growth_trial
-- Ghara plans grant access to BOTH compliance and cost engines.
-- Existing per-product subscriptions continue working unchanged.

-- 1. Add a 'products' JSONB column to track which engines a subscription grants.
-- Default is '[]' (empty); backfill below sets correct values for existing rows.
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "products" jsonb DEFAULT '[]'::jsonb;

-- 2. Backfill existing subscriptions:
--    - Comply subs → ["compliance"]
--    - FinOps subs → ["cost"]
UPDATE "subscriptions"
SET "products" = '["compliance"]'::jsonb
WHERE "product" = 'comply' AND ("products" IS NULL OR "products" = '[]'::jsonb);

UPDATE "subscriptions"
SET "products" = '["cost"]'::jsonb
WHERE "product" = 'finops' AND ("products" IS NULL OR "products" = '[]'::jsonb);

-- 3. Add a 'tier' column to normalize plan tiers across old and new plans.
-- Old plans stored 'starter', 'growth', 'finops' in the plan column.
-- New Ghara plans will store 'ghara_starter', 'ghara_growth', 'ghara_scale'.
-- The tier column normalizes to: starter | growth | scale
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "tier" text;

-- Backfill tier from existing plan values
UPDATE "subscriptions" SET "tier" = 'starter' WHERE "plan" IN ('starter', 'ghara_starter');
UPDATE "subscriptions" SET "tier" = 'growth' WHERE "plan" IN ('growth', 'finops', 'ghara_growth', 'ghara_growth_trial');
UPDATE "subscriptions" SET "tier" = 'scale' WHERE "plan" IN ('ghara_scale');

-- 4. Add a 'legacy' boolean flag for grandfathered customers (Phase 6 migration script)
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "legacy" boolean DEFAULT false;

-- 5. Update the trial_ends_at handling: Ghara trials are 7 days (config change, not schema).
-- No schema change needed — trial_ends_at already exists.

-- 6. Drop the unique constraint on (org_id, product) since Ghara subscriptions
-- use product='ghara' which covers both engines. We'll add a new constraint.
ALTER TABLE "subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_org_id_product_unique";

-- Add a new unique constraint that allows one active subscription per org per product
-- (but now 'ghara' is a valid product value alongside 'comply' and 'finops')
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_org_id_product_unique" UNIQUE("org_id", "product");
