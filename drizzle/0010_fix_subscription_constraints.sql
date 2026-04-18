-- Drop the unique constraint on paystack_subscription_code
-- since multiple products might share the same Paystack subscription
ALTER TABLE "subscriptions" 
DROP CONSTRAINT IF EXISTS "subscriptions_paystack_subscription_code_unique";

-- Add unique constraint on (org_id, product) to prevent duplicate subscriptions
ALTER TABLE "subscriptions" 
ADD CONSTRAINT "subscriptions_org_id_product_unique" UNIQUE("org_id", "product");
