# AI Handoff — Comply Product Roadmap (MVP → operational GRC platform)

> **Purpose:** Comply has clean bones but is missing the daily-workflow surface that keeps GRC teams logged in. This prompt adds the operational loop: tasks, calendars, exemptions, comments, audit trail, document vault, RBAC enforcement.
>
> **Scope:** `comply/src/app/dashboard/**`, `src/routes/{controls,evidence,scans,vendors,team,policies,audits}.js`, plus targeted schema additions and new services.
>
> **Branch:** `brand-identity`. Don't switch.
>
> **Read first:** `CLAUDE.md`, `AI_HANDOFF_PROMPT.md`, `AI_DASHBOARD_POLISH_PROMPT.md`. They cover existing conventions and tasks already in flight (e.g. C2 policy management, C5 connectors). Don't redo those.

---

## 0. Hard rules

1. Backend ESM JavaScript. Frontend TypeScript Next.js 14 App Router.
2. Drizzle migrations are sequential and additive. Latest is `0013_*.sql`.
3. One feature per PR. Each C-task is independent.
4. No new auth providers — Auth0 + local auth stay as-is.
5. **RBAC is enforced at the API**, not the frontend. Roles: `owner | admin | member | auditor` (auditor is new — read-only across all data, no writes). Use `requireUser`, `requireAdmin`, new `requireRole(['owner','admin'])`.
6. Audit log every state-changing action — no exceptions.
7. Plan gating via `src/middleware/plan.js`. Premium = Growth plan unless noted.
8. Webhook + Slack on every notable event: `control.<event>`, `evidence.<event>`, `audit.<event>`, etc.
9. Verify every UI task in browser preview.
10. **Don't touch `controls/[id]/page.tsx` raw evidence JSON viewer** without a follow-up — it's load-bearing for auditors.

---

## 1. Tasks (open) — ordered by impact

### C-A1 — Remediation task tracking (Critical)
**Why:** Today users save free-form notes into the void. Real GRC tools track owner / due-date / status per failing control. This is the #1 stickiness driver.

**Where:** `src/db/schema.js`, `src/routes/controls.js`, `comply/src/app/dashboard/controls/[id]/page.tsx`.

**Do:**
- New columns on `control_results`: `remediationOwnerId uuid REFERENCES users(id)`, `remediationDueDate timestamp`, `remediationStatus text` (enum: `open | in_progress | blocked | completed | exempted`), `remediationStartedAt timestamp`, `remediationCompletedAt timestamp`.
- `PATCH /api/v1/controls/:id/remediation` accepts `{ ownerId?, dueDate?, status?, note? }`.
- Control detail page: "Remediation" panel with assignee dropdown (org members), due-date picker, status pills, "Mark started" / "Mark blocked" / "Mark complete" buttons.
- Overview dashboard: new "My open remediation" card showing `WHERE remediationOwnerId = currentUserId AND remediationStatus IN (open, in_progress, blocked)` — sorted by due date asc.
- Send `control.remediation_assigned` event when ownerId set; `control.remediation_overdue` daily worker (new) when `dueDate < now AND status NOT IN (completed, exempted)`.

**Verify:** assign control → owner sees it on overview "My open remediation" → status flips correctly → overdue email/Slack arrives next day.

---

### C-A2 — Compliance score over time (Critical)
**Why:** "Are we improving?" is the question every executive asks. No historical chart today.

**Where:** new `src/jobs/scoreSnapshotWorker.js`, schema, `src/routes/controls.js`, overview dashboard.

**Do:**
- New table `compliance_score_snapshots` (orgId, framework, scoreOverall, scorePass, scoreFail, scoreReview, scoreTotal, capturedAt). Daily 04:00 UTC cron computes one row per org per framework.
- Endpoint `GET /api/v1/controls/score/history?days=30|90|365&framework=soc2` → time series.
- Overview page: line chart above framework cards with toggle (Overall / SOC2 / ISO / GDPR / HIPAA / PCI). Show MoM delta in header: "+8% vs 30d ago".
- Backfill: on first run, generate one synthetic snapshot from current state so the chart isn't empty.

**Verify:** force the cron → row inserted → chart shows a single point → run again next day → chart shows two points + delta math correct.

---

### C-A3 — Exemption / exception workflow (Critical)
**Why:** "This control doesn't apply to us" is real and legal teams need a paper trail. Today users only have free-form notes.

**Where:** schema, `src/routes/controls.js`, `src/routes/exemptions.js` (new), control detail UI.

**Do:**
- New table `control_exemptions` (id, orgId, controlDefId, requestedBy, approvedBy, reason text, justification text, expiresAt timestamp, status `pending | approved | rejected | expired`, createdAt, decidedAt). One active row per (orgId, controlDefId).
- `POST /api/v1/exemptions` (any member) — creates `pending`. `PATCH /api/v1/exemptions/:id` (admin/owner) — approves or rejects. Daily worker expires rows past `expiresAt` and re-evaluates the control.
- When approved: `control_results.status` virtually treated as `not_applicable`; UI shows "Exempted until <date> by <approver>" badge instead of fail/pass.
- Export: include exemptions in PDF evidence reports.

**Verify:** request exemption → admin approves → control changes display state → expiry past → status reverts.

---

### C-A4 — Document/evidence file upload (Critical)
**Why:** Manual evidence is text-only today. Auditors want PDFs, screenshots, certificates. S3 bucket already wired.

**Where:** `src/routes/evidence.js`, schema, manual evidence UI.

**Do:**
- New table `evidence_files` (id, orgId, evidenceId, controlDefId, filename, mimeType, sizeBytes, s3Key, uploadedBy, uploadedAt). Existing `evidence` rows can have many files.
- `POST /api/v1/evidence/:id/files` — multipart upload (use existing fastify-multipart or add `@fastify/multipart`); enforce 10MB cap, allowed mime types `pdf|png|jpg|csv|xlsx|docx`.
- `GET /api/v1/evidence/:id/files` — list. `DELETE /api/v1/evidence/files/:fileId` (admin).
- File served via signed S3 URL, 5-minute TTL, never public.
- Manual evidence UI: drag-and-drop zone, file list with download, delete (admin), preview-on-hover for PDFs/images.
- PDF export: append "Attached evidence files" section listing every file with link.

**Verify:** upload PDF → appears in list → signed URL downloads correctly → expires after 5 min → admin can delete; member cannot.

---

### C-A5 — Comments per control (High)
**Why:** Collaboration around remediation. Drata/Vanta have control-level threads; today users can't ask "who's blocked?".

**Where:** schema, `src/routes/controls.js`, control detail UI.

**Do:**
- New table `control_comments` (id, orgId, controlDefId, authorId, body text, parentCommentId nullable, createdAt, editedAt, deletedAt).
- `GET /api/v1/controls/:id/comments`, `POST .../comments`, `PATCH .../comments/:cid` (author only), `DELETE .../comments/:cid` (author or admin — soft delete).
- Mentions: `@username` parsed server-side; if user in same org → push notification (Slack DM to that user if Slack connected, else email).
- Comments rendered with author avatar, time-ago, edit indicator, soft-deleted shown as "Comment removed".

**Verify:** post comment, edit, delete; mention → recipient gets DM/email; thread reply renders nested.

---

### C-A6 — Audit calendar + deadline tracking (High)
**Why:** "SOC 2 Type II expires 2026-07-15, 142 days remaining" with burn-down — the executive view that justifies the platform.

**Where:** new schema, new `src/routes/audits.js`, new dashboard page `audits/page.tsx`.

**Do:**
- New table `audits` (id, orgId, framework, type `'type1'|'type2'|'iso'|'gdpr'|'hipaa'|'pci'`, status `'planning'|'in_progress'|'complete'`, kickoffAt, fieldworkAt, expectedCloseAt, completedAt, auditorFirm text, notes text).
- CRUD endpoints. Daily worker enqueues reminder at T-90 / T-30 / T-7 / T-1 days for `expectedCloseAt`.
- New page `comply/src/app/dashboard/audits/page.tsx`: list with status pills + days-remaining countdowns. Click → detail with framework score history (uses C-A2), open remediations (uses C-A1), open exemptions (C-A3), evidence files (C-A4).
- Overview dashboard: "Upcoming audits" card showing next audit with countdown.
- iCal export: `GET /api/v1/audits/calendar.ics` returns VEVENT per audit milestone.

**Verify:** create audit → countdown matches → import .ics into Google Calendar → events appear → reminder fires at T-7.

---

### C-A7 — RBAC enforcement + auditor role (High)
**Why:** Roles exist in the UI today but the API trusts everyone. Live security gap.

**Where:** `src/middleware/auth.js` (extend), every route file under `src/routes/`.

**Do:**
- New middleware `requireRole(roles[])` — checks `request.user.role`. Add `'auditor'` to the role enum.
- Apply role guards to every state-changing route (POST/PATCH/DELETE):
  - `'owner'` only: org settings, plan changes, user role changes.
  - `'admin'` or `'owner'`: integrations, webhooks, exemptions approval, evidence file deletion, audits CRUD.
  - `'member'` or above: comments, remediation status updates on owned items, evidence creation, vendor CRUD.
  - `'auditor'`: read everything, write nothing. All POST/PATCH/DELETE return 403.
- Team page: add "auditor" option to invite role dropdown.
- Sweep existing routes — there are routes today calling `requireUser` only that should be `requireAdmin` (e.g. integration delete, webhook CRUD already correct, but verify).

**Verify:** invite a user as auditor → log in as them → controls list works → POST comments returns 403 → evidence upload returns 403.

---

### C-A8 — Audit trail / change log (High)
**Why:** "Who changed what, when?" — auditors ask this constantly. Audit table exists; surfacing it doesn't.

**Where:** `src/routes/audit.js` (new — distinct from C-A6 `audits.js`), dashboard.

**Do:**
- New endpoint `GET /api/v1/audit-log?orgId&actor&action&start&end&limit&cursor` reading the existing `audit_log` table, filtered by orgId.
- New page `comply/src/app/dashboard/audit-log/page.tsx` (admin/owner/auditor only): paginated table with filters (actor, action, date range), JSON-pretty metadata viewer per row, CSV export.
- Add audit entries everywhere they're missing: every PATCH on remediation, comments create/edit/delete, exemption decisions, file uploads/deletes, role changes, webhook config changes.

**Verify:** make 5 edits across the app → all 5 appear in audit log with correct actor/action/metadata → filter by actor works → CSV exports correct columns.

---

### C-A9 — Vendor cert expiry alerts (Medium)
**Why:** Vendor risk is already tracked but expiry detection is manual.

**Where:** `src/jobs/scheduler.js`, `src/services/email.js`, vendors page.

**Do:**
- Daily 06:00 UTC worker: for each org, find vendors where `certExpiresAt` is within 30/14/7/1 days. Send email + Slack + webhook (`vendor.cert_expiring` event). Idempotent — track last alerted threshold per vendor in a new column.
- Vendors page: show count of expiring-soon as a sticky banner.
- Overview dashboard: "Vendor risk" card with expiring count.

**Verify:** seed vendor with cert expiring in 7 days → next cron → email/Slack arrives → banner shown.

---

### C-A10 — Compliance posture export (one-pager) (Medium)
**Why:** Sales / partner enablement. "Send me your security posture" is a weekly request.

**Where:** new `src/services/pdf/postureReport.js`, endpoint, dashboard.

**Do:**
- Endpoint `GET /api/v1/compliance/posture.pdf` — branded one-pager: org logo, score per framework, certifications, last audit, vendor coverage, list of subprocessors (vendor names if marked `isSubprocessor`).
- Add `vendors.isSubprocessor` boolean column.
- Dashboard "Share" button on overview → downloads PDF.
- Optional: shareable read-only link `/posture/{token}` (token table, 30-day TTL, revocable). Stretch — defer if time-tight.

**Verify:** generate PDF → opens, looks branded, all sections populated. Empty-state handling for missing data.

---

### C-A11 — Control prerequisites / dependencies (Medium)
**Why:** Some controls are conditional on others (e.g., "MFA enforcement" depends on "Identity provider configured"). Today they fail independently and confuse remediation order.

**Where:** `src/db/schema.js`, control detail UI.

**Do:**
- Add `controlDefinitions.prerequisites` jsonb column (array of controlIds).
- Surface in detail: "Required first: <controlId> — <title> · <status>" with link.
- If a prerequisite is failing, show "Blocked by upstream control" banner instead of generic remediation guidance.
- Seed prerequisites for ~10 obvious cases (MFA → IdP, encryption-at-rest → key-mgmt, etc.).

**Verify:** failing prereq → dependent control shows blocked banner. Prereq passes → banner clears.

---

### C-A12 — Bulk actions on controls (Low)
**Why:** Selecting 20 failing controls and assigning them all to one engineer should be one click, not 20.

**Where:** controls list page, controls API.

**Do:**
- Multi-select checkboxes on controls list.
- Toolbar appears on selection: "Assign to…" / "Set due date…" / "Add to exemption batch…".
- Endpoint `PATCH /api/v1/controls/bulk` accepts `{ ids: [...], remediationOwnerId?, remediationDueDate?, remediationStatus? }`.

**Verify:** select 5 controls → bulk-assign owner → all 5 reflect change immediately.

---

### C-A13 — Control mapping to regulation clauses (Low)
**Why:** Auditors cite specific clauses ("SOC 2 CC6.1: Logical access enforced"). Today control IDs are internal.

**Where:** `controlDefinitions.clauseRefs` jsonb (array of `{ framework, clause, url }`), control detail UI.

**Do:**
- Add column. Seed for SOC 2 Trust Services Criteria, ISO 27001 Annex A, GDPR articles, HIPAA citations, PCI DSS requirements.
- Detail page: "Maps to" section linking each clause (external links to AICPA, ISO, EU, HHS, PCI SSC where public).

**Verify:** detail page shows correct clauses with working external links.

---

## 2. New API surface

```
PATCH  /api/v1/controls/:id/remediation              C-A1
GET    /api/v1/controls/score/history                C-A2
GET    /api/v1/controls/:id/comments                 C-A5
POST   /api/v1/controls/:id/comments                 C-A5
PATCH  /api/v1/controls/comments/:cid                C-A5
DELETE /api/v1/controls/comments/:cid                C-A5
PATCH  /api/v1/controls/bulk                         C-A12

POST   /api/v1/exemptions                            C-A3
PATCH  /api/v1/exemptions/:id                        C-A3
GET    /api/v1/exemptions                            C-A3

POST   /api/v1/evidence/:id/files                    C-A4
GET    /api/v1/evidence/:id/files                    C-A4
DELETE /api/v1/evidence/files/:fileId                C-A4

GET    /api/v1/audits                                C-A6
POST   /api/v1/audits                                C-A6
PATCH  /api/v1/audits/:id                            C-A6
DELETE /api/v1/audits/:id                            C-A6
GET    /api/v1/audits/calendar.ics                   C-A6

GET    /api/v1/audit-log                             C-A8
GET    /api/v1/compliance/posture.pdf                C-A10
```

Webhook events (new): `control.remediation_assigned`, `control.remediation_overdue`, `control.exempted`, `control.exemption_expired`, `evidence.file_uploaded`, `audit.upcoming`, `vendor.cert_expiring`.

---

## 3. Order of operations

1. **C-A7** (RBAC) — security gap; do first so subsequent endpoints are correctly protected on day one.
2. **C-A1** (remediation tracking) — biggest stickiness lever.
3. **C-A2** (score over time) — no schema gymnastics, big visual.
4. **C-A3** (exemptions) — completes the "deal with failing controls" loop with C-A1.
5. **C-A4** (file upload) — auditor moment of truth.
6. **C-A5** (comments) — light layer once C-A1 lands.
7. **C-A6** (audit calendar) — depends on C-A2 for score charts in audit detail.
8. **C-A8** (audit log surface) — wraps everything above by giving visibility.
9. **C-A9** (vendor cert alerts) — small, can slot in any time.
10. **C-A10** (posture PDF) — depends on C-A2/C-A6 data being right.
11. **C-A11** (prerequisites) — content-heavy; can ship later.
12. **C-A12** (bulk actions) — pure UX win.
13. **C-A13** (clause mapping) — content-heavy; last.

---

## 4. Verification checklist (every task)

- [ ] `node --check` passes for every touched .js.
- [ ] Migration runs cleanly on a fresh DB.
- [ ] All endpoints return 401 unauth, 403 wrong-role, 404 wrong-org.
- [ ] No console errors in browser preview.
- [ ] Empty / loading / error states designed and tested.
- [ ] Mobile breakpoint not broken (do-no-harm).
- [ ] Audit log entry exists for every state-changing action introduced.
- [ ] Webhook + Slack + email fan-out tested on a representative event.

---

## 5. Done

*(empty — fill as: `C-A2 — score history — src/routes/controls.js + src/jobs/scoreSnapshotWorker.js + comply/src/app/dashboard/page.tsx — verified 2026-04-26`)*

---

## 6. Non-goals

- Custom framework authoring UI (C10 deferred).
- AI Q&A chatbot (C15 deferred).
- Trust Center external pages (C1 separate stream).
- Security questionnaire automation (C9 deferred).
- HRIS / MDM integrations (C14 deferred).
- ISO 42001 / NIST AI RMF library (C11 deferred).
- Cross-framework evidence reuse engine (C13 deferred — needs design).
