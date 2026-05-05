-- Comply and FinOps each require their own AWS IAM role with their own policy
-- (Comply uses SecurityAudit; FinOps uses ViewOnlyAccess + Cost Explorer inline).
-- Before this column existed, both products' frontends posted to the same
-- /integrations/aws endpoint, which upserted on (org_id, type='aws'). The
-- second connect silently overwrote the first.
--
-- This migration adds a `product` column so each product gets its own row.
-- All existing aws rows are backfilled to product='comply' (the original
-- product). Any FinOps customer who connected before this migration ran will
-- need to reconnect via the FinOps app to create a fresh (aws, finops) row.

ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "product" text NOT NULL DEFAULT 'comply';

-- Heuristic backfill: orgs that subscribe to FinOps but NOT Comply almost
-- certainly used their existing aws row for FinOps, so flip those rows to
-- product='finops'. Orgs that have both (or have only Comply) keep the
-- 'comply' default.
UPDATE "integrations" i
   SET "product" = 'finops'
 WHERE i."type" = 'aws'
   AND EXISTS (
     SELECT 1 FROM "subscriptions" s
      WHERE s."org_id" = i."org_id"
        AND s."product" = 'finops'
        AND s."status" IN ('active', 'trialing')
   )
   AND NOT EXISTS (
     SELECT 1 FROM "subscriptions" s2
      WHERE s2."org_id" = i."org_id"
        AND s2."product" = 'comply'
        AND s2."status" IN ('active', 'trialing')
   );

-- The new uniqueness key. Two rows with the same (org_id, type) are now valid
-- as long as their product differs. We use a partial index so a soft-deleted
-- row doesn't block a fresh reconnect.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_integrations_org_type_product_active"
  ON "integrations" ("org_id", "type", "product")
  WHERE "disconnected_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_integrations_product"
  ON "integrations" ("product");
