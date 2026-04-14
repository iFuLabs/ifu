-- Replace Stripe columns with Paystack columns on organizations table
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stripe_customer_id";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stripe_subscription_id";

ALTER TABLE "organizations" ADD COLUMN "paystack_customer_code" TEXT;
ALTER TABLE "organizations" ADD COLUMN "paystack_subscription_code" TEXT;
ALTER TABLE "organizations" ADD COLUMN "paystack_auth_code" TEXT;
