# Claude Code Prompt — Move Ghara Trial to Card-at-Signup

> Paste this into Claude Code at the iFU Labs repo root. Read `CLAUDE.md` first. This is a phased, gated change touching marketing copy, frontend signup, backend auth + billing, and the Paystack flow. Stop at every `--- PHASE GATE ---` and wait for explicit human approval.

---

## What we are doing

We are changing Ghara's trial model from **"7-day trial, no credit card required"** to **"7-day free trial, card collected at signup, auto-charged on day 7"**.

The customer never makes a manual payment. They sign up → enter card → use the product → auto-charged on day 8 (or cancel any time during the trial with one click).

The existing `/billing/initialize` flow that charges `1000` kobo / cents for tokenization (a real charge that hits the customer's card) **must be replaced** with a Paystack subscription where the first real charge happens on `start_date = trialEndsAt`. No 10 ZAR mystery charge on the customer's statement.

## Operating rules

1. **Branch:** `git checkout -b card-at-signup` from the current default branch.
2. **Stop at every `--- PHASE GATE ---`** for human approval.
3. **Do not break existing customers.** Anyone who signed up before this change has a no-card trial — let it ride. The new flow only applies to signups created after the migration.
4. **Test against Paystack test mode first.** Never run any new Paystack subscription create against the live key until the human explicitly approves.
5. **Run `npm run lint` and `npm run typecheck`** in `ghara/` after every meaningful frontend change. Run the equivalent in `src/` for backend.
6. **Update `CLAUDE.md`** under "Ghara launch progress" after each phase.
7. **No tokenization fees on customer statements.** If Paystack requires an upfront auth charge to capture the card, refund it immediately and verify the customer never sees it on their statement. (Paystack's `transaction.initialize` with `amount: 100` kobo is the smallest valid charge; refund within seconds.)

---

## Phase 0 — Discovery (read-only, no changes)

Report:

1. The current `paystack.js` service (`src/services/paystack.js`) — what functions exist, what Paystack endpoints they call.
2. The current `/api/v1/auth/onboard` flow in `src/routes/auth.js` — exact order of operations on signup.
3. The current `/api/v1/billing/initialize` and `/api/v1/billing/verify` flow.
4. The Paystack plan codes in env: `PAYSTACK_GHARA_STARTER_PLAN`, `PAYSTACK_GHARA_GROWTH_PLAN`. Are they set in `.env.example`?
5. The current trial mechanics: where is `trialEndsAt` set, how is "expired" detected, where does the read-only mode kick in?
6. The current Paystack callback flow — is there a webhook handler, or only the redirect-back-to-app flow?
7. Confirm the `subscriptions` table has columns: `paystackSubscriptionCode`, `paystackCustomerCode`, `paystackAuthCode`, `trialEndsAt`, `status`. If any are missing, flag and we'll add a migration.
8. Confirm Paystack's API supports `subscription.create` with a `start_date` field that delays first charge. Reference: https://paystack.com/docs/api/subscription/

Output the report. **Do not change any code.** Wait for approval.

--- PHASE GATE 0 ---

## Phase 1 — Backend: Paystack subscription with start_date

Add the new "tokenize + create subscription with delayed start" flow as a new function, *alongside* the existing flow. Don't break what's there yet.

1. **`src/services/paystack.js`** — add new helper `createTrialSubscription({ email, planCode, authorizationCode, trialEndsAt })`:
   - Creates a Paystack customer (or fetches existing) for the email
   - Creates a subscription with: `customer`, `plan: planCode`, `authorization: authorizationCode`, `start_date: trialEndsAt.toISOString()`
   - Returns `{ subscriptionCode, customerCode, status }`

2. **`src/services/paystack.js`** — add helper `refundTransaction(reference)`:
   - Calls Paystack `/refund` endpoint
   - Used to reverse the tokenization charge immediately after capture

3. **Migration `drizzle/0031_add_signup_payment_tracking.sql`:**
   - Add columns to `subscriptions` table: `tokenization_reference`, `tokenization_refunded_at` (so we can audit that we actually refunded)
   - Show migration SQL, **wait for approval before running**.

4. **Add `POST /api/v1/auth/onboard-tokenize`**:
   - Accepts: `{ email, password, orgName, role, plan }` where plan is `ghara-starter` or `ghara-growth`
   - Creates user + org + Ghara trial subscription row in `subscriptions` table (status='trialing', trialEndsAt = now + 7 days)
   - Initializes a Paystack transaction for the SMALLEST valid amount (100 kobo / 100 cents)
   - Returns: `{ token, authorizationUrl, reference }` — frontend redirects to Paystack
   - The actual subscription creation (with start_date) happens after callback verification

5. **Update `GET /api/v1/billing/verify`** (or add a new `POST /api/v1/auth/complete-signup`):
   - On verify success, extract `authorization.authorization_code` from the transaction
   - Call new `refundTransaction(reference)` to reverse the 100-kobo tokenization charge
   - Call new `createTrialSubscription({ email, planCode, authorizationCode, trialEndsAt })`
   - Update the org's subscription row with `paystackSubscriptionCode`, `paystackAuthCode`, `tokenization_refunded_at`
   - Audit log entry: `signup.card_captured`

6. **Mark old `/api/v1/auth/onboard` as legacy** but keep it working — existing flows / tests shouldn't break. Add a deprecation comment.

7. **Trial entitlements always Growth, regardless of selected tier.**
   - When `createTrialSubscription` runs, the row in the `subscriptions` table stores: `tier: 'growth'` for the trial period (so the customer experiences all Growth features), AND a separate column `selectedTier: 'starter' | 'growth'` capturing what they picked at signup.
   - Migration `drizzle/0031_*` should add `selected_tier` column.
   - `productEntitlements()` returns `tier: 'growth'` while `status === 'trialing'` regardless of `selectedTier`.
   - On the Paystack `charge.success` webhook (day 8), the subscription transitions: `tier` is updated to match `selectedTier` (so a Starter signup loses Growth-only features at conversion), `status` becomes `active`.
   - Rationale: trials should showcase the best of the product. A customer who picked Starter but used AI remediation during the trial will see, on day 8, that AI remediation is now gated behind an upgrade — but they had the full week to experience it.

**Acceptance:**
- New signup flow can be tested end-to-end in Paystack test mode
- A test card runs through: tokenize → 100 kobo charged → refund issued → subscription created with future start_date → no real charge until day 8
- A trial customer who picked Starter sees all Growth features during the trial; on day 8 their entitlements drop to Starter level and any Growth-only feature shows an upgrade prompt
- Existing customers' subscriptions and billing flow unchanged

--- PHASE GATE 1 ---

## Phase 2 — Paystack webhook handler

Customer cards fail. Customers cancel via Paystack dashboard. Paystack subscriptions auto-renew. We need to know about all of this.

1. **`POST /api/v1/billing/paystack-webhook`** (no auth, but signature-verified):
   - Verify HMAC signature using `verifyWebhookSignature` from `src/services/paystack.js`
   - Handle event types:
     - `charge.success` — subscription auto-charged successfully → mark sub as `active`, log `billing.charge_success`
     - `subscription.create` — new subscription created → confirm row state
     - `subscription.disable` — subscription canceled → mark sub as `canceled`, send "your subscription was canceled" email
     - `subscription.not_renew` — subscription set to not renew at next cycle → log it
     - `invoice.payment_failed` — auto-charge failed → email customer, mark sub as `past_due`
     - `invoice.create` — invoice created for upcoming charge → no-op (could send pre-charge reminder)
   - Reply `200 OK` quickly even if internal processing fails (Paystack will retry on non-200)
   - Do all DB work in idempotent way (event_id-keyed dedupe table or upsert)

2. **Migration `drizzle/0032_add_paystack_events.sql`:**
   - `paystack_events` table: `id` (Paystack event id), `type`, `received_at`, `processed_at`, `payload jsonb`
   - Used for idempotent webhook processing
   - Show SQL, wait for approval

3. **Frontend: trial banner becomes "X days until your card is charged"** instead of "X days left in your free trial":
   - File: `ghara/src/components/TrialBanner.tsx`
   - Show charge amount and date: *"Your trial ends in 4 days — we'll charge $1,299 on May 17. [Cancel →]"*

**Acceptance:**
- Webhook URL configured in Paystack dashboard test mode
- Test events (charge.success, subscription.disable, invoice.payment_failed) trigger correct DB updates and emails
- TrialBanner shows new copy with charge amount + date
- Idempotent: replaying the same event twice doesn't double-process

--- PHASE GATE 2 ---

## Phase 3 — Frontend signup flow with card capture

Update the Ghara signup to a 2-step flow: account info → card.

1. **`ghara/src/app/signup/page.tsx`** — split into two screens:
   - Step 1 (existing): name, email, password, org name, role, plan selector (Starter $499 / Growth $1,299 / "Talk to us" for Scale)
   - Step 2 (new): card capture screen
     - "Connecting your card to start the trial"
     - Brief explainer: *"You won't be charged today. Your 7-day trial starts now and your card will be charged $1,299 on [date] unless you cancel before then."*
     - "Continue to Paystack" button → calls `/api/v1/auth/onboard-tokenize` → redirects to `authorizationUrl`
   - On successful Paystack callback → redirect to `/onboarding` (existing AWS-connect flow)
   - On Paystack cancel/abandon → return to Step 1 with state preserved

2. **`ghara/src/app/billing/callback/page.tsx`** (NEW or UPDATE):
   - Handles the Paystack redirect after card capture
   - Calls `/api/v1/auth/complete-signup?reference=...` to verify, refund tokenization, create subscription
   - On success → redirect to `/onboarding`
   - On failure → show error + back to signup card step

3. **Plan selection on the card capture screen — DEFAULT TO GROWTH:**
   - Show two side-by-side plan cards above the "Continue to Paystack" button:
     - **Growth — $1,299/mo** (pre-selected, badged "Most popular", visually emphasized with iris/plum border)
     - **Starter — $499/mo** (one-click switchable)
   - Each card shows: tier name, monthly price, AWS spend cap, 3-line feature summary, and the explicit charge date below it (*"7 days free. First charge $X on May 17."*)
   - The selected card has a visible filled-circle radio + colored border so it's unmistakable which tier the customer is signing up for
   - Scale tier is NOT shown here — replace with a small footer link: *"Need enterprise (custom frameworks, SSO, multi-account)? Talk to sales →"* linking to `/demo`
   - The submitted plan code reflects the selection: `ghara-growth` or `ghara-starter`
   - Hidden anti-pattern: do NOT use a "More plans" disclosure or behind-a-link toggle. Both options must be visible at the same time so the choice is explicit.

**Acceptance:**
- Full signup flow works end-to-end in Paystack test mode using a test card
- Tokenization charge is refunded automatically
- Customer lands on `/onboarding` with a valid Paystack subscription whose first charge is 7 days out
- Plan selection is respected end-to-end (correct plan code submitted to Paystack)

--- PHASE GATE 3 ---

## Phase 4 — Marketing copy: honest, clear, professional

The "no credit card required" copy is everywhere. Update all of it.

1. **`ghara-marketing/src/app/page.tsx`:**
   - Hero `hero-trust` line items: replace `'No credit card required'` with `'7 days free, cancel anytime'`
   - Pricing cards CTAs: keep "Start free trial" wording — it's still free for 7 days
   - Pricing card subtext: add a small line under each tier price: *"7 days free. Then $X/mo. Cancel anytime."*
   - FAQ entry "How does the 7-day trial work?" — rewrite to reflect new flow:
     > *"Sign up with your email and a credit card. We don't charge during the 7-day trial. On day 8, your card is charged the price of your selected plan ($499 or $1,299/mo). Cancel any time during the trial with one click in your dashboard — no charge."*

2. **`ghara-marketing/src/app/pricing/page.tsx`** (if it exists separately):
   - Same trial-mechanics copy update
   - Add visible "Cancel anytime" text under each tier

3. **`ghara/src/app/signup/page.tsx`:**
   - Change subline from `"7 days of full access. No credit card required."` to `"7 days free. Cancel anytime. Card required for verification — first charge on day 8."`

4. **`ghara/src/app/onboarding/page.tsx`:**
   - Welcome screen subline currently says (verify): something like `"Takes about 3 minutes."` — keep that.
   - But add a small footer line: *"Your trial started [today]. First charge: [trial end date]. Cancel any time."*

5. **Email templates in `src/services/email.js` and `src/jobs/gharaTrialDrip.js`:**
   - Welcome email: confirm card on file, note charge date, link to cancel
   - Day 6 email becomes more important: *"Heads up — your card will be charged $X tomorrow. [Cancel →] [Continue →]"*. This is now a courtesy email, not a panic email.
   - Day 7 email becomes "Your card was charged successfully" — replaces the current "trial ended" email

**Acceptance:**
- No "no credit card required" text remains anywhere in the customer-facing surface
- Charge date and amount are clear in all touchpoints (homepage, signup, dashboard, email)
- Cancel-anytime messaging visible at every step

--- PHASE GATE 4 ---

## Phase 5 — Trial-end auto-charge mechanics

The old flow ended trials by moving accounts to read-only and asking the customer to manually subscribe. With cards on file, we don't need read-only mode for the happy path — Paystack auto-charges and the customer continues seamlessly.

But card auto-charges fail (insufficient funds, expired card, fraud block, etc.). We need a safety net.

1. **Remove read-only mode for the happy path:**
   - When the trial ends and Paystack `charge.success` webhook fires → subscription becomes `active` automatically. Customer notices nothing.

2. **Card-failure path:**
   - Paystack `invoice.payment_failed` webhook → mark sub as `past_due` (NEW state)
   - `past_due` orgs: dashboard shows red banner *"We couldn't charge your card. Update your card to keep using Ghara. [Update card →]"*
   - Send email: payment failed, here's how to update card
   - Paystack retries automatically per its config (3 attempts over 7 days by default — verify in Paystack dashboard)
   - After Paystack gives up: sub becomes `canceled` → orgs go read-only

3. **Cancel-during-trial flow:**
   - Add `POST /api/v1/billing/cancel` (already exists per `api.ts:39`?) — verify it correctly:
     - Disables the Paystack subscription via `disableSubscription`
     - Updates `subscriptions.status = 'canceled'`
     - Audit log entry
   - Frontend: in `/billing` page, prominent "Cancel subscription" button during trial
   - Confirmation modal: *"Cancel your trial? You won't be charged. Your dashboard goes read-only on [trial end date]."*

4. **Trial-end transition without card on file (legacy customers):**
   - Existing customers who signed up before this change have no card on file
   - For them: keep the old read-only flow — at trial end, account goes read-only with "Add a card to continue" prompt
   - Detect by: subscription has `paystackAuthCode = null` and `trialEndsAt < now` and `status = 'trialing'`

**Acceptance:**
- New customer's trial ends → seamless transition to active paying customer (no manual upgrade)
- Card failure → past_due banner + email + Paystack retry → eventual canceled if all retries fail
- Cancel button during trial works → no charge, account goes read-only at trial end
- Legacy customers (no card) still go through old read-only-then-upgrade flow

--- PHASE GATE 5 ---

## Phase 6 — Update existing dashboard + emails for new mechanics

1. **`ghara/src/app/(app)/billing/page.tsx`:**
   - Show: current plan, trial end date, next charge amount + date, payment method (last 4 digits)
   - Cancel button (during trial: "Cancel trial — no charge")
   - Update card button (Paystack flow)
   - Plan change button (upgrade Starter → Growth)

2. **`src/services/email.js` — new email templates:**
   - `sendTrialChargeReminder({ name, orgName, amount, chargeDate, cancelUrl })` — sent day 6
   - `sendTrialChargeSuccess({ name, orgName, amount, chargeDate, dashboardUrl })` — sent on first successful charge
   - `sendCardFailedEmail({ name, orgName, retryDate, updateCardUrl })` — sent on Paystack `invoice.payment_failed`
   - `sendCancellationConfirmation({ name, orgName, accessUntil })` — sent when customer cancels

3. **Update `gharaTrialDrip.js` schedule:**
   - Day 1: Quick tips (unchanged)
   - Day 3: Drift check (unchanged)
   - Day 5: Mid-trial summary (unchanged)
   - Day 6: REPLACE with `sendTrialChargeReminder` (new)
   - Day 7: REMOVE — replaced by webhook-driven `sendTrialChargeSuccess`

**Acceptance:**
- Billing page shows clear next-charge information
- All four new email templates fire on the right events
- Day 6 email is courtesy, not panic — accurate amount and cancel link

--- PHASE GATE 6 ---

## Phase 7 — CLAUDE.md update + smoke test

1. Update `CLAUDE.md` "Ghara launch progress" with a "Card-at-signup migration (May 2026)" entry summarizing the new flow.

2. Update `CLAUDE.md` Pricing tiers table footnote: *"Trial: 7-day free, card captured at signup, auto-charged on day 8. Cancel anytime."*

3. **Smoke test checklist** (the human will execute, but document it):
   - Sign up fresh with test card → reach `/onboarding` with active trial subscription
   - Connect AWS sandbox account → see findings → verify trial banner shows "card charged on [date]"
   - Force-trigger day 6 email — verify content and link work
   - Cancel during trial — verify Paystack subscription disabled, no charge ever, read-only after trial ends
   - Let trial run to end — verify Paystack auto-charges (test mode), webhook fires, subscription becomes active, no UI disruption
   - Simulate card failure — verify past_due banner and email
   - Update card — verify new card replaces old, Paystack retries succeed

--- PHASE GATE 7 ---

---

## Things explicitly OUT of scope

- No annual billing yet (monthly only)
- No multi-currency support (Paystack ZAR/NGN/USD as already configured)
- No A/B test of card-at-signup vs no-card (we're committing to card-at-signup)
- No promo codes / discounts at signup
- No Apple Pay / Google Pay (Paystack web flow only)
- No SCA / 3D Secure handling beyond what Paystack does by default

If any of these become blocking, STOP and surface it.

---

## Important notes for Claude Code

**Paystack subscription with start_date is the right pattern.** Don't substitute a "manual cron charges customer on day 7 via charge_authorization" pattern — Paystack already handles delayed-start subscriptions natively. Use `subscription.create` with `start_date`. Verify in Paystack docs and test mode before implementing.

**The 100-kobo tokenization charge MUST be refunded.** It cannot end up on a customer's statement. The refund call should happen synchronously inside `/api/v1/auth/complete-signup` before returning success to the frontend. If the refund call fails, log loudly, alert via email/Slack, but still let the customer through (they have a real subscription with a real start_date, the refund can be retried later).

**Idempotency matters.** A customer might complete card capture, hit refresh during the callback, and trigger the verify endpoint twice. Both calls must produce the same result without creating two subscriptions. Key on the Paystack `reference`.

**Existing customer migration is not part of this prompt.** Customers who signed up before this change keep their no-card trial. The grandfathering script (`scripts/migrate_legacy_to_ghara.js`) doesn't need to do anything for this change.

Begin with Phase 0.
