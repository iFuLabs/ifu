# Multi-Product Support Implementation

## Overview
Implemented multi-product subscription support allowing organizations to subscribe to both iFu Comply and iFu Costless simultaneously.

## Changes Made

### 1. Database Schema
- Created new `subscriptions` table to track multiple products per organization
- Migrated existing subscriptions from `organizations.plan` to the new table
- Kept `organizations.plan` for backward compatibility

### 2. New Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  product TEXT NOT NULL, -- 'comply' | 'finops'
  plan TEXT NOT NULL, -- 'starter' | 'growth' | 'finops'
  status TEXT NOT NULL, -- 'active' | 'trialing' | 'cancelled' | 'expired'
  paystack_subscription_code TEXT UNIQUE,
  paystack_plan_code TEXT,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. New Subscription Service (`src/services/subscriptions.js`)
Helper functions for subscription management:
- `hasActiveSubscription(orgId, product)` - Check if org has active subscription
- `getActiveSubscriptions(orgId)` - Get all active subscriptions
- `getSubscription(orgId, product)` - Get specific product subscription
- `upsertSubscription(data)` - Create or update subscription
- `cancelSubscription(orgId, product)` - Cancel a subscription

### 4. Updated API Endpoints

**GET /api/v1/auth/me**
Now returns subscriptions array:
```json
{
  "user": {...},
  "organization": {...},
  "subscriptions": [
    {
      "product": "comply",
      "plan": "starter",
      "status": "active",
      "trialEndsAt": "2026-04-21T..."
    },
    {
      "product": "finops",
      "plan": "finops",
      "status": "trialing",
      "trialEndsAt": "2026-04-21T..."
    }
  ]
}
```

### 5. Updated Middleware

**Comply Middleware (`comply/src/middleware.ts`)**
- Checks `subscriptions` array for active Comply subscription
- Redirects to FinOps if user only has FinOps subscription
- Redirects to portal if no subscriptions

**FinOps Middleware (`finops/src/middleware.ts`)**
- Checks `subscriptions` array for active FinOps subscription
- Redirects to Comply if user only has Comply subscription
- Redirects to portal if no subscriptions

### 6. Updated Portal Homepage (`portal/src/app/page.tsx`)
- Checks `subscriptions` array instead of `organization.plan`
- Shows "Open Dashboard" for subscribed products
- Shows "Subscribe to..." for non-subscribed products

### 7. New Subscribe Page (`portal/src/app/subscribe/page.tsx`)
- Dedicated subscription page for logged-in users
- Shows plan options for selected product
- Skips signup/org creation steps
- Direct path to payment

## User Flow

### Scenario 1: User with Comply subscription adds FinOps
1. User clicks "iFu Costless" on portal homepage
2. Redirected to `/subscribe?product=finops`
3. Selects FinOps plan and completes payment
4. New subscription created in `subscriptions` table
5. User now has both products in their subscriptions array
6. Can access both Comply and FinOps dashboards

### Scenario 2: User with FinOps subscription adds Comply
1. User clicks "iFu Comply" on portal homepage
2. Redirected to `/subscribe?product=comply`
3. Selects Comply plan (Starter or Growth) and completes payment
4. New subscription created in `subscriptions` table
5. User now has both products
6. Can access both dashboards

### Scenario 3: User logs in with multiple subscriptions
1. Portal homepage shows both products
2. Both show "Open Dashboard" button
3. Clicking either opens the respective dashboard
4. Middleware allows access to both products

## Migration Notes

- Migration `0009_add_subscriptions_table.sql` automatically migrates existing subscriptions
- Existing organizations with `plan` set will have a subscription created
- Status is determined by:
  - `active` if `paystack_subscription_code` exists
  - `trialing` if `trial_ends_at` is in the future
  - `expired` otherwise

## Backward Compatibility

- `organizations.plan` column is kept for backward compatibility
- Old code checking `organization.plan` will still work
- New code should use the `subscriptions` array

## Next Steps (Future Enhancements)

1. Update billing routes to create subscriptions in the new table
2. Add subscription management UI (upgrade/downgrade plans)
3. Handle subscription cancellations properly
4. Add webhook handlers for Paystack subscription events
5. Create admin panel to view all subscriptions
6. Add subscription analytics and reporting

## Files Modified

- `drizzle/0009_add_subscriptions_table.sql` - New migration
- `drizzle/meta/_journal.json` - Added migration entry
- `src/db/schema.js` - Added subscriptions table schema
- `src/services/subscriptions.js` - New subscription service
- `src/routes/auth.js` - Updated /me endpoint
- `portal/src/app/page.tsx` - Updated to check subscriptions
- `portal/src/app/subscribe/page.tsx` - New subscribe page
- `comply/src/middleware.ts` - Updated product access check
- `finops/src/middleware.ts` - Updated product access check
- `MULTI_PRODUCT_IMPLEMENTATION.md` - This document
