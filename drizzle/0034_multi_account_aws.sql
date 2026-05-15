-- Multi-account AWS support for Scale-tier organizations.
-- Allows connecting multiple AWS accounts per org.

-- 1. Add account_label column for human-readable names (e.g. "Production", "Staging")
ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "account_label" text;

-- 2. The existing unique constraint on (org_id, product) prevents multiple AWS
-- integrations per org. We need to drop it and replace with a constraint that
-- allows multiple AWS integrations but still prevents duplicate account IDs.
-- Note: The constraint may have been dropped in migration 0029 already.
-- We use IF EXISTS to be safe.
ALTER TABLE "integrations"
  DROP CONSTRAINT IF EXISTS "integrations_org_id_product_unique";

-- 3. Add a unique constraint that prevents the same AWS account from being
-- connected twice to the same org for the same product.
-- metadata->>'accountId' is set during connection validation.
-- We use a partial unique index instead of a table constraint for flexibility.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integrations_org_product_account"
  ON "integrations"("org_id", "product", (metadata->>'accountId'))
  WHERE "type" = 'aws' AND "status" = 'connected';

-- 4. For non-AWS integrations (GitHub, Okta, Google Workspace), keep the
-- one-per-org-per-type behavior via a separate partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integrations_org_type_non_aws"
  ON "integrations"("org_id", "type")
  WHERE "type" != 'aws' AND "status" != 'disconnected';
