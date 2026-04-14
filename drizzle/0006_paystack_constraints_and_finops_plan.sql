-- Add 'finops' as a valid value for the plan enum
ALTER TYPE "plan" ADD VALUE IF NOT EXISTS 'finops';

-- Enforce uniqueness on Paystack customer & subscription codes so the same
-- code cannot be associated with multiple organizations.
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_paystack_customer_code_unique"
  UNIQUE ("paystack_customer_code");

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_paystack_subscription_code_unique"
  UNIQUE ("paystack_subscription_code");
