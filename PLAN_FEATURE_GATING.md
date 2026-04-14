# Plan Feature Gating Implementation

## Overview
Implemented proper plan-based feature restrictions so Growth plan ($799/mo) users get differentiated features from Starter plan ($299/mo) users.

## Plan Features

### Starter Plan ($299/mo)
- ✅ SOC 2 framework only
- ✅ SOC 2 PDF evidence export
- ❌ No AI features (gap explanations, insights)
- ❌ No ISO 27001, GDPR, HIPAA frameworks
- ❌ No ISO 27001, GDPR, HIPAA PDF exports
- ❌ No regulatory change alerts
- ⚠️ Limited to 3 team members

### Growth Plan ($799/mo)
- ✅ All frameworks: SOC 2, ISO 27001, GDPR, HIPAA
- ✅ PDF exports for all frameworks
- ✅ AI gap explanations for failing controls
- ✅ AI compliance insights on dashboard
- ✅ Regulatory change alerts (placeholder for future)
- ✅ Unlimited team members

## Backend Implementation

### 1. Plan Middleware (`src/middleware/plan.js`)
- `PLAN_FEATURES` - Configuration object defining features per plan
- `requireAiFeatures()` - Middleware to gate AI endpoints
- `getAllowedFrameworks()` - Get frameworks for a plan
- `getMaxTeamMembers()` - Get team member limit for a plan

### 2. API Route Updates

#### AI Routes (`src/routes/ai.js`)
- Added `requireAiFeatures` middleware to all AI endpoints
- Returns 403 with upgrade message for Starter users

#### Controls Routes (`src/routes/controls.js`)
- Filters control definitions to only allowed frameworks
- Returns 403 when requesting locked frameworks
- Score endpoint only shows allowed frameworks

#### Team Routes (`src/routes/team.js`)
- Checks team member count before allowing invitations
- Returns 403 with upgrade message when limit reached

#### Evidence Routes (`src/routes/evidence.js`)
- PDF export checks framework access before generating
- Returns 403 for locked frameworks (ISO 27001, GDPR, HIPAA on Starter)

#### Plan Routes (`src/routes/plan.js`) - NEW
- `GET /api/v1/plan/features` - Get current plan features and usage
- `GET /api/v1/plan/check/:feature` - Check specific feature availability

### 3. Server Registration (`src/index.js`)
- Registered plan routes at `/api/v1/plan`

## Frontend Implementation

### 1. API Client (`comply/src/lib/api.ts`)
- Added `PlanFeatures` interface
- Added `api.plan.features()` and `api.plan.check()` methods

### 2. Dashboard (`comply/src/app/dashboard/page.tsx`)
- Fetches plan features on load
- Shows locked framework cards with upgrade CTA
- Locked frameworks display lock icon and "Growth plan required"

### 3. AI Components

#### AiGapExplainer (`comply/src/components/AiGapExplainer.tsx`)
- Detects `PLAN_UPGRADE_REQUIRED` error code
- Shows upgrade prompt instead of AI button for Starter users
- Links to billing page

#### AiInsightCard (`comply/src/components/AiInsightCard.tsx`)
- Detects plan upgrade errors
- Shows locked state with upgrade CTA
- Gracefully handles API errors

### 4. Team Page (`comply/src/app/dashboard/team/page.tsx`)
- Fetches plan features to show member limits
- Displays warning banner when limit reached
- Shows member count vs limit (e.g., "3 / 3")
- Invite errors show upgrade message

### 5. Evidence Page (`comply/src/app/dashboard/evidence/page.tsx`)
- Fetches plan features to check framework access
- Shows locked PDF export cards for unavailable frameworks
- Locked cards display lock icon and "Available on Growth plan"
- Export errors show upgrade message
- Links to billing page for upgrades

## User Experience

### Starter Plan Users See:
1. Only SOC 2 framework on dashboard
2. ISO 27001, GDPR, HIPAA cards show as locked with upgrade prompt
3. AI features show upgrade prompts instead of functionality
4. Team page shows member limit warning at 3 members
5. Evidence page: Only SOC 2 PDF export available, others locked
6. Clear upgrade CTAs linking to billing page

### Growth Plan Users See:
1. All 4 frameworks unlocked and functional
2. AI gap explanations work on failing controls
3. AI insights card on dashboard
4. No team member limits
5. All PDF exports available (SOC 2, ISO 27001, GDPR, HIPAA)
6. Full feature access

## Error Responses

All gated features return consistent error format:
```json
{
  "error": "Upgrade Required",
  "message": "Feature description is only available on the Growth plan",
  "code": "PLAN_UPGRADE_REQUIRED",
  "requiredPlan": "growth",
  "currentPlan": "starter"
}
```

## Testing

To test the implementation:

1. Create a Starter plan org and verify:
   - Only SOC 2 shows
   - AI features show upgrade prompts
   - Can only invite 2 more members (3 total)

2. Create a Growth plan org and verify:
   - All frameworks visible
   - AI features work
   - Can invite unlimited members

3. Try API calls directly:
   ```bash
   # Should fail for Starter
   curl -X POST /api/v1/ai/explain/CC6.1 -H "Cookie: auth_token=..."
   
   # Should fail for Starter
   curl /api/v1/controls?framework=iso27001 -H "Cookie: auth_token=..."
   
   # Should fail for Starter
   curl /api/v1/evidence/export/pdf?framework=iso27001 -H "Cookie: auth_token=..."
   ```

## Future Enhancements

1. Regulatory change alerts (placeholder in plan config)
2. Usage analytics per plan
3. Plan comparison page
4. In-app upgrade flow
5. Trial period handling
6. Downgrade flow with data retention
