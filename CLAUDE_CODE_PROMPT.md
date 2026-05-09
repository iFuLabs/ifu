# Claude Code Prompt — Launch Ghara by iFU Labs

> Paste everything below into Claude Code at the iFU Labs repo root. Read `CLAUDE.md` first; it contains the full product context. This prompt is **scoped, phased, and gated** — do **NOT** run all phases at once. Stop at every `--- PHASE GATE ---` and wait for explicit human approval before continuing.

---

## What we are building

We are merging the existing **Comply** and **FinOps** products into one unified SaaS product called **Ghara**, branded as **"Ghara by iFU Labs."**

- **iFU Labs** stays as the parent consultancy brand. The existing `website/` directory will be slimmed down to be the consultancy's site (advisory work, contact, case studies).
- **Ghara** is a new, standalone, customer-facing product brand. New marketing site, new logo, its own pricing page, its own dashboard.
- Internally, the Comply and FinOps engines remain. They are **renamed to "Compliance" and "Cost" inside Ghara**. Customers never see the words "Comply" or "FinOps" in product copy, marketing, or the UI.
- Customers buy **one product (Ghara)** at one of three tiers. They do NOT buy "Comply" or "FinOps" separately anymore. Existing customers are grandfathered (see migration notes below).
- We are also adding **Kubernetes cost visibility** to the cost engine so Ghara covers AWS spend AND K8s spend.

## Operating rules

1. **Create a new branch first:** `git checkout -b ghara-launch` from the current default branch. All work in this prompt happens on that branch. Do not push to `main`/`master`.
2. **Stop at every `--- PHASE GATE ---`** and wait for explicit approval. No exceptions.
3. **Never raise prices on existing customers.** Anyone currently subscribed to Comply or FinOps gets grandfathered onto Ghara at their existing price for as long as they remain subscribed.
4. **Run lint + typecheck after every file change.** Use whatever the repo configures (`npm run lint`, `npm run typecheck`, `npm run build`). If a check fails, fix before moving on.
5. **Show migration SQL before running any migration.** Wait for human approval.
6. **Keep PRs / commits small.** One logical change per commit. Commit messages should reference the phase number (e.g., `phase 2: add ghara plan SKUs`).
7. **Use existing patterns.** Plan middleware, BullMQ workers, email service, Slack service, webhooks, AWS connector — all exist. Do not reinvent.
8. **If the codebase contradicts this prompt, STOP and report.** CLAUDE.md is the source of truth. Surface discrepancies; don't paper over them.
9. **Update `CLAUDE.md` after each phase** with a "Ghara launch progress" section noting what was completed.

## Existing infrastructure (do not rebuild)

- Subscriptions table with per-product plans: `drizzle/0009_*.sql`
- Plan gating middleware: `src/middleware/plan.js` (returns `PLAN_UPGRADE_REQUIRED`)
- AWS connector: `src/connectors/aws/checks/*` (Compliance) + `src/connectors/finops/checks.js` (Cost) — same IAM role
- BullMQ workers: `src/jobs/{scanWorker,finopsWorker,notificationWorker,webhookWorker}.js`, `queues.js`, `scheduler.js`
- Email: `src/services/email.js`
- Slack: `src/services/slack.js` + `src/routes/slack.js`
- Webhooks: `src/services/webhooks.js` + `src/routes/webhooks.js`
- Billing: Paystack (`src/services/billing.js` — verify path)
- Apps: `comply/src/app/dashboard/*`, `finops/src/app/dashboard/*`, `portal/src/app/*`, `website/src/app/*`
- AI: Bedrock (Claude 3 Haiku) + Anthropic API; 24h Redis caching pattern in `src/services/{ai,finops-ai}.js`
- PDF generation: `src/services/pdf/evidenceReport.js`

## Pricing (the model we are building)

Three tiers, priced primarily by AWS spend, with feature unlocks at Growth+:

| Tier | Price | AWS spend cap | What's included |
|---|---|---|---|
| **Starter** | $499/mo | up to $10k/mo AWS spend | SOC 2 framework, basic cost waste detection, weekly scans, 1 AWS account, email support |
| **Growth** | $1,299/mo | up to $100k/mo AWS spend | All frameworks (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS), AI evidence remediation, vendor risk, anomaly detection, custom date ranges, K8s cost, Slack integration, drift alerts, daily scans, CSV/JSON export |
| **Scale** | Talk to us | Unlimited | Custom frameworks, multi-account AWS, SSO/SAML, auditor read-only role, dedicated CSM, priority support, FOCUS export |

Trial: **7-day free trial** on the Growth tier (full feature access). No credit card required at signup. Card collected at trial end if they convert.

Enterprise / Scale tier customers get a guided demo (no trial — sales-led).

---

## Phase 0 — Discovery + branch setup (read-only)

1. `git checkout -b ghara-launch` from current default branch.
2. Confirm the file paths in "Existing infrastructure" actually exist; flag anything missing.
3. Report on:
   - Exact `subscriptions` table shape (columns, plan IDs in use today)
   - How `src/middleware/plan.js` resolves entitlements (per-product? per-plan?)
   - Where AWS integration is configured today (Comply page? FinOps page? both? portal?)
   - Whether `comply/src/app/dashboard/layout.tsx` and `finops/src/app/dashboard/layout.tsx` share components
   - Current pricing pages on `website/src/app/`
   - Existing Paystack plan codes (in code/config)
   - Whether Comply and FinOps have any cross-imports today
   - The shape of `portal/src/app/onboarding/page.tsx` (referenced in CLAUDE.md as 1,436 lines)
4. **Output the report in chat. No code changes. Wait for approval.**

--- PHASE GATE 0 ---

## Phase 1 — Create the Ghara product app shell

We're consolidating Comply + FinOps + Portal into one new Next.js app called `ghara/`.

1. **Create `ghara/` workspace** at the repo root, mirroring the Next.js setup of the existing portal.
   - Copy package.json scaffolding, tsconfig, Tailwind config, etc. from `portal/`.
   - Use the same auth/session library the existing apps use (probably NextAuth or Auth0 — confirm during Phase 0).
2. **Brand placeholder for Ghara:**
   - Add a `ghara/public/brand/` folder for Ghara assets.
   - Use placeholder logo (text wordmark "Ghara") and a placeholder palette: a clean modern palette distinct from iFU Labs' plum/lavender. Suggested defaults: deep teal `#0D4F4C` as primary, warm gold `#E8B547` as accent, white background, slate text. (Designer can swap later — set CSS vars so swap is one file.)
   - Add a small "by iFU Labs" wordmark in the footer/header that links to the iFU Labs consultancy site.
3. **Set up routing skeleton in `ghara/src/app/`:**
   - `/` — redirects to `/dashboard` if signed in, else `/login`
   - `/login`, `/signup`, `/forgot-password`, `/reset-password/[token]`, `/invite/[token]` — auth pages (port from `portal/`)
   - `/onboarding` — new unified onboarding flow (built in Phase 5)
   - `/dashboard` — unified dashboard (built in Phase 4)
   - `/compliance` — drilldown into compliance findings (port from `comply/src/app/dashboard/`)
   - `/cost` — drilldown into cost findings (port from `finops/src/app/dashboard/`)
   - `/integrations`, `/integrations/aws`, `/integrations/github`, `/integrations/kubernetes` — unified integrations
   - `/team` — single team management page
   - `/billing` — single billing page
   - `/notifications` — Slack + email preferences
   - `/account` — account settings
4. **Do NOT delete `comply/`, `finops/`, or `portal/` yet.** Keep them running while Ghara is built. They'll be retired in Phase 9.
5. **Wire `ghara/` to the same backend** at `src/routes/*`. The new app talks to the existing API, not a new one.

**Acceptance:** `ghara/` builds and runs (`npm run dev` in `ghara/` workspace). Login page works against existing auth. Empty pages exist for all routes above. Branch `ghara-launch` has commits for this phase.

--- PHASE GATE 1 ---

## Phase 2 — Backend: Ghara plan SKUs + entitlement middleware

1. **Migration `drizzle/0014_add_ghara_plans.sql`:**
   - Add new plan codes: `ghara_starter`, `ghara_growth`, `ghara_scale`, `ghara_growth_trial`
   - Add a `products` JSONB column to `subscriptions` (default `'[]'`); backfill existing rows: Comply subs get `'["compliance"]'`, FinOps subs get `'["cost"]'`.
   - Ghara plans set `products = '["compliance", "cost"]'`.
   - Show the migration SQL, **wait for approval before running.**
2. **Update `src/middleware/plan.js`:**
   - Add `productEntitlements(orgId)` helper returning `{ compliance: 'starter|growth|scale|null', cost: 'starter|growth|scale|null' }`.
   - A `ghara_growth` subscription returns `{ compliance: 'growth', cost: 'growth' }`.
   - Existing per-product subscriptions keep working (Comply Growth → `{ compliance: 'growth', cost: null }`).
   - Add unit tests if a test framework exists.
3. **Paystack plan codes:**
   - Add Ghara plan code constants in `src/services/billing.js`.
   - Output a checklist of plans to create manually in the Paystack dashboard (don't create from code):
     - `ghara_starter` — $499/mo
     - `ghara_growth` — $1,299/mo
     - (Trial doesn't need a Paystack plan — it's tracked internally; card is captured only on conversion.)
4. **Trial tracking:**
   - Migration `drizzle/0015_add_trials.sql`: add `trials` table (`org_id`, `started_at`, `expires_at`, `tier`, `converted_at`, `card_captured_at`).
   - Or, if `subscriptions` table can support trial state via a `status` enum (`trialing|active|past_due|canceled`), use that — simpler. Pick the cleaner option and explain the choice.
5. **Trial-end gating:** Plan middleware should treat an expired trial as `null` entitlements (read-only mode in Phase 6).

**Acceptance:** Migration runs and is reversible. A user on `ghara_growth` gets full entitlements for both engines. Existing subs untouched. No customer's plan or price changed.

--- PHASE GATE 2 ---

## Phase 3 — Unified AWS integration + Kubernetes cost (new)

### 3a. Lift AWS to the org level
1. **Single AWS integration page** at `ghara/src/app/integrations/aws/page.tsx`.
   - Owns IAM role, external ID, account ID, region.
   - Both compliance and cost engines read from this one row.
2. **CloudFormation Quick Launch:** add a "Launch in AWS Console" button that opens a pre-filled CloudFormation stack URL with the IAM role template + external ID. This is the **default** connection method.
3. **Verify path:** when the role ARN is pasted back, validate server-side; show a specific error if any required permission is missing (test for `ce:GetCostAndUsage`, `iam:Get*`, `s3:Get*`, `cloudtrail:Describe*`, `guardduty:Get*`, `eks:List*`, etc.).
4. **Migration `drizzle/0016_consolidate_aws_integrations.sql`:** if AWS integration is currently scoped per-product, consolidate to one row per `org_id`. Show SQL, wait for approval.

### 3b. Kubernetes cost engine (NEW)
This is the cost engine's first non-AWS data source. We're using **OpenCost** as the K8s cost source — it's open source, vendor-neutral, works on EKS/GKE/AKS/self-managed.

1. **New connector** at `src/connectors/kubernetes/opencost.js`:
   - Pulls cost allocation data from a customer's OpenCost endpoint (Prometheus-style API)
   - Returns: cost per namespace, cost per workload, idle pods, oversized requests, unused PVCs, idle nodes
2. **New integration page** at `ghara/src/app/integrations/kubernetes/page.tsx`:
   - Two connection modes:
     - **OpenCost endpoint** (primary): customer pastes their OpenCost API URL + a bearer token. We give them a copy-paste `kubectl apply` command and `helm install` snippet to deploy OpenCost into their cluster if they don't have it.
     - **AWS EKS Container Insights** (fallback): if they're on EKS, we can read cost data from CloudWatch Container Insights via the existing AWS connection. Less granular but zero extra setup.
3. **New migration `drizzle/0017_add_kubernetes_integrations.sql`** with `kubernetes_integrations` table (`org_id`, `connection_type`, `endpoint_url`, `encrypted_token`, `cluster_name`, `last_synced_at`).
4. **Extend `finopsWorker.js`** to include K8s scans alongside AWS scans when a K8s integration exists.
5. **K8s findings types:** idle namespaces, idle workloads (no traffic), oversized requests vs actual usage, unused PVCs, abandoned namespaces (no recent activity).
6. **Gate behind Growth+ tier** (per pricing table).
7. **Add to CLAUDE.md** under "Cost engine features": Kubernetes cost via OpenCost (Growth tier).

**Acceptance:** AWS integration is consolidated, CloudFormation Quick Launch works in a real AWS account, K8s integration page renders, OpenCost connector pulls a sample from a test cluster, K8s findings appear in the unified action queue (built in Phase 4).

--- PHASE GATE 3 ---

## Phase 4 — Unified dashboard (the main customer experience)

Build the single dashboard that *is* Ghara. This is the most important UX phase.

1. **`ghara/src/app/dashboard/page.tsx`** is the new home screen. Replaces both Comply and FinOps dashboards as the primary view.
2. **Cloud Health Score** at the top:
   - Composite score 0–100, prominent.
   - Computed in new service `src/services/healthScore.js`:
     - Compliance posture (% of controls passing, weighted)
     - Cost efficiency (1 - waste/total spend, capped)
     - Security posture (high/critical findings count, inverted)
   - Pick a defensible weighting (e.g., 40% compliance, 30% cost, 30% security). Document it.
   - Show trend vs. last week (↑/↓).
3. **Top KPIs row:**
   - "SOC 2 readiness: 73%"
   - "Detected savings: $1,247/mo"
   - "Open findings: 22"
   - "Last scan: 2 hours ago"
4. **Unified Action Queue** (the killer feature):
   - One ranked list of findings from BOTH engines, sorted by impact score.
   - Each row: severity badge, title, type tag (Compliance / Cost / Security / Both), dollar value (if cost), framework affected (if compliance), "Fix" CTA.
   - Filters: All / Compliance / Cost / Security. Default: All.
   - Pagination or infinite scroll for >50 findings.
5. **Sidebar nav:** Dashboard / Compliance / Cost / Integrations / Team / Billing / Notifications / Settings. The Compliance and Cost links route to the existing detailed views (drilldowns).
6. **Drilldown views** (`/compliance`, `/cost`):
   - Port the existing dashboards from `comply/` and `finops/` into Ghara routes.
   - Keep all existing functionality (control scores, evidence, vendor risk, waste detection, rightsizing, anomaly detection, recommendation states from F6, etc.).
   - Restyle to Ghara brand.
7. **Cross-product crossover findings:**
   - When a finding affects both engines (e.g., GuardDuty disabled = SOC 2 fail + cost anomaly), tag it `Both` and show in both drilldowns.

**Acceptance:** A logged-in test user with Ghara Growth and connected AWS sees the full unified dashboard, action queue is populated from real scan data, drilldowns work, all existing features still function.

--- PHASE GATE 4 ---

## Phase 5 — Onboarding flow (7-day trial activation)

This is the trial-conversion engine. Get the customer from signup to "wow" in under 10 minutes.

1. **Signup** at `ghara/src/app/signup/page.tsx`:
   - Fields: email, password (or Google SSO), company name, role dropdown (CTO / Engineering / Compliance / Founder / Other).
   - **No credit card.** Trial is 7 days, full Growth tier features.
   - Email verification flow (port from existing portal).
2. **Onboarding wizard** at `ghara/src/app/onboarding/page.tsx`:
   - Step 1: Welcome screen — single CTA "Connect AWS →"
   - Step 2: AWS connection — CloudFormation Quick Launch (default), Terraform option, manual fallback. Real-time validation. Specific errors if permissions missing.
   - Step 3: First scan in progress — real-time SSE progress (existing infrastructure). Show findings streaming in by category. Should feel alive.
   - Step 4: Activation screen — the "wow" moment:
     > Here's what we found in your AWS account.
     > - SOC 2 readiness: 67%
     > - Critical compliance gaps: 8
     > - Cost waste detected: $1,247/month
     > - Security findings: 14
     > [Show me the details →]
   - Step 5: Lands on `/dashboard` with a dismissible setup checklist in the corner (connect GitHub, invite team, set up Slack, schedule daily scans, optional K8s connection).
3. **Trial countdown banner** in the header: "X days left in your free trial. [Upgrade →]"
4. **Trial email drip** in `src/services/email.js`:
   - Day 0 (signup): Welcome + scan results summary
   - Day 1: Quick tips
   - Day 3: First "drift" check email if anything changed in their AWS
   - Day 5: Mid-trial summary with savings + compliance progress
   - Day 6: Trial ending tomorrow + upgrade CTA
   - Day 7: Trial ended, account read-only, upgrade CTA
5. **Trial-end behavior:**
   - At expiry, account moves to **read-only mode**: dashboard accessible, scans paused, no new findings, alerts paused.
   - Customer can still view their data and historical findings; they just can't continue actively using the product without upgrading.
   - No data deletion. Reactivation is one-click.
6. **Demo path for Scale-tier prospects:** "Talk to us" CTA collects info into a `demo_requests` table and sends a notification to a hardcoded internal email or Slack channel. No automated demo provisioning yet — humans handle.

**Acceptance:** Full signup-to-activation flow works end-to-end in <10 minutes. Trial expires correctly at 7 days. Drip emails fire on schedule. Trial-end read-only mode behaves correctly.

--- PHASE GATE 5 ---

## Phase 6 — Billing, trial conversion, grandfathering

1. **`ghara/src/app/billing/page.tsx`** — single billing surface:
   - Shows current tier (Starter / Growth / Scale / Trial)
   - Current trial status with countdown if applicable
   - Upgrade flow: pick tier → Paystack card collection → subscription activated
   - Plan change flow (upgrade/downgrade between Starter and Growth)
   - Cancel / pause flow
2. **Trial → paid conversion:**
   - In-app upgrade button anywhere "trial expires in X days" appears
   - Paystack subscription started immediately at conversion (not at trial end if upgrading early)
   - Customer keeps full access uninterrupted
3. **Grandfather existing customers (CRITICAL):**
   - Migration script `scripts/migrate_legacy_to_ghara.js`:
     - For each org with an existing Comply or FinOps subscription, create a "legacy" tag on the subscription.
     - Map their existing plan to Ghara entitlements: Comply Growth → compliance=growth (cost=null unless they also have FinOps), FinOps Growth → cost=growth (compliance=null unless they also have Comply).
     - Both products → grandfathered Ghara Growth at the SUM of their existing prices (do NOT change their bill).
     - One product only → grandfathered with that engine's entitlements at their existing price.
   - Send all existing customers an email: "We've combined Comply and FinOps into one product called Ghara. Your subscription, features, and price stay the same. Here's what's new."
   - Add a one-time founder-discount upgrade offer for single-product legacy customers: "Add the other engine for $X/mo extra (50% off normal)" valid for 30 days.
4. **Audit log:** every plan change, trial start/end, grandfathering action gets logged in the existing audit log table.

**Acceptance:** Existing customers experience zero disruption to their bill or features. New customers can sign up, trial, and convert end-to-end. Audit log shows the migration cleanly.

--- PHASE GATE 6 ---

## Phase 7 — Marketing site for Ghara (new) + slim down iFU Labs site

### 7a. New Ghara marketing site
Create `ghara-marketing/` (or whatever name fits the workspace convention) — a new Next.js site. Domain to be decided (suggest `ghara.cloud`, `ghara.io`, or similar — output suggestions in chat for human pick).

1. **Homepage:**
   - H1: "Know your AWS is in good shape."
   - Sub: "Ghara watches your cloud for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by iFU Labs."
   - Three-feature row: "Pass audits faster" / "Cut cloud waste" / "One dashboard for your CTO"
   - Social proof section (placeholder until real logos)
   - Pricing teaser → links to `/pricing`
   - "Built by iFU Labs" footer with a link to the consultancy site
2. **Pricing page (`/pricing`):**
   - Three columns: Starter $499 / Growth $1,299 / Scale "Talk to us"
   - Feature comparison table per tier
   - "Start 7-day free trial" CTA on Starter and Growth, "Talk to us" CTA on Scale
   - FAQ: trial mechanics, AWS spend tier definitions, K8s support, framework support, grandfathering
3. **Product pages:**
   - `/compliance` — what the compliance engine does, frameworks supported, evidence automation
   - `/cost` — what the cost engine does, AWS + K8s coverage, savings examples
   - `/security` — security posture features
4. **`/demo`** — demo request form (for Scale-tier sales-led prospects)
5. **`/docs`** — placeholder for now, link to `docs.ghara.[domain]` (TBD)
6. **Brand voice:** punchy, modern, founder-friendly. Different from iFU Labs' advisory tone.

### 7b. Slim down iFU Labs consultancy site
Modify the existing `website/` to be the consultancy site only:

1. Remove product-marketing pages (any references to Comply/FinOps/Ghara as products).
2. Add a small "Our product: Ghara" section/footer link.
3. Keep advisory services, case studies, contact form, brand-showcase, legal pages.
4. Adjust hero to be advisory-focused: "Cloud, compliance, and cost expertise for modern teams."

**Acceptance:** Ghara marketing site is up and reachable (deployment is a separate step — for now `npm run build` succeeding is enough). iFU Labs site no longer markets the products as separate things. Cross-links between the two sites work.

--- PHASE GATE 7 ---

## Phase 8 — Notifications + integrations consolidation

1. **`ghara/src/app/notifications/page.tsx`** — single page for all alert preferences:
   - Slack workspace connection (port from `src/routes/slack.js`)
   - Per-event toggles: control drift, scan complete, anomaly detected, monthly summary, trial reminders
   - Per-channel routing (which Slack channel for which event)
   - Email recipients (admins by default, custom list optional)
2. **`ghara/src/app/integrations/page.tsx`** — single integrations hub showing AWS, GitHub, Kubernetes, Slack with status indicators and connect/disconnect controls.
3. **`ghara/src/app/team/page.tsx`** — single team management page (port from whichever existing one is more complete; consolidate the rest).

**Acceptance:** All notification preferences settable in one place. All integrations visible in one place. Team management is one page.

--- PHASE GATE 8 ---

## Phase 9 — Retire legacy apps

Only after Ghara is fully working and existing customers are migrated:

1. **Redirect old Comply/FinOps URLs** to the equivalent Ghara routes (`/comply/*` → `/compliance/*`, `/finops/*` → `/cost/*`).
2. **Mark `comply/` and `finops/` directories as deprecated** in the repo (README pointing to Ghara).
3. **Mark `portal/` as deprecated** (Ghara is the new portal).
4. **Do NOT delete the directories yet.** Keep for reference and rollback. Plan deletion 60 days after Ghara is in production.
5. **Update CLAUDE.md** with a "Legacy" section noting the retired apps.

**Acceptance:** All customers using Ghara. No customer-facing routes hit the old apps. Old apps still build but are clearly marked deprecated.

--- PHASE GATE 9 ---

## Phase 10 — Final CLAUDE.md update + PR

1. Update `CLAUDE.md`:
   - New "## Ghara — current product" section replacing the separate Comply / FinOps sections
   - Move retired suggestions into a "Completed in Ghara launch" section
   - Update "Pending suggestions" with what's left
   - Update the "Todo" with new priorities
2. Open a PR from `ghara-launch` to the default branch with a summary of all phases, screenshots, and grandfathering migration notes for review.

--- PHASE GATE 10 ---

---

## Things explicitly OUT of scope for this prompt

To prevent drift:
- No SSO / SAML
- No Azure / GCP support (cost engine stays AWS + K8s only)
- No monorepo restructuring beyond creating `ghara/` and `ghara-marketing/`
- No new compliance frameworks (PCI was already shipped; ISO 42001 / NIST AI RMF wait for separate approval)
- No mobile app
- No public REST API (A1 deferred)
- No Trust Center (C1 deferred)
- No new analytics tooling — instrument trial activation events with whatever analytics service exists today

If any of these become blocking, STOP and surface it.

---

## Final note for Claude Code

If at any point the codebase reality contradicts this prompt — file paths, schema, integration state — STOP and report. CLAUDE.md is the source of truth. Smaller commits are better than larger ones. When in doubt, do less and ask.

Begin with Phase 0.
