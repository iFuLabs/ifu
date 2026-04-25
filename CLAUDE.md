# CLAUDE.md — Brand Identity & Product Research

## Current task
FinOps and Comply product research and improvement suggestions. (Brand light-mode conversion is the prior task — preserved below.)

## FinOps current features
**App:** `finops/src/app/dashboard/*` · **Connector:** `src/connectors/finops/checks.js`
- Pages: Dashboard, Billing (Paystack), Integrations (AWS IAM-role), Team
- API: `GET /api/v1/finops` (6h cache), `/finops/stream` (SSE progress), `/finops/summary`
- Cloud: **AWS only**. STS AssumeRole + external ID for cross-account
- AWS APIs: Cost Explorer (spend, forecast, rightsizing, RI/SP coverage), EC2, ELB/ELBv2, RDS, CloudWatch, Pricing API, Bedrock (Claude 3 Haiku for AI summaries)
- Waste types (8): unattached EBS, unused EIPs, stopped EC2 (>30d), idle NAT, idle RDS, unused ALB/NLB/Classic LBs, old snapshots (>90d)
- Recommendations: rightsizing (top 20 from AWS) + waste CLI commands; RI/SP coverage shown read-only
- Forecast: end-of-month spend
- AI: Bedrock summary (2-3 sentences, fallback rule-based)
- Background jobs: scanWorker exists but **not wired** — scans are manual only
- **Absent:** budgets, tag-based allocation/showback, anomaly detection (only rule-based thresholds, no ML), Slack/email alerts, scheduled scans, multi-cloud, custom date ranges, exports/reports, K8s cost, RI/SP automation

## Comply current features
**App:** `comply/src/app/dashboard/*` · **Backend:** `src/routes/*`
- Pages: Dashboard, Controls (list/detail), Evidence, Integrations, Scans, Vendors, Team, Billing, FinOps widget
- API: Controls (list/score/detail/notes), Integrations (AWS/GitHub setup + sync + delete), Evidence (CRUD + PDF export per framework), Scans (list/detail + BullMQ progress), Vendors (CRUD), AI (`POST /ai/explain/:controlId` + SSE), Plan gating (`/plan/features`, `/plan/check/:feature`), Team (members + invitations), Billing (Paystack)
- Frameworks wired: SOC 2 (~25 controls, all plans), ISO 27001 (~30, Growth), GDPR (~20, Growth), HIPAA (~15, Growth). **PCI DSS = stub** (enum only)
- Evidence: Auto via AWS connector (IAM, S3, CloudTrail, RDS, GuardDuty), GitHub (branch protection, secret scanning, CODEOWNERS), manual S3 upload, AI-generated remediation (Claude, Growth, 24h cache)
- Integrations live: AWS, GitHub, Paystack, Auth0, Claude, S3, Redis, Postgres. **Stubs:** Okta, Google Workspace
- Jobs: Daily 2AM UTC scan scheduler + BullMQ worker
- Vendor risk: live (CRUD + cert expiry)
- **Absent:** Trust Center, policy management, employee training/lifecycle, risk register, auditor role, custom frameworks, security questionnaire automation, ISO 42001 / NIST AI RMF, MDM/HRIS integrations, Slack/email alerting

## Approved suggestions
- **F1** Wire scheduled FinOps scans — done 2026-04-25. New `finopsScanQueue` in `src/jobs/queues.js`, new `src/jobs/finopsWorker.js`, daily 03:00 UTC cron in `src/jobs/scheduler.js` (queries active FinOps subscriptions + connected AWS integrations). Worker registered in `src/index.js`.
- **C8** Control-drift email alerts — done 2026-04-25. `scanWorker.js` now snapshots prior statuses, computes pass→fail drift, enqueues `control-drift` jobs. New `src/jobs/notificationWorker.js` consumes the existing `notificationQueue`, looks up admins, sends email via new `sendControlDriftEmail` in `src/services/email.js`.
- **F7** CSV/JSON export for FinOps findings — done 2026-04-25. New `GET /api/v1/finops/export?format=csv|json` in `src/routes/finops.js`. Uses cached findings or runs fresh; CSV columns: category,type,resourceId,region,service,monthlySavings,annualSavings,confidence,recommendation.
- **F5** Custom date ranges for FinOps — done 2026-04-25. `GET /api/v1/finops` accepts `startDate` + `endDate` (ISO yyyy-mm-dd). `runFinOpsChecks` and `getCurrentSpend` plumbed through; multi-month ranges aggregate top services. Cache key now namespaced `finops:findings:{orgId}:{rangeKey}` with legacy-key fallback.
- **A2** Outbound webhooks — done 2026-04-25. Migration `0011_add_webhooks.sql` creates `webhooks` and `webhook_deliveries` tables. Service `src/services/webhooks.js` handles HMAC-SHA256 signing and delivery. Routes `src/routes/webhooks.js` provides CRUD + test endpoints. Worker `src/jobs/webhookWorker.js` processes deliveries with 5 retries. Integrated into `scanWorker.js` (scan.complete event) and `notificationWorker.js` (control.drift event).
- **C4** PCI DSS 4.0 controls — done 2026-04-25. Added 29 PCI DSS control definitions to `src/db/seed.js` covering all 12 requirements. 17 controls mapped to existing AWS check functions (iamChecks, s3Checks, rdsChecks, ec2Checks, cloudtrailChecks, guarddutyChecks). Added `pci_dss` to Growth-tier frameworks in `src/middleware/plan.js`. Seeded to production (77 total controls now).
- **F6** Recommendation workflow states — done 2026-04-25. Migration `0012_add_finops_recommendation_states.sql` creates table with states (open/snoozed/done). New API endpoints: `PATCH /api/v1/finops/recommendations/:resourceId/state` and `GET /api/v1/finops/recommendations/states`. UI added to `finops/src/app/dashboard/page.tsx` with state indicators, filter buttons, and inline state controls on waste/rightsizing cards.

## Pending suggestions

### FinOps
- ~~**F1** Wire scheduled scans~~ ✅ implemented
- **F2** Anomaly detection + Slack/email alerts (Critical, Medium)
- **F3** Tag-based allocation/showback (Critical, Medium)
- **F4** Budgets + variance alerts (High, Medium)
- ~~**F5** Custom date ranges~~ ✅ implemented (90-day trend chart still pending)
- ~~**F6** Recommendation workflow states (Open/Snoozed/Done)~~ ✅ complete
- ~~**F7** CSV export~~ ✅ implemented (monthly PDF report still pending)
- **F8** AI/GPU spend view (Bedrock/SageMaker/idle GPU) (High, Medium)
- **F9** FOCUS 1.1 export (High, Medium)
- **F10** Slack integration (Medium, Simple)
- **F11** Kubernetes cost (Defer)
- **F12** Multi-cloud Azure/GCP (Defer)
- **F13** RI/SP autopilot (Defer — high risk)

### Comply
- **C1** Trust Center w/ NDA-gated artifacts (Critical, Medium)
- **C2** Policy management module + employee ack (Critical, Medium)
- **C3** Employee lifecycle + training tracking (Critical, Medium)
- ~~**C4** PCI DSS 4.0 controls — load into existing stub enum~~ ✅ implemented (29 controls seeded)
- **C5** Okta + Google Workspace connectors — finish stubs (High, Simple)
- **C6** Risk register (High, Medium)
- **C7** AI evidence remediation w/ IaC suggestions (High, Complex)
- ~~**C8** Email alerts on control drift~~ ✅ implemented (Slack pending — needs Slack app C5/F10)
- **C9** Security questionnaire automation (High, Complex)
- **C10** Custom frameworks (Medium, Complex)
- **C11** ISO 42001 / NIST AI RMF (High, Medium)
- **C12** Auditor role + audit workflow (Medium, Medium)
- **C13** Cross-framework evidence reuse (Medium, Medium)
- **C14** MDM + HRIS integrations (Medium, Medium each)
- **C15** Trust Center AI Q&A chatbot (Medium, Complex)

### API & Integration
- **A1** Public REST API + API keys (Medium)
- ~~**A2** Webhooks out — control drift, anomaly, scan complete~~ ✅ complete
- **A3** Shared Slack app (Simple)
- **A4** Microsoft Teams connector (Simple)
- **A5** Jira / Linear ticket creation (Medium)
- **A6** PagerDuty / Opsgenie (Simple)
- **A7** GitHub Actions for compliance-as-code (Medium)
- **A8** Terraform provider (Complex)
- **A9** Okta + Google Workspace (overlaps C5)
- **A10** Jamf / Kandji / Intune (Medium)
- **A11** Rippling / Deel / Gusto (Medium)
- **A12** Azure + GCP ingestion (Complex)
- **A13** FOCUS 1.1 export (overlaps F9)
- **A14** Cost anomaly Slack/email subscription (overlaps F2)
- **A15** GitHub OAuth app (Medium)

### Recommended Quick Wins (high impact, low complexity)
F1, F5, F7, F10/A3, A2, C5, C8, F6, C4, C2

## Rejected suggestions
*(none yet)*

## Implementation queue
*(empty — F1, C8, F7, F5 all completed in this session)*

## AI handoff
- See `AI_HANDOFF_PROMPT.md` for detailed instructions for any AI continuing this work.

## Notes
- **Job infrastructure ready:** `src/jobs/scanWorker.js`, `queues.js`, `scheduler.js` exist and are used by Comply daily scans. Wiring FinOps onto same BullMQ infra is small.
- **PDF service ready:** `src/services/pdf/evidenceReport.js` already generates Comply PDFs — reusable for FinOps reports.
- **Plan gating middleware:** `src/middleware/plan.js` returns 403 `PLAN_UPGRADE_REQUIRED` — pattern to follow for new gated features.
- **AI infra:** Claude API + Bedrock both wired; 24h Redis caching + fallback patterns established (`src/services/ai.js`, `src/services/finops-ai.js`).
- **PCI DSS enum value already in `control_definitions.framework`** — needs only control library + check fn implementations.
- **Okta/Google Workspace types in integrations enum** — connector files don't exist yet.
- **Subscriptions table** (`drizzle/0009_*.sql`) already supports per-product plans — multi-product gating is in place.
- **Audit log table** is org-wide, immutable — usable for upcoming auditor-role workflow.
- **Vendors table** has cert expiry — alert wiring would be incremental.
- **AWS connector pattern** in `src/connectors/aws/checks/*` is the reference for adding new check fns (PCI controls, Okta evidence, etc.).
- **No K8s integration yet** — would require either CloudWatch Container Insights or OpenCost integration.
- **Cost Explorer data is the only cost source** — multi-cloud would require parallel Azure Cost Mgmt / GCP Billing connectors.
- **Light-mode brand conversion is in-progress on `brand-identity` branch** — see prior task table below.

## Todo
- Await explicit approval per suggestion before any implementation work.
- Resume website light-mode conversion (HomePageClient → about → for-startups → services → demos → legal pages) when product-research items are queued or deferred.

---

# Prior task — Brand Identity & Light-Mode Conversion (in progress)

## Source
Convert website + portal (auth/billing only) from dark to light mode using the official iFU Labs Brand Identity. Source: `/Users/titusquayson/Downloads/iFU Labs-compressed.pdf` → extracted to `brand.md`.

## Brand tokens (from PDF)
- **Palette**: Plum `#33063D` · Lavender `#DAC0FD` · Iris `#8A63E6` · White `#FFFFFF` · Grey `#F4F4F4` · Mint `#C8F6C0`
- **Typography**: Aeonik (sans) · PP Fragment (display ≥32pt) · Aeonik Fono (mono) · Arial (fallback)
- **Logos** (`website/public/logos/`): `plum.svg` (on light), `white.svg` (on plum/dark), `black.svg`, `lavender.svg`
- **Light-mode role map**:
  - bg `#FFFFFF` · surface `#F4F4F4` · elevated `#FFFFFF` · accent surface `#DAC0FD`
  - ink/primary text `#33063D` · muted `#33063D` @ 0.7 opacity · link `#8A63E6`
  - pragmatic border `#E5E5E5` (brand Grey too close to white for borders — documented deviation)

## Scope rules
- **In scope**: website (all pages), portal auth (login, forgot/reset/invite), portal onboarding, portal billing (subscribe, callback)
- **Out of scope**: comply dashboard, finops dashboard, portal dashboard interiors
- No copy / layout / functionality changes. Colors/typography/logos only.

## Status

| # | File | Status |
|---|------|--------|
| 1 | `brand.md` (root) | ✅ Created from PDF |
| 2 | `website/src/app/globals.css` | ✅ `:root` tokens flipped; dark hexes patched; svc-hero/cards/about/nav/footer/mobile drawer converted |
| 3 | `website/src/app/layout.tsx` | ✅ themeColor → `#FFFFFF` |
| 4 | `website/src/components/SiteNav.tsx` | ✅ Logo → `plum.svg` |
| 5 | `website/src/components/SiteFooter.tsx` | ✅ Logo → `plum.svg`; divider → `#33063D`; AWS → `powered-by-aws.png` |
| 6 | `website/src/components/Footer.tsx` | ✅ Same as SiteFooter |
| 7 | `website/src/components/BrandPatterns.tsx` | ✅ `CoBranding` logo switches by theme prop (billboard/social stay white — render on plum) |
| 8 | `website/src/components/CookieBanner.tsx` | ✅ No change needed — CSS-class only, covered by globals |
| 9 | `website/src/app/page.tsx` + `HomePageClient` | ⏳ Pending |
| 10 | `website/src/app/about/page.tsx` | ⏳ Pending |
| 11 | `website/src/app/for-startups/page.tsx` | ⏳ Pending |
| 12 | `website/src/app/services/page.tsx` + `[slug]/page.tsx` | ⏳ Pending |
| 13 | `website/src/app/demos/comply`, `demos/costless` | ⏳ Pending |
| 14 | `website/src/app/privacy`, `terms`, `acceptable-use` | ⏳ Pending |
| 15 | `website/src/app/schedule-consultation/page.tsx` | ⏳ Pending |
| 16 | `website/src/app/brand-showcase/page.tsx` | ⏳ Pending |
| 17 | `portal/src/app/globals.css` | ⏳ Pending |
| 18 | `portal/src/app/layout.tsx` + `page.tsx` | ⏳ Pending |
| 19 | `portal/src/app/login`, `forgot-password`, `reset-password/[token]`, `invite/[token]` | ✅ Done |
| 20 | `portal/src/app/onboarding/page.tsx` (1,436 lines) | ✅ Done |
| 21 | `portal/src/app/billing/subscribe`, `billing/callback` | ✅ Done |

## Open flags / deviations
- Border now `rgba(51, 6, 61, 0.2)` (Plum @ 20%) — meets WCAG 3:1 non-text contrast; replaces off-palette `#E5E5E5`.
- Muted text = Plum @ 0.7 opacity. Brand guidance discourages opacity on brand colors, but hierarchy needs it. Alternative: Iris for secondary text — noted, not yet applied.
- Primary button unified to Plum-fill / Iris-hover across website + portal (was Iris-fill on website, Plum-fill on portal — design-critique fix).
- Iris-on-white usage audited: limited to links, large display numerals, uppercase tracked labels, and icons — within brand's link-color role. Body text uses Plum/muted.

## Last completed
Design-critique fixes: unified primary button to Plum, raised hairline contrast to WCAG 3:1, audited Iris-on-white text. Portal auth/onboarding/billing all converted.

## Next up
Begin website page-by-page conversion starting with `HomePageClient`, then about, for-startups, services, demos, legal pages.
