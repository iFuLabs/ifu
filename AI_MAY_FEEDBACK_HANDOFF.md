# AI handoff — May 2026 feedback batch (open items)

You are continuing work on the iFu Labs monorepo (`/Users/titusquayson/Downloads/ifu-labs`). A previous AI session worked through a feedback batch the user dropped on 2026-05-02. This document captures what's done, what's open, and the constraints you must honor.

## Hard rules — read before doing anything

1. **Wait for explicit per-item approval before writing code.** The user's standing instruction in `CLAUDE.md` is: "Await explicit approval per suggestion before any implementation work." Present the item, the proposed approach, the open questions, and *stop*. Do not start editing files until the user says go.
2. **One item at a time.** Do not bundle multiple open items into a single change. The user has been picking them off in order and giving feedback between each.
3. **No new top-level Markdown docs unless asked.** The repo already has too many `.md` files. If you need to write notes, append to `CLAUDE.md` under "Recently completed" or to existing docs.
4. **Backend changes need migrations to be run on Postgres before deploy.** Never assume schema changes are live. Use the existing pattern in `drizzle/` (current latest is `0023_add_scan_settings.sql`; next would be `0024_*`).
5. **The user's CLAUDE.md is authoritative.** If anything in this handoff conflicts with `CLAUDE.md`, follow `CLAUDE.md`.

## What's already done in this batch (do not redo)

| Item | Where it lives |
|---|---|
| Session invalidation on sign-out | `drizzle/0022_add_user_tokens_invalidated_at.sql`, `src/middleware/auth.js` (`isTokenRevoked`), `src/routes/auth.js` (`/logout` soft-decode + `tokensInvalidatedAt` bump), `src/db/schema.js` (`users.tokensInvalidatedAt`) |
| Stale FinOps after AWS disconnect | `src/routes/integrations.js` (`clearFinopsCacheForOrg` SCAN+DEL on `DELETE /integrations/:id`), `src/routes/finops.js` (`/summary` requires connected AWS row) |
| Audit log refresh button + 30s auto-poll | `comply/src/app/dashboard/audit-log/page.tsx`, `src/routes/audit-log.js` (new `since` query param, `serverTime` in response) |
| Audit log coverage gaps (5 added) | `auth.profile_updated`, `control.notes_updated`, `integration.sync_triggered`, `team.invitation_revoked`, `billing.subscription_cancelled` — search `auditAction(` in those route files |
| Admin-controlled scan timing (backend) | `drizzle/0023_add_scan_settings.sql`, `src/db/schema.js` (`organizations.scanSettings`), `src/jobs/scheduler.js` (refactored to hourly tick + per-org check), `src/routes/organizations.js` (`GET/PATCH /scan-settings`) |
| Multi-account AWS isolation | `src/routes/integrations.js` (`POST /aws` rejects duplicate account ID across orgs with 409 `AWS_ACCOUNT_ALREADY_CONNECTED`), `docs/multi-tenant-isolation-audit.md` |

Two unrun migrations are queued: `0022` and `0023`. Confirm with the user whether they've been applied before assuming current production state.

## Known latent bug (not yet authorized to fix)

`POST /api/v1/integrations/aws` upserts on `(orgId, type='aws')`. Both the Comply and FinOps frontends hit this same endpoint, but Comply's onboarding tells customers to attach `SecurityAudit` while FinOps's onboarding tells them to create a *different* role with `ViewOnlyAccess + Cost Explorer inline policy`. Result: a customer who has both products silently overwrites one role with the other on second connect. The fix is "Option A" — add a `product` column to `integrations`, key by `(orgId, type, product)`, change both frontends to pass the product. The user has explicitly **declined to implement this for now**. Do not bring it up unless they ask. Do *not* refactor around it; just be aware that the integrations table is product-agnostic today.

## Open items — present these one at a time

The user will tell you which one to start. Do not pre-research all of them.

### 1. View-only roles for stakeholders

**Status of the substrate:** the `users.role` column already accepts `auditor` (see `src/middleware/auth.js` — `requireUser`, `requireWrite`, `requireRole` all already block auditors from POST/PATCH/PUT/DELETE). What's missing is the *UI* to invite someone as an auditor.

**What to investigate before proposing:**
- `comply/src/app/dashboard/team/page.tsx` — current invite form. Does it expose the role selector? If so, is `auditor` an option?
- `src/routes/team.js` `/invite` endpoint — does the invitation schema accept `role: 'auditor'`?
- The `invitations` table schema (`src/db/schema.js`) — is the role column a free text or an enum that includes `auditor`?

**Likely deliverable:** small frontend change to add "View only (auditor)" to the role dropdown on the invite form, and a backend schema update if the role enum doesn't include it. ~30 min of work.

**Open question to ask the user:** "Should auditors see *all* dashboards (Comply + FinOps + Billing + Team) read-only, or only specific ones? The middleware is uniform read-only today — confirming this is the desired UX."

### 2. Documentation for Comply and FinOps (user-facing)

The repo has many *internal* `.md` files (handoffs, prompts, implementation notes). It does **not** have customer-facing setup/usage docs.

**What to investigate before proposing:**
- Is there a docs site, or is documentation expected to live inside the apps as in-page help?
- Check `website/src/app/` for any existing `/docs` route or help center.
- Search for "TODO docs" or similar.

**Open questions to ask the user:**
- "Where should these docs live — `website/`, a new docs site, in-app modals, or a `docs/` folder rendered somewhere?"
- "Audience: end-user admin, IT/SecOps implementer, or compliance auditor? Each wants different things."
- "Scope: setup only, or setup + usage + integration troubleshooting + IAM policy reference?"

This is the largest open item. Don't start writing prose until scope is locked.

### 3. Frontend UI for scan-settings (admin form)

**Status:** backend is fully wired. `GET /api/v1/organizations/scan-settings` and `PATCH /api/v1/organizations/scan-settings` both exist (`src/routes/organizations.js`). Admin-only on PATCH. Audit-logged as `organization.scan_settings_updated`.

**What's missing:** a form somewhere in the Comply portal where an admin can set the hour-of-day for `comply`, `finops`, and `anomaly` scans, and toggle each on/off.

**What to investigate before proposing:**
- Is there a Settings page in the Comply portal? (`comply/src/app/dashboard/`) — likely under `team/` or similar.
- The shape of the response is documented in `src/routes/organizations.js`; mirror it.

**Likely deliverable:** one new section on an existing settings page with three rows (one per product), each with an enabled checkbox and an hour-of-day picker (0–23 UTC). ~1 hour.

### 4. Background-worker audit coverage

**Context:** earlier in this batch, audit coverage for *user-driven* writes was patched (5 routes that were missing `auditAction` calls now have them). What's still uncovered: completions of background work — scan finishes, score snapshot taken, anomaly detected, webhook delivery succeeded/failed, control drift detected.

**Files to inspect:**
- `src/jobs/scanWorker.js` — does it audit on scan completion?
- `src/jobs/finopsWorker.js` — already audits per the `CLAUDE.md` notes; verify.
- `src/jobs/anomalyWorker.js`, `src/jobs/scoreSnapshotWorker.js`, `src/jobs/webhookWorker.js`, `src/jobs/notificationWorker.js`.

**Open question to ask the user:** "Audit completions only, or also audit failures? Failure audits are louder but useful for compliance evidence (SOC 2 wants 'system X ran on date Y'). Recommendation: both, with `metadata.outcome` field."

**Action naming convention to suggest:** `<module>.<event>` — e.g. `scan.completed`, `scan.failed`, `score.snapshot_captured`, `anomaly.detected`, `webhook.delivered`, `webhook.failed`. Keep it consistent.

### 5. Postgres RLS as defense-in-depth

**Status:** noted as out-of-scope in `docs/multi-tenant-isolation-audit.md`. Application-level `orgId` filtering is enforced everywhere, but a single missed `eq(table.orgId, request.orgId)` in a future PR would silently leak data. RLS would catch that at the database layer.

**This is the biggest item by far.** A real RLS rollout means:
- Setting a session variable (`SET LOCAL app.current_org_id = ...`) on every connection checkout
- Writing per-table policies (`USING org_id = current_setting('app.current_org_id')::uuid`)
- Auditing every table that has `orgId` and adding policies
- Updating the Drizzle client to set the session var on connection acquire
- Testing extensively that no query path is missing the session var (which would 0-row everything)

**Recommendation to the user:** scope it to *one* high-risk table first as a proof of concept (e.g. `controlResults` or `auditLog`), validate the pattern works end-to-end with the workers + the Fastify request lifecycle, *then* decide whether to roll out broadly. Do not attempt all tables in one pass.

**Open questions to ask the user:**
- "Are you willing to take the perf hit of RLS on every query, or is this aspirational for SOC 2 Type II readiness only?"
- "Do you have a staging environment to validate the pattern before production?"
- "Is the goal compliance-driven (auditor wants RLS) or defense-in-depth (we want a safety net for future bugs)?"

## Workflow expectations

- Read `CLAUDE.md` first. Note the prior task table at the bottom — light-mode brand conversion is *also* an open thread; don't conflate it with the May feedback items.
- When you propose, be concrete about the *minimum viable* version of each item. The user has rejected over-engineered approaches before (see "Comply → FinOps integration logic" above — they declined).
- Always run `node --check <file>` after editing JS files. The user has been burned by syntax errors that broke server startup.
- Frontend changes should be verifiable in a browser preview per the harness's `<verification_workflow>`. Backend-only changes (schema, routes, workers) are not browser-observable; say so explicitly rather than starting a preview that won't prove anything.
- When in doubt about scope, ask. Match the size of the action to the size of what was authorized.

## End-of-task expectations

After each item is approved and shipped:
- Summarize what changed using markdown links to the edited files (format: `[path](path)` or `[path:line](path:line)`).
- Note any new migrations and remind the user to run them.
- Ask which open item is next. Do not auto-proceed.
