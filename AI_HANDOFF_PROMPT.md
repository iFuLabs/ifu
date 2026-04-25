# AI Handoff Prompt — iFU Labs Product Improvements

> **Purpose:** instructions for another AI agent to continue implementing the recommendations documented in `CLAUDE.md` (sections "Pending suggestions", "Notes"). This prompt is **prescriptive**. Follow it literally.

> **Last updated:** 2026-04-25 — first batch of quick wins shipped (see "Already implemented" section at the end).

---

## 0. Identity & non-negotiables

You are continuing work on the iFU Labs monorepo at `/Users/titusquayson/Downloads/ifu-labs`. Two SaaS products are in scope:

- **iFU Comply** — `comply/` (Next.js) + shared backend `src/`
- **iFU Costless / FinOps** — `finops/` (Next.js) + shared backend `src/`

Out-of-scope: `website/`, `portal/` auth flows, brand light-mode work (a different task on the `brand-identity` branch).

**Hard rules — do not break:**

1. **Do not modify the brand light-mode conversion code** in `website/` or `portal/auth|billing|onboarding` unless the suggestion explicitly targets it.
2. **No design or copy changes** outside the suggestion being implemented.
3. **No dependency removals.** Add deps only when the suggestion needs them.
4. **No schema changes without a migration file** in `drizzle/` numbered sequentially after the latest one (`0010_*.sql` is current; next is `0011_*.sql`).
5. **No destructive SQL** — additive only (CREATE TABLE, ADD COLUMN, ADD ENUM VALUE). Never DROP or rename existing columns/tables.
6. **No mass refactors.** Each suggestion is a discrete, additive change. If a refactor seems needed, surface it in `CLAUDE.md` "Notes" and stop.
7. **One suggestion at a time.** Do not bundle. Each must be reviewable independently.
8. **Read `CLAUDE.md` first** before each session. The user moves items between Pending → Approved → Implementation queue → Rejected. Only work items in **Implementation queue**.

---

## 1. Workflow per suggestion

For each item in `CLAUDE.md` "Implementation queue", follow this exact sequence:

### Step A — Confirm scope
1. Re-read the suggestion in `CLAUDE.md`.
2. If anything is ambiguous, **stop and ask the user before writing code.** Do not invent scope.

### Step B — Plan
1. Use the TodoWrite tool to break the suggestion into ≤6 concrete sub-tasks.
2. Identify exactly which files you will touch. Prefer editing existing files over new ones. New files only if there's no existing home.

### Step C — Implement
1. Match existing code style (look at neighbouring files first).
2. Backend code is **ESM JavaScript** (`.js` files, `import`/`export`). No TypeScript in `src/`.
3. Frontend code in `comply/` and `finops/` is **Next.js 14 App Router + TypeScript** (`.tsx`).
4. Database via **Drizzle ORM** (`src/db/schema.js`, `src/db/client.js`). Use the existing patterns — `db.query.<table>.findMany`, `db.insert(...).values(...).returning()`, `eq`/`and`/`or` from `drizzle-orm`.
5. Caching via **Redis** (`src/services/redis.js`). TTL constants live near the top of each route file.
6. Job processing via **BullMQ** (`src/jobs/queues.js` + `src/jobs/scanWorker.js` pattern). New queues go in `queues.js`; new workers in `src/jobs/<name>Worker.js`.
7. Auth middleware: `verifyToken` + `requireUser` from `src/middleware/auth.js` (sets `request.orgId`, `request.user`).
8. Plan gating: `src/middleware/plan.js` — return 403 with `code: 'PLAN_UPGRADE_REQUIRED'`, `requiredPlan` for gated features.
9. Audit logging: call `auditAction({ orgId, userId, action, metadata })` from `src/services/audit.js` for any state-changing operation.

### Step D — Verify
1. **Type-check / build** — run whatever the project uses (check `package.json` scripts: likely `npm run build` at root or per-app).
2. **Lint** — only if the project has a lint script. Don't introduce one.
3. **Spot-check** the new endpoint with `curl` or document a manual test in the PR-ready summary.
4. For UI changes, **do not assume it works** — start the dev server (`npm run dev` in the app directory), use the preview tools (`mcp__Claude_Preview__preview_*`) to verify, and capture a screenshot.

### Step E — Document
1. Update `CLAUDE.md`:
   - Move item from Implementation queue → Approved suggestions (with date and short note)
   - If you discovered something useful, add to Notes
   - If you discovered a follow-up gap, add to Pending suggestions
2. **Do not commit unless the user asks.** Leave changes uncommitted for review.
3. Provide a tight summary: files touched, what to test, any flags.

---

## 2. Suggestion-specific guidance

The suggestions are listed in `CLAUDE.md` under "Pending suggestions". Below are implementation hints **only** — do not deviate from the plan in `CLAUDE.md`.

### Quick wins (start here unless user says otherwise)

#### F1 — Wire scheduled FinOps scans
- Pattern: copy `src/jobs/scheduler.js` cron + `src/jobs/scanWorker.js` shape.
- Add a `finopsScanQueue` to `src/jobs/queues.js`.
- Create `src/jobs/finopsWorker.js` that calls `runFinOpsChecks` from `src/connectors/finops/checks.js` and stores findings in Redis (cache key `finops:findings:${orgId}`, TTL 6h — same as live route uses).
- Add a daily cron in `scheduler.js` (existing function) that finds all orgs with a connected AWS integration AND an active FinOps subscription, queues a `finopsScanQueue` job per org with random jitter.
- Register the worker in the same place `scanWorker` is registered (find via `grep "scanWorker" src/`).

#### F5 — Custom date ranges for FinOps
- Extend `GET /api/v1/finops` querystring schema with `startDate` and `endDate` (ISO date strings, optional, both required if either present).
- Pass them into `runFinOpsChecks({ ..., startDate, endDate })`.
- Update `src/connectors/finops/checks.js` Cost Explorer calls to use the supplied range; default to current month if absent.
- Cache key must include the date range — `finops:findings:${orgId}:${startDate}:${endDate}` — to avoid serving stale data.
- UI: `finops/src/app/dashboard/page.tsx` — add a date-range picker that calls the endpoint with the new params. Match existing inline-style pattern; do **not** introduce a new design system.

#### F7 — CSV export for FinOps findings
- New endpoint: `GET /api/v1/finops/export?format=csv` (also support `format=json`).
- Pull cached findings; if none, run fresh.
- CSV columns: `category,resourceId,region,service,monthlySavings,annualSavings,confidence,recommendation`.
- Set `Content-Type: text/csv` and `Content-Disposition: attachment; filename=finops-findings-<orgId>-<date>.csv`.
- For PDF: reuse `src/services/pdf/evidenceReport.js` as reference; create `src/services/pdf/finopsReport.js`.

#### C8 — Slack/email alert on control drift
- The `notificationQueue` already exists in `src/jobs/queues.js` and is enqueued from `scanWorker.js` when `failCount > 0`.
- Add a `notificationWorker.js` that consumes from `notificationQueue`. It should:
  1. Compute the diff between this scan and the prior scan (look up second-most-recent scan by `orgId`, find controls that flipped `pass → fail`).
  2. Email org admins via `sendControlDriftEmail` (new function in `src/services/email.js` — match existing template style).
  3. If org has Slack workspace connected (future), post there too — leave a stub.
- Persist a `notification_log` table (new migration `0011_*.sql`) so the same drift isn't alerted twice.

#### F10 / A3 — Slack app
- Use `@slack/bolt` — add as dep.
- New routes file `src/routes/slack.js`: `GET /api/v1/slack/install` (OAuth start), `GET /api/v1/slack/callback`, `POST /api/v1/slack/uninstall`.
- New table: `slack_workspaces` (orgId, teamId, accessToken (encrypted), botUserId, channelId).
- New service: `src/services/slack.js` — `postMessage(orgId, blocks)`.
- Wire `notificationWorker` (from C8) and the future anomaly detector (F2) to call `postMessage`.

#### A2 — Outbound webhooks
- New table `webhooks` (orgId, url, secret, events[], active, createdAt).
- New endpoints `GET/POST/DELETE /api/v1/webhooks`.
- New service `src/services/webhooks.js` — `dispatchWebhook(orgId, event, payload)`. HMAC-SHA256 signature in `X-iFU-Signature` header. Use BullMQ for retries (3 attempts, exponential backoff).
- Hook into existing flows: scan complete (`scanWorker.js` already enqueues notifications — add webhook dispatch there), control drift (C8), FinOps anomaly (F2 future), subscription change (`billing.js` webhook handler).

#### C5 — Okta + Google Workspace connectors
- `integrations.type` enum already supports `okta` and `google_workspace` — no migration needed.
- Create `src/connectors/okta/checks.js` and `src/connectors/google-workspace/checks.js`. Mirror the `src/connectors/aws/checks/` structure.
- Connection flow: `POST /api/v1/integrations/okta` and `/google-workspace` in `src/routes/integrations.js`. Okta uses API token; Google Workspace uses service account JSON. Encrypt with `src/services/encryption.js`.
- Wire into `scanWorker.js` dispatch (the `if (integrationType === 'aws')` block).
- Controls to map: MFA enforcement, SSO coverage, password policy, admin account count, inactive user purge, group membership reviews.

#### C4 — PCI DSS 4.0 controls
- `framework` enum in `control_definitions` already includes `pci_dss`.
- Add ~50 control records to a seed file (find existing seed in `scripts/` or `drizzle/`). Mirror SOC 2 record shape (`controlId`, `framework: 'pci_dss'`, `category`, `title`, `description`, `severity`, `automatable`, `checkFn` reference).
- Map ~15-20 to existing AWS check fns (encryption at rest, network segmentation via SGs, CloudTrail logging, IAM password policy, S3 public access block, etc.).
- Add gating: `pci_dss` is Growth-tier only — update `src/middleware/plan.js` allowed frameworks list.

#### C2 — Policy management module
- New tables (migration `0011_*.sql`):
  - `policies` (id, orgId, title, content, version, status, createdBy, createdAt, updatedAt)
  - `policy_acknowledgements` (id, policyId, userId, acknowledgedAt)
- Routes `src/routes/policies.js`: CRUD + acknowledgement endpoint.
- UI page `comply/src/app/dashboard/policies/page.tsx`.
- Seed 8 standard policy templates (Acceptable Use, Access Control, Incident Response, Data Classification, Backup, Change Mgmt, Vendor Mgmt, Business Continuity).
- Plan gating: Growth only.

#### C3 — Employee lifecycle + training
- New table `employee_lifecycle_events` (orgId, userId, eventType, integrationActions, completedAt).
- New table `training_completions` (orgId, userId, courseId, completedAt, score).
- Hooks in `team.js` invite/remove flows: when a user joins, create lifecycle event; on remove, trigger offboarding checklist (revoke GitHub team, deactivate AWS IAM user, etc. — fire webhooks rather than directly calling).
- Static training: bundle a single 10-question security awareness quiz; user must complete to satisfy "Annual Security Training" control.

### Larger items (each needs explicit user approval before starting)

- F2 anomaly detection
- F3 tag-based allocation
- F4 budgets
- C1 Trust Center
- C7 AI evidence remediation w/ IaC
- C9 Security questionnaire automation
- A1 Public REST API + API keys
- A12 Multi-cloud (Azure/GCP)

For these, **prepare a design doc as a markdown file in the repo root** (`PROPOSAL_<id>_<short_name>.md`) before writing any code. Wait for user sign-off on the doc.

---

## 3. Code conventions cheat sheet

```js
// Backend route — Fastify pattern
import { db } from '../db/client.js'
import { someTable } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

export default async function someRoutes(fastify) {
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Tag'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const rows = await db.query.someTable.findMany({
      where: eq(someTable.orgId, request.orgId)
    })
    return reply.send({ items: rows })
  })
}
```

```js
// Worker pattern
import { Worker } from 'bullmq'
import { redis } from '../services/redis.js'

export const myWorker = new Worker('queue-name', async (job) => {
  // work...
}, { connection: redis, concurrency: 5 })
```

```sql
-- Migration pattern (drizzle/0011_*.sql) — additive only
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_my_table_org ON my_table(org_id);
```

```tsx
// Frontend page (Comply / FinOps) — App Router + inline styles
'use client'
import { useState, useEffect } from 'react'

const PLUM = '#33063D'
const IRIS = '#8A63E6'

export default function Page() {
  // ...
}
```

---

## 4. Boundaries

- **Don't write tests speculatively.** Add tests only if the user asks or if `package.json` has a test script that's already wired into CI; in that case, add 1-2 happy-path tests per new endpoint.
- **Don't add observability tooling** (Sentry, OTEL, etc.) unless explicitly approved.
- **Don't add new package managers, build tools, monorepo tools.** Stay in current stack.
- **Don't touch `infra/` or `apprunner.yaml`** without approval.
- **Don't write README files** for new modules. Inline a top-of-file docstring (one line) instead.
- **No emojis in code.** Code stays plain.

---

## 5. When to stop

Stop and ask the user when:
- A schema change might be destructive
- A suggestion conflicts with another in-flight item
- A new third-party service or paid API is required
- Estimated work exceeds 4 hours of implementation
- Anything in `CLAUDE.md` is contradictory or out of date

Stop silently (no further action) when:
- The Implementation queue in `CLAUDE.md` is empty

---

## 6. Final reminder

The suggestions in `CLAUDE.md` were produced by reading the codebase + competitor research. They reflect the state of the code at handoff time. **Re-verify file paths and table names exist before referencing them** — refactors may have happened. If a referenced file or symbol is missing, check `git log` for renames before assuming it must be created.

Be additive. Be reviewable. One suggestion at a time. Update `CLAUDE.md` after each.

---

## 7. Already implemented (2026-04-25)

The following were shipped and **must not be re-implemented**:

| ID | What | Key files |
|----|------|-----------|
| F1 | Scheduled FinOps scans (daily 03:00 UTC) | `src/jobs/queues.js` (new `finopsScanQueue`), `src/jobs/finopsWorker.js` (new), `src/jobs/scheduler.js` (cron added), `src/index.js` (worker registered) |
| C8 | Control-drift email alerts (pass→fail) | `src/jobs/scanWorker.js` (drift snapshot + detection), `src/jobs/notificationWorker.js` (new), `src/services/email.js` (new `sendControlDriftEmail`) |
| F7 | CSV/JSON export | `src/routes/finops.js` — `GET /api/v1/finops/export?format=csv\|json` |
| F5 | Custom date ranges | `src/routes/finops.js` (querystring), `src/connectors/finops/checks.js` (`runFinOpsChecks({startDate, endDate})`, multi-month aggregation), cache key namespaced `finops:findings:{orgId}:{rangeKey}` w/ legacy fallback |
| A2 | Outbound webhooks | `drizzle/0011_add_webhooks.sql` — tables, `src/services/webhooks.js` — HMAC signing + delivery, `src/routes/webhooks.js` — CRUD endpoints, `src/jobs/webhookWorker.js` — retry worker. Integrated into scanWorker (scan.complete) and notificationWorker (control.drift). |
| C4 | PCI DSS 4.0 controls | `src/db/seed.js` — 29 PCI DSS controls added, `src/middleware/plan.js` — `pci_dss` added to Growth tier. Seeded to production. |
| F6 | Recommendation workflow states | `drizzle/0012_add_finops_recommendation_states.sql` — table + enum, `src/routes/finops.js` — PATCH/GET endpoints, `finops/src/app/dashboard/page.tsx` — UI with state indicators, filters, and inline controls. |

**Cache key migration note:** the FinOps cache previously lived at `finops:findings:{orgId}`. New code uses `finops:findings:{orgId}:current-month` for the default range and `finops:findings:{orgId}:{startDate}:{endDate}` for custom ranges. Reads in `/finops/summary`, `/finops/export`, and `/finops/stream` fall back to the legacy key if present, but new writes only go to the namespaced key. Don't remove the fallback yet — wait until cache TTLs (6h) have elapsed in production.

**Drift detection note:** the prior-status snapshot in `scanWorker.js` runs **before** the upsert loop. Don't move it after — you'll lose the diff. The `notificationQueue` job name is now `control-drift` (was `scan-complete`); a new worker is needed if you want a different notification type.

**Scheduler note:** Comply scans run at 02:00 UTC, FinOps scans at 03:00 UTC, both with up-to-1-hour jitter. If you add a third scheduled job, pick a different hour to avoid AWS API thundering-herd.

---

## 8. Suggested next batch

If the user gives you no specific direction, propose this order (each is small enough to ship cleanly):

1. ~~**A2 Outbound webhooks**~~ ✅ Complete
2. **F6 UI for recommendation workflow states** — Backend done, needs UI in `finops/src/app/dashboard/page.tsx`
3. **C5 Okta + Google Workspace connectors** — stubs exist; ~6-10 controls each
4. **F10/A3 Slack app** — enables notifications for C8 and future F2 anomaly detection
5. **C2 Policy management module** — bigger but high-impact; needs migration + 8 templates + UI page

After these, the next tier requires a design doc per item: F2 anomaly detection, F3 tag allocation, F4 budgets, C1 Trust Center, C3 employee lifecycle, C6 risk register, C7 AI/IaC remediation, C9 questionnaire automation.
