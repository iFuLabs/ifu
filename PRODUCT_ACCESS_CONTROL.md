# Product Access Control Implementation

## Problem
Users who sign up for iFu Comply can access iFu Costless (FinOps) and vice versa. The billing page shows incorrect subscription information because there's no product-specific access control.

## Root Causes
1. **Schema limitation**: The `plan` enum only supports single products (`starter`, `growth`, `finops`)
2. **No middleware validation**: Neither Comply nor FinOps middleware checks if the user's plan matches the product
3. **Shared billing endpoint**: The `/api/v1/billing` endpoint doesn't differentiate between products

## Solution

### Phase 1: Add Product Validation to Middleware (Quick Fix)

Update middleware in both Comply and FinOps to validate product access based on the user's plan.

**Comply middleware** should only allow:
- `plan = 'starter'` 
- `plan = 'growth'`

**FinOps middleware** should only allow:
- `plan = 'finops'`

### Phase 2: Update Schema for Multi-Product Support (Long-term)

Change the `plan` field to support multiple products:

**Option A: Array of products**
```sql
ALTER TABLE organizations 
ADD COLUMN products TEXT[] DEFAULT ARRAY['comply'];
```

**Option B: Separate subscriptions table**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  product TEXT NOT NULL, -- 'comply' | 'finops'
  plan TEXT NOT NULL, -- 'starter' | 'growth' | 'finops'
  status TEXT NOT NULL,
  paystack_subscription_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 3: Update Billing API

Add product parameter to billing endpoints:
- `GET /api/v1/billing?product=comply`
- `GET /api/v1/billing?product=finops`

## Implementation Order

1. ✅ Update Comply middleware to check plan
2. ✅ Update FinOps middleware to check plan  
3. ✅ Add product parameter to billing API
4. ✅ Update frontend billing pages to pass product
5. ⏳ Schema migration for multi-product support (future)

## Files to Update

- `comply/src/middleware.ts` - Add plan validation
- `finops/src/middleware.ts` - Add plan validation
- `src/routes/billing.js` - Add product-aware logic
- `comply/src/app/dashboard/billing/page.tsx` - Pass product=comply
- `finops/src/app/dashboard/billing/page.tsx` - Pass product=finops
