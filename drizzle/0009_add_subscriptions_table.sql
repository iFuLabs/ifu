-- Create subscriptions table for multi-product support
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product" text NOT NULL,
	"plan" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"paystack_subscription_code" text,
	"paystack_plan_code" text,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_paystack_subscription_code_unique" UNIQUE("paystack_subscription_code")
);

-- Add foreign key
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_subscriptions_org_id" ON "subscriptions" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_org_product" ON "subscriptions" ("org_id","product");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" ("status");

-- Migrate existing subscriptions from organizations table
-- Only migrate if there's an active subscription
INSERT INTO "subscriptions" ("org_id", "product", "plan", "status", "paystack_subscription_code", "trial_ends_at", "created_at", "updated_at")
SELECT 
  "id" as "org_id",
  CASE 
    WHEN "plan" = 'finops' THEN 'finops'
    ELSE 'comply'
  END as "product",
  "plan",
  CASE 
    WHEN "paystack_subscription_code" IS NOT NULL THEN 'active'
    WHEN "trial_ends_at" > NOW() THEN 'trialing'
    ELSE 'expired'
  END as "status",
  "paystack_subscription_code",
  "trial_ends_at",
  "created_at",
  "updated_at"
FROM "organizations"
WHERE "plan" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Note: We keep the plan column in organizations for backward compatibility
-- but new code should use the subscriptions table
