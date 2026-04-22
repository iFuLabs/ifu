# CLAUDE.md — Critical Bug Fixes

## Current task
Critical bug fixes — auth, payment redirect, email copy, input visibility

## Status
- Bug 1 Input visibility — ✅ FIXED
- Bug 2 Payment redirect — ✅ FIXED
- Bug 3 Portal to dashboard — ✅ FIXED
- Bug 4 Email trial copy — ✅ FIXED
- Bug 5 Orange gradient boxes — ✅ FIXED
- Bug 6 AWS Account ID — ✅ FIXED

## Root causes found

### Bug 1 — Sign up input fields invisible when typing
**Root cause:** Input fields change background to `white` on focus but text color stays `#F5F5F5` (light gray). White text on white background = invisible.

**Location:** `portal/src/app/onboarding/page.tsx` - all input fields in sign up form (name, email, password, org name, org domain, role ARN)

**Fix:** Added `e.target.style.color = '#0B0C0F'` on focus and `e.target.style.color = '#F5F5F5'` on blur to all input fields. Now text is dark when typing (on white background) and light when not focused (on dark background).

### Bug 2 — After payment redirects to sign in instead of dashboard
**Root cause:** Payment callback page redirected directly to dashboard URLs (different domains/ports). The `auth_token` is stored in portal's localStorage, which is NOT accessible to comply/finops apps because localStorage is domain-specific. When the dashboard apps try to authenticate, they can't find the token and redirect to login.

**Location:** 
- `portal/src/app/billing/callback/page.tsx` - payment verification and redirect logic
- `portal/src/app/onboarding/page.tsx` - handleFinish function

**Fix:** 
1. Changed callback page to redirect back to onboarding step 4 (confirmation) instead of directly to dashboard
2. Updated handleFinish to read product from localStorage (set by callback) as primary source, with selectedProducts state as fallback
3. This keeps the user in the portal domain where their auth_token is accessible, then redirects to the correct dashboard

### Bug 3 — After login, clicking subscribed service returns to login page
**Root cause:** Login page was trying to redirect directly to product dashboards based on `response.lastProduct`, but the login API doesn't return that field. This caused it to fall through to `router.push('/')` which should work, but the real issue is the same as Bug 2 - localStorage domain isolation. When redirecting from portal to comply/finops, the auth_token isn't accessible.

**Location:** 
- `portal/src/app/login/page.tsx` - login redirect logic

**Fix:** 
1. Simplified login to always redirect to portal homepage (`/`)
2. Portal homepage fetches user subscriptions via `/api/v1/auth/me` which includes active subscriptions
3. User clicks on their subscribed product, which redirects to the dashboard
4. This is the same flow as after onboarding - keeps user in portal domain where auth_token is accessible

### Bug 4 — Email says 14 days trial, should be 3 days
**Root cause:** Welcome email template had hardcoded "14-day free trial" text. Test file also had 14 days constant.

**Location:** 
- `src/services/email.js` - welcome email template
- `tests/routes/billing.test.js` - test constant

**Fix:** Changed "14-day free trial" to "3-day free trial" in email template. Updated test constant from 14 days to 3 days. Onboarding page already correctly shows 3-day trial.

## Files changed

### Bug 1
- `portal/src/app/onboarding/page.tsx` - Fixed 6 input fields (name, email, password, org name, org domain, role ARN) to change text color on focus/blur

### Bug 2
- `portal/src/app/billing/callback/page.tsx` - Changed redirect from dashboard URLs to onboarding step 4, store product in localStorage, updated message to say "Redirecting to confirmation..."
- `portal/src/app/onboarding/page.tsx` - Updated handleFinish to read product from localStorage first, then fallback to state; removed orange box from header logo

### Bug 3
- `portal/src/app/login/page.tsx` - Simplified redirect to always go to portal homepage where user can see and click their subscribed products

### Bug 4
- `src/services/email.js` - Changed "14-day free trial" to "3-day free trial" in welcome email
- `tests/routes/billing.test.js` - Updated TRIAL_DURATION_MS constant from 14 days to 3 days

## Todo
None - all bugs fixed!

## Notes
**Token passing solution:** To solve the localStorage domain isolation issue (portal, comply, and finops are on different ports/domains), we pass the auth_token via URL query parameter when redirecting from portal to dashboards. The dashboard layouts read the token from URL, store it in their own localStorage, then remove it from the URL for security. This allows seamless authentication across all apps.
