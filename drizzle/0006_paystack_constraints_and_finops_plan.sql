-- Add 'finops' as a valid value for the plan enum
ALTER TYPE "public"."plan" ADD VALUE IF NOT EXISTS 'finops';--> statement-breakpoint

-- Enforce uniqueness on Paystack customer & subscription codes so the same
-- code cannot be associated with multiple organizations.
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_paystack_customer_code_unique" UNIQUE ("paystack_customer_code");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_paystack_subscription_code_unique" UNIQUE ("paystack_subscription_code");
