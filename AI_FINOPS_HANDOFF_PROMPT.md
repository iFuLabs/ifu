# AI Handoff — FinOps Product Roadmap (detection → platform)

> **Purpose:** turn FinOps from a waste-detection script into a product clients renew. Today it finds idle resources and stops; this prompt turns it into something with allocation, trends, alerts, and accountability.
>
> **Scope:** `finops/src/app/dashboard/**`, `src/routes/finops.js`, `src/connectors/finops/**`, `src/jobs/finopsWorker.js`, plus targeted additions to `src/db/schema.js` and new files under `src/services/`.
>
> **Branch:** `brand-identity`. Don't switch.
>
> **Read first:** `CLAUDE.md`, `AI_HANDOFF_PROMPT.md`, `AI_DASHBOARD_POLISH_PROMPT.md`. This doc layers on top — when those docs and this one disagree, those win for style/conventions; this one wins for product scope.

---

## 0. Hard rules

1. **Backend is ESM JavaScript** in `src/`. Frontend in `finops/` is Next.js 14 App Router + TypeScript. Don't introduce TS into the backend.
2. **Drizzle migrations are additive, sequential.** Latest is `0013_*.sql`. Pick the next number and never edit a shipped migration.
3. **One feature per PR/commit.** Each F-task below is independent and reviewable on its own.
4. **No new clouds.** Stay AWS-only for this pass — F12/F13 (Azure/GCP, K8s) are deferred.
5. **No new third-party services.** Use Cost Explorer, CloudWatch, Pricing API, Bedrock, Resend — already wired.
6. **Cache writes go through `redis.setex` (lowercase)** — `setEx` is a node-redis API and is wrong on ioredis. There's a healed bug here; don't reintroduce it.
7. **Plan gating** stays in `src/middleware/plan.js`. Premium features must return `403 PLAN_UPGRADE_REQUIRED` for non-FinOps subscribers.
8. **Audit every state change** via `auditAction({ orgId, userId, action, metadata })` — required for FinOps governance.
9. **Webhook events** for every new alert: emit `finops.<event>` via `dispatchWebhook(orgId, event, payload)`. Slack post via `postMessage(orgId, ...)` if connected.
10. **Verify in browser preview** for every UI task. Code-only "done" doesn't count.

---

## 1. Tokens / contracts to respect

- `runFinOpsChecks({ credentials, region, controls?, startDate?, endDate?, onProgress })` is the connector entry point.
- Cache key: `finops:findings:{orgId}:current-month` for default range; `finops:findings:{orgId}:{startDate}:{endDate}` for custom. TTL 6h. Legacy fallback `finops:findings:{orgId}` is still read in some paths — don't remove yet.
- BullMQ queues live in `src/jobs/queues.js`. Workers are auto-started by importing them in `src/index.js`.
- Frontend route `/api/v1/finops` shape is consumed by `finops/src/app/dashboard/page.tsx` — additive changes only; never remove existing fields.

---

## 2. Tasks (open) — ordered by impact

### F-A1 — Tag-based cost allocation / showback (Critical)
**Why:** Without this, FinOps can't slice spend by team/env/project. This is the #1 ask from anyone past 10 engineers and the single biggest reason Vantage/CloudZero command their pricing.

**Where:** `src/connectors/finops/checks.js`, new `src/routes/finops.js` endpoint, new dashboard page.

**Do:**
- Add a Cost Explorer call grouped by `TAG` for a configurable list of tag keys (default: `Environment`, `Team`, `Project`, `CostCenter`).
- New endpoint `GET /api/v1/finops/allocation?tagKey=Team&startDate=&endDate=` → `{ tagKey, ranges, byValue: [{ value, cost, percentage, monthOverMonthDelta }] }`.
- Tag-key config persisted on `organizations.finops_settings` (jsonb) — migration adds the column.
- New dashboard page `finops/src/app/dashboard/allocation/page.tsx`: tag-key picker, horizontal bar chart, table with MoM delta column, CSV export.
- Untagged spend bucketed under `(untagged)` and surfaced first if > 5% of total. This is the most actionable single number on the page.

**Verify:** dev account with tagged + untagged resources → page renders both, MoM delta math sane, CSV download has the right columns.

---

### F-A2 — Historical trend + 90-day cost chart (Critical)
**Why:** Today the dashboard answers "what's idle now" but not "is spend trending up". Auditors and CFOs need the line chart.

**Where:** `src/connectors/finops/checks.js` (new helper), `src/routes/finops.js`, `finops/src/app/dashboard/page.tsx`.

**Do:**
- New helper `getDailyCostSeries({ credentials, region, days = 90 })` — single Cost Explorer call with `Granularity: DAILY`, dimension `SERVICE` for breakdown plus `UnblendedCost`.
- Cache result at `finops:trend:{orgId}:90d` for 12h.
- New endpoint `GET /api/v1/finops/trend?days=30|90|180` → `{ days, total, series: [{ date, total, byService: { ec2: 12.34, rds: 5.67, ... } }] }`.
- Dashboard: above the existing waste/rightsizing tabs, add a 90-day cost chart with stacked-area by top 5 services + "other". Range toggle (30/90/180). Hover tooltip with daily cost + top-3 services that day.
- Headline above chart: "MoM change: +$X (+Y%)" with red/green color and arrow.

**Verify:** Dates align across timezones (UTC). Compare totals against AWS console. Range toggle re-fetches.

---

### F-A3 — Anomaly detection + budget alerts (Critical)
**Why:** The single highest-frequency complaint in FinOps is "I got surprised by a bill". This product has zero alerting today.

**Where:** new `src/jobs/anomalyWorker.js`, new `src/services/anomaly.js`, new `src/routes/budgets.js`, schema additions, `src/jobs/scheduler.js`.

**Do:**
- New table `budgets` (orgId, name, scope `'org' | 'service' | 'tag'`, scopeValue, monthlyAmount, currency='USD', notifyAt jsonb `[50, 80, 100]`, channels jsonb `['email','slack','webhook']`, createdAt).
- New table `anomalies` (orgId, detectedAt, scope, scopeValue, baselineCost, observedCost, deltaPct, severity, status `'open' | 'acknowledged' | 'dismissed'`).
- Daily worker `anomalyWorker.js` runs after `finopsWorker` (offset 30m): for each org, compare yesterday's spend per service vs trailing 14-day median; flag if `delta > 25% AND absolute > $25`. Persist to `anomalies`.
- Budgets evaluated daily: month-to-date vs `monthlyAmount * (day/days_in_month)` — alert when crossing each `notifyAt` threshold (idempotent, persist last-notified threshold).
- CRUD routes `GET/POST/PATCH/DELETE /api/v1/budgets`. Read route `GET /api/v1/anomalies?status=open`.
- Notifications fan out: email (existing Resend), Slack (existing `postMessage`), webhook (`finops.anomaly` and `finops.budget_breach` events).
- Dashboard: new "Alerts" tab showing open anomalies + active budgets with progress bars.

**Verify:** seed an anomaly (manually insert a yesterday cost record 2x baseline) → worker picks it up → email + Slack arrive → row in dashboard with "Acknowledge" button.

---

### F-A4 — Applied-recommendation verification (Critical)
**Why:** Today a user clicks "Done" on a waste item and the system trusts them. Re-verifying the resource is actually gone is a 5-line check that builds enormous trust.

**Where:** `src/jobs/finopsWorker.js`, `src/connectors/finops/checks.js`, `src/routes/finops.js`, dashboard.

**Do:**
- When loading findings, cross-reference each `finops_recommendation_states` row in `done` state against current AWS state for that `resourceId` (EC2 DescribeInstances, EBS DescribeVolumes, etc.).
- If the resource still exists and is still wasteful → flip state back to `open`, set `appliedVerifiedAt = null`, set `lastVerifiedStatus = 'still_wasteful'`. Audit log entry.
- If gone or no longer wasteful → set `appliedVerifiedAt = now`, `lastVerifiedStatus = 'applied'`, persist `verifiedSavingsMonthly` from the original detection.
- Dashboard: "Applied" filter shows verified items with a green badge "Saved $X/mo · verified".
- Aggregate metric on overview: "Realized savings (last 30d): $X" — sum of `verifiedSavingsMonthly` for items verified in window.

**Verify:** mark an EBS volume as done → next scan deletes it → status becomes "applied"; mark another → don't delete it → status flips back to open.

---

### F-A5 — Snooze with expiry + dismissal reason (High)
**Why:** Snooze is a one-way trapdoor today; users hide problems forever and it pollutes the dashboard.

**Where:** `src/db/schema.js` (extend `finopsRecommendationStates`), `src/routes/finops.js`, dashboard.

**Do:**
- Add columns: `snoozedUntil timestamp`, `dismissalReason text` (enum-like: `'business_critical'`, `'cost_acceptable'`, `'pending_approval'`, `'wont_fix'`, `'other'`), `dismissalNote text`.
- New states: `'open' | 'snoozed' | 'done' | 'dismissed'`. `snoozed` requires `snoozedUntil`. `dismissed` requires `dismissalReason`.
- Snooze UI: date picker (presets: 7d / 30d / 90d / custom). Background job re-opens items where `snoozedUntil < now` daily.
- Dismissed items hidden from default view; "Show dismissed" toggle shows them with reason badge.

**Verify:** snooze 7d → item disappears from default; advance system clock or hand-set snoozedUntil to past → item re-appears. Dismissed item with reason shows in dismissed view only.

---

### F-A6 — Recommendation copy + age + region (High)
**Why:** Quickest UX wins. Listed in the polish doc but easy to bundle here.

**Where:** `finops/src/app/dashboard/page.tsx`.

**Do:**
- Per recommendation card add: region badge (top-right), "Detected N days ago" (uses `firstDetectedAt` — add to state table if missing), copy-button beside the AWS CLI command (already in the recommendation text).
- "Days since detected" sortable column.

**Verify:** click copy → clipboard contains the CLI line, no surrounding markdown. Region badge present on every item.

---

### F-A7 — Multi-account rollup (High)
**Why:** Real customers have multiple AWS accounts (prod/staging/dev/sandbox). Today they need 4 separate iFu Labs orgs. Death blow on enterprise demos.

**Where:** schema additions, `src/jobs/finopsWorker.js`, dashboard.

**Do:**
- New table `aws_accounts` (orgId, accountId, accountAlias, roleArn, externalId encrypted, isPrimary, createdAt). Existing single-account integration migrates to one row with `isPrimary = true`.
- `finopsWorker` iterates accounts; results stored under namespaced cache key `finops:findings:{orgId}:{accountId}:{rangeKey}`.
- API: `GET /api/v1/finops?accountId=...` filters; default returns merged across accounts with `byAccount` summary.
- Dashboard: account picker top-left of overview. "All accounts" view aggregates with account column on every list.
- Plan gating: >1 account requires Growth plan.

**Verify:** add a second AWS account → scans both → dashboard shows merged view + per-account drill-down.

---

### F-A8 — Commitment / RI purchase recommendations (High)
**Why:** Coverage gaps today are read-only. The whole point of detecting them is to act.

**Where:** `src/connectors/finops/checks.js`, new `src/services/finops-purchases.js`, `src/routes/finops.js`, dashboard.

**Do:**
- Use Cost Explorer `GetSavingsPlansPurchaseRecommendation` and `GetReservationPurchaseRecommendation` APIs.
- New endpoint `GET /api/v1/finops/purchase-recommendations` → `{ savingsPlans: [...], reservations: [...] }` with each item: term (1y/3y), payment (no/partial/all upfront), upfrontCost, monthlyCost, estimatedSavings, breakEvenMonths, recommendedQty.
- Dashboard: new "Commitments" tab replaces the read-only "Coverage" view. Shows current coverage + recommended purchases. CTA per row: "Generate AWS CLI" (we don't auto-purchase — that's F13 deferred risk territory).
- Annual savings prominently above the table.

**Verify:** dev account with EC2 baseline → recommendations appear → CLI generator outputs syntactically valid `aws ce purchase-savings-plans` command.

---

### F-A9 — Scheduled email reports (Medium)
**Why:** "Send me a weekly summary" is the request that drives executive adoption. Email opens > app logins for non-engineers.

**Where:** new template in `src/services/email.js`, new cron in `src/jobs/scheduler.js`.

**Do:**
- Weekly Monday 09:00 local time per org (use org timezone field — add if missing, default `UTC`).
- Email content: this week's spend vs last, top 3 anomalies, top 3 waste items by savings, applied-recommendations realized savings, link to dashboard.
- Per-org opt-out flag on `organizations.finops_settings.weeklyReport`.

**Verify:** trigger cron manually → email arrives with correct numbers + working dashboard link.

---

### F-A10 — Monthly PDF report (Medium)
**Why:** Same audience as F-A9, but the artifact CFOs actually save. Reuse `src/services/pdf/evidenceReport.js` for plumbing.

**Where:** new `src/services/pdf/finopsReport.js`, new endpoint, monthly cron.

**Do:**
- Endpoint `GET /api/v1/finops/report.pdf?month=YYYY-MM` (admin only, plan-gated to FinOps).
- PDF sections: cover, spend trend chart (rendered as image), top services table, anomalies, applied savings, open recommendations, commitments. iFu Labs branded (Plum/Iris/Lavender).
- Monthly cron on 1st at 09:00 UTC: generate prior month's PDF, email to org admins.

**Verify:** download PDF → opens, all sections present, no overlapping text, branded correctly.

---

### F-A11 — AI/GPU spend view (Medium)
**Why:** Bedrock, SageMaker, and idle GPU instances are the new "where did the money go". Calling these out earns trust with AI-heavy customers.

**Where:** `src/connectors/finops/checks.js` (new check group), dashboard.

**Do:**
- New check group: parse Cost Explorer for `Amazon Bedrock`, `Amazon SageMaker`, EC2 instance types in `g4`, `g5`, `p3`, `p4`, `p5`, `inf1`, `inf2`, `trn1` families.
- Surface idle GPU EC2 (avg CPU < 5% AND avg GPUUtilization < 5% over 7 days via CloudWatch GPU metrics if installed; else flag "no GPU metrics — install CloudWatch agent").
- New dashboard panel "AI / GPU spend": current month, MoM delta, idle GPU count + savings, top model by Bedrock cost.

**Verify:** account with Bedrock usage → panel populates. Account without → graceful "No AI spend detected".

---

### F-A12 — FOCUS 1.1 export (Medium)
**Why:** FOCUS is the FinOps Foundation's open standard. Customers using third-party FinOps tools want to ingest your data. Same code path as CSV export but with FOCUS column names.

**Where:** `src/routes/finops.js`.

**Do:**
- Endpoint `GET /api/v1/finops/export?format=focus` produces CSV with FOCUS 1.1 columns (BilledCost, EffectiveCost, ChargeCategory, ResourceId, Region, ServiceName, etc.).
- Map AWS Cost Explorer fields per FOCUS spec.
- Document spec version in CSV header comment.

**Verify:** open in Excel — header row matches FOCUS 1.1 schema. Run through a FOCUS validator if available.

---

## 3. API surface after this work

```
GET    /api/v1/finops                     existing
GET    /api/v1/finops/summary             existing
GET    /api/v1/finops/stream              existing (SSE)
GET    /api/v1/finops/export              existing (csv|json|focus after F-A12)
GET    /api/v1/finops/trend                          NEW (F-A2)
GET    /api/v1/finops/allocation                     NEW (F-A1)
GET    /api/v1/finops/purchase-recommendations       NEW (F-A8)
GET    /api/v1/finops/report.pdf                     NEW (F-A10)
GET    /api/v1/finops/recommendations/states         existing (F6)
PATCH  /api/v1/finops/recommendations/:id/state      existing — extended (F-A5)
GET    /api/v1/budgets                               NEW (F-A3)
POST   /api/v1/budgets                               NEW
PATCH  /api/v1/budgets/:id                           NEW
DELETE /api/v1/budgets/:id                           NEW
GET    /api/v1/anomalies                             NEW (F-A3)
PATCH  /api/v1/anomalies/:id                         NEW
GET    /api/v1/aws-accounts                          NEW (F-A7)
POST   /api/v1/aws-accounts                          NEW
DELETE /api/v1/aws-accounts/:id                      NEW
```

Webhook events emitted: `finops.scanned` (existing), `finops.anomaly` (F-A3), `finops.budget_breach` (F-A3), `finops.recommendation_verified` (F-A4).

---

## 4. Order of operations

Do them in this order — each builds on the prior:

1. **F-A6** (recommendation polish) — fastest, ships value immediately.
2. **F-A5** (snooze expiry + dismissal) — small schema + UX, low risk.
3. **F-A2** (90-day trend) — biggest visual upgrade, no schema changes outside cache.
4. **F-A4** (applied verification) — completes the workflow loop.
5. **F-A3** (anomalies + budgets) — biggest product moat. Allow 3-5 days.
6. **F-A1** (tag allocation) — needs design QA; do after the above ship.
7. **F-A8** (commitments) — read-only AWS recommendations, low risk.
8. **F-A7** (multi-account) — schema migration plus dashboard refactor; allow 3-4 days.
9. **F-A11** (AI/GPU) — additive, easy.
10. **F-A9** (weekly email) and **F-A10** (monthly PDF) — last; depend on the data being right.
11. **F-A12** (FOCUS export) — last; pure mapping work.

---

## 5. Verification checklist (every task)

- [ ] Backend syntax: `node --check <file>` passes for every touched .js.
- [ ] Migration runs cleanly on a fresh DB (`npm run db:push` or equivalent).
- [ ] Endpoint returns 401 without token, 403 for non-FinOps subscribers where gated.
- [ ] Dashboard renders without console errors (`preview_console_logs` clean).
- [ ] Empty/error states tested (no AWS account, expired creds, no Bedrock usage, etc.).
- [ ] CSV/PDF/email outputs opened and visually checked.
- [ ] Audit log has an entry for every state-changing action.
- [ ] Webhook fired (test subscriber receives it).

---

## 6. Done

*(empty — fill as: `F-A2 — 90-day trend — finops/src/app/dashboard/page.tsx + src/routes/finops.js + src/connectors/finops/checks.js — verified 2026-04-26`)*

---

## 7. Non-goals

- Auto-purchase of RIs or Savings Plans (F13 deferred — high risk).
- Auto-deletion of waste resources (out of scope; we generate CLI only).
- Kubernetes cost (F11 deferred — needs OpenCost or Container Insights).
- Azure / GCP support (F12 deferred).
- ML-based anomaly detection (statistical baseline is enough for v1; ML is later).
- Custom dashboard layout / widget builder.
