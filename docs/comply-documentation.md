# iFU Labs — Comply Documentation

```
---------------------------------------
iFU Labs

Comply Documentation

Confidential | Version 1.0

© 2026 iFU Labs. All Rights Reserved.
---------------------------------------
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [Core Features](#3-core-features)
4. [How It Works — Architecture Overview](#4-how-it-works--architecture-overview)
5. [User Guide](#5-user-guide)
6. [API Documentation](#6-api-documentation)
7. [Configuration Guide](#7-configuration-guide)
8. [FAQ](#8-faq)
9. [Troubleshooting](#9-troubleshooting)
10. [Security & Compliance Notes](#10-security--compliance-notes)

---

## 1. Overview

### What is iFU Labs Comply?

iFU Labs Comply is a continuous compliance and governance platform that automates evidence collection, tracks control status, and keeps your organisation audit-ready — without spreadsheets or manual screenshots.

Comply connects to your AWS infrastructure and GitHub repositories, runs automated checks against recognised compliance frameworks, and maps the results directly to the controls auditors will test. When something drifts, you know before your auditor does.

### Who is it for?

| Audience | Use Case |
|---|---|
| CTOs / Security leads | Maintain continuous SOC 2, ISO 27001, HIPAA, or GDPR posture |
| DevOps / Platform teams | Close control gaps identified in automated scans |
| Compliance managers | Export evidence packages and track remediation progress |
| Enterprise buyers | Demonstrate audit-readiness to customers and partners |

### Key Value Proposition

- **Automated evidence collection** — connects to AWS and GitHub to gather evidence continuously, no manual work required
- **Multi-framework support** — SOC 2 (Starter & Growth), ISO 27001, GDPR, HIPAA, PCI DSS (Growth)
- **AI-powered remediation guidance** — Claude explains failing controls in plain English and suggests fixes including Infrastructure-as-Code snippets (Growth plan)
- **Audit-ready evidence packages** — export a PDF evidence report per framework, ready to hand to auditors
- **Vendor risk management** — track third-party vendor certifications and get alerted before they expire
- **Drift alerts** — get notified by email and Slack the moment a passing control fails

---

## 2. Getting Started

### Prerequisites

- An active iFU Labs account (Starter or Growth plan)
- AWS account administrator access (for the AWS integration)
- GitHub organisation admin access (for the GitHub integration)

### Step 1 — Create Your Organisation

1. Sign up at [app.ifulabs.com](https://app.ifulabs.com)
2. Complete the onboarding form with your company name and compliance goals
3. Select your target frameworks
4. Your organisation is provisioned with the relevant control library

### Step 2 — Connect AWS

1. Go to **Comply → Integrations → AWS**
2. Follow the guided IAM role setup (same cross-account STS pattern as FinOps)
3. Required AWS permissions:
   - IAM read (`iam:List*`, `iam:Get*`)
   - S3 read (`s3:GetBucketAcl`, `s3:GetBucketLogging`, `s3:GetBucketVersioning`, `s3:GetBucketEncryption`, `s3:GetPublicAccessBlock`)
   - CloudTrail read (`cloudtrail:GetTrail`, `cloudtrail:GetTrailStatus`, `cloudtrail:DescribeTrails`)
   - RDS read (`rds:DescribeDBInstances`, `rds:DescribeDBClusters`)
   - GuardDuty read (`guardduty:GetDetector`, `guardduty:ListDetectors`)
4. Click **"Validate & Connect"**

### Step 3 — Connect GitHub

1. Go to **Comply → Integrations → GitHub**
2. Click **"Install GitHub App"** — you will be redirected to GitHub to authorise iFU Labs
3. Select the repositories you want to include in compliance scans
4. GitHub checks covered: branch protection rules, secret scanning enablement, CODEOWNERS file presence

### Step 4 — Run Your First Scan

1. Go to **Comply → Scans**
2. Click **"New Scan"**
3. BullMQ queues the scan — progress is streamed in real time
4. Once complete, go to **Controls** to see which controls pass, fail, or need review

---

## 3. Core Features

### 3.1 Controls Library

Comply ships with a pre-built controls library mapped to each supported framework. Controls are automatically checked where automation is possible; the remainder surface as manual review items.

**Supported frameworks and control counts:**

| Framework | Controls | Plan |
|---|---|---|
| SOC 2 | ~25 controls | Starter & Growth |
| ISO 27001 | ~30 controls | Growth |
| GDPR | ~20 controls | Growth |
| HIPAA | ~15 controls | Growth |
| PCI DSS 4.0 | 29 controls | Growth |

**Control statuses:**

| Status | Meaning |
|---|---|
| `pass` | Automated check passed or evidence manually marked as compliant |
| `fail` | Automated check failed — action required |
| `review` | Check requires manual review |
| `not_applicable` | Control is not applicable to this organisation |
| `pending` | Control has not yet been evaluated |

Each control includes: framework, category, title, description, severity, guidance, and remediation workflow fields (owner, due date, status).

### 3.2 Automated Evidence Collection

Comply collects evidence from connected integrations automatically on each scan. Manual evidence upload is also supported for controls that cannot be automated.

**AWS evidence collected:**

| Check area | What is verified |
|---|---|
| IAM | MFA enforcement, password policy, root account usage, key rotation, least privilege |
| S3 | Public access blocks, bucket encryption, versioning, access logging |
| CloudTrail | Trail enabled, multi-region, log file validation, S3 logging |
| RDS | Encryption at rest, automated backups, multi-AZ configuration |
| GuardDuty | Detector enabled and active |

**GitHub evidence collected:**

| Check area | What is verified |
|---|---|
| Branch protection | Protected default branch, required reviews, dismiss stale reviews |
| Secret scanning | Secret scanning enabled on repositories |
| CODEOWNERS | CODEOWNERS file present |

**Manual evidence** can be uploaded via the Evidence page. Supported formats: any file type (stored in S3). Each manual evidence item is linked to a specific control result.

### 3.3 Compliance Score

The dashboard shows a real-time compliance score (0–100) for each framework. The score is calculated as:

```
Score = (passing controls / total applicable controls) × 100
```

Score snapshots are taken after each scan and stored for trend tracking.

### 3.4 Scans

Each scan is a full run of all automated checks across your connected integrations. Scans are:

- **Triggered manually** from the Scans page at any time
- **Scheduled automatically** daily at 02:00 UTC
- **Processed by BullMQ** — scan progress is visible in real time

Each scan record includes start time, end time, status, and a detailed results breakdown.

### 3.5 Evidence Export (PDF)

From the Evidence page, you can export a formatted PDF evidence report per framework. The PDF includes:

- Organisation name and export date
- Framework name and total control count
- Pass/fail/review breakdown
- Individual control results with evidence details and notes

This report is designed to be handed directly to an auditor or attached to a compliance questionnaire.

### 3.6 AI-Powered Remediation Guidance (Growth Plan)

For any failing control, Comply can generate an AI explanation covering:

- Why the control is failing in plain English
- Step-by-step remediation instructions
- Infrastructure-as-Code suggestions (Terraform / CloudFormation where applicable)

AI explanations are generated by Claude and cached for 24 hours per control per organisation.

### 3.7 Vendor Risk Management

The Vendors module lets you track third-party vendors and their compliance certifications. For each vendor you can record:

- Risk level: `critical`, `high`, `medium`, `low`
- SOC 2 report expiry date
- ISO 27001 certificate expiry date
- Notes and contact information

Vendor certification status is automatically annotated:

| Status | Meaning |
|---|---|
| `valid` | Certificate is current |
| `expiring` | Expires within 60 days |
| `expired` | Certificate has expired |

The Vendors dashboard shows summary stats: total vendors, critical vendors, expiring soon, and expired.

### 3.8 Control Drift Alerts

When a control moves from `pass` to `fail` between two consecutive scans, Comply triggers a drift alert:

- **Email** — sent to all organisation admin users
- **Slack** — posted to your configured Slack channel (if Slack is connected)
- **Webhook** — `control.drift` event fired to all configured webhook endpoints

### 3.9 Webhooks

Comply supports outbound webhooks for the following events:

| Event | Trigger |
|---|---|
| `scan.complete` | A compliance scan finishes |
| `control.drift` | One or more controls move from `pass` to `fail` |

All payloads are signed with HMAC-SHA256. Deliveries are retried up to 5 times on failure.

### 3.10 Slack Integration

Connect Comply to Slack to receive:

- Control drift notifications in your security or compliance channel
- Scan completion summaries

Managed via **Comply → Integrations → Slack**.

### 3.11 Team Management

Invite team members to your Comply organisation and assign them to control remediation tasks. Plans:

- **Starter** — up to 3 team members
- **Growth** — unlimited team members

Each control can be assigned a remediation owner and due date, with a workflow status (`open`, `in_progress`, `blocked`, `completed`, `exempted`).

### 3.12 Audit Log

Every action taken in Comply is recorded in an immutable audit log:

- User ID and organisation ID
- Action type and timestamp
- Metadata (e.g. control ID, scan ID)

The audit log is accessible to admins under **Comply → Audit Log** and is available via API.

---

## 4. How It Works — Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      iFU Labs Comply                            │
│                                                                │
│  Next.js Frontend ──► Fastify API ──► PostgreSQL (controls,    │
│                          │             evidence, results)       │
│                     BullMQ + Redis                             │
│                          │                                     │
│              ┌───────────┼────────────┐                        │
│              ▼           ▼            ▼                        │
│         scanWorker  notificationWorker  webhookWorker           │
│              │                                                 │
│         AWS Connector  GitHub Connector  AI Service (Claude)   │
└────────────────────────────────────────────────────────────────┘
         │                    │
  STS AssumeRole         GitHub App
         │                    │
┌────────────────┐    ┌──────────────────┐
│  Your AWS Acct │    │  Your GitHub Org  │
│  IAM · S3 ·   │    │  Branch protect   │
│  CloudTrail ·  │    │  Secret scanning  │
│  RDS · GuardDuty│   │  CODEOWNERS      │
└────────────────┘    └──────────────────┘
```

### Key Modules

| Module | Location | Purpose |
|---|---|---|
| AWS checks | `src/connectors/aws/checks/` | IAM, S3, CloudTrail, RDS, GuardDuty, EC2 checks |
| GitHub checks | `src/connectors/github/checks.js` | Branch protection, secret scanning, CODEOWNERS |
| Scan worker | `src/jobs/scanWorker.js` | BullMQ worker — runs checks, stores results, detects drift |
| Notification worker | `src/jobs/notificationWorker.js` | Sends drift email and Slack alerts |
| Webhook worker | `src/jobs/webhookWorker.js` | Delivers signed webhook payloads with retry |
| Scheduler | `src/jobs/scheduler.js` | Daily 02:00 UTC cron for automated scans |
| AI service | `src/services/ai.js` | Claude-powered control explanations |
| PDF service | `src/services/pdf/evidenceReport.js` | Evidence report PDF generation |
| Plan middleware | `src/middleware/plan.js` | Framework and feature gating by plan |

---

## 5. User Guide

### Reviewing Controls

1. Go to **Comply → Controls**
2. Filter by framework (e.g. SOC 2) and/or status (e.g. `fail`)
3. Click any control to open the detail view
4. The detail view shows: description, guidance, current status, evidence, notes, and AI remediation (Growth)

### Assigning Remediation

1. On the control detail page, click **"Assign Owner"**
2. Select a team member and set a due date
3. Set the remediation status to `in_progress`
4. The assigned team member receives a notification

### Uploading Manual Evidence

1. Go to **Comply → Evidence**
2. Click **"Upload Evidence"**
3. Select the control this evidence supports
4. Upload the file (screenshots, reports, policies, etc.)
5. Add a title and description

### Exporting an Evidence Report (PDF)

1. Go to **Comply → Evidence**
2. Click **"Export PDF"**
3. Select the framework
4. The PDF downloads immediately — ready for your auditor

### Managing Vendors

1. Go to **Comply → Vendors**
2. Click **"Add Vendor"**
3. Fill in vendor name, risk level, and certification expiry dates
4. Comply will automatically flag vendors as `expiring` (< 60 days) or `expired`

### Configuring Slack Alerts

1. Go to **Comply → Integrations → Slack**
2. Click **"Connect Slack"** — you are redirected to Slack's OAuth flow
3. Authorise the iFU Labs app to your workspace
4. Select the channel for compliance notifications
5. Click **"Test"** to send a test message

---

## 6. API Documentation

All Comply API endpoints are under `/api/v1/` and require a Bearer token.

**Authentication:**
```
Authorization: Bearer <your-jwt-token>
```

---

### Controls

#### `GET /api/v1/controls`

List all controls with their latest results for this organisation.

**Query parameters:**

| Parameter | Type | Values |
|---|---|---|
| `framework` | string | `soc2`, `iso27001`, `gdpr`, `hipaa`, `pci_dss` |
| `status` | string | `pass`, `fail`, `review`, `not_applicable`, `pending` |

**Response:**
```json
[
  {
    "id": "ctrl_abc123",
    "controlId": "CC6.1",
    "framework": "soc2",
    "category": "Logical and Physical Access",
    "title": "Logical Access Controls",
    "description": "The entity implements logical access security software...",
    "severity": "high",
    "automatable": true,
    "status": "pass",
    "lastChecked": "2026-05-03T02:00:00.000Z",
    "evidence": { "mfaEnabled": true, "passwordPolicy": {...} },
    "remediationOwnerId": null,
    "remediationDueDate": null,
    "remediationStatus": null
  }
]
```

> **Plan restriction:** Requesting a framework not included in your plan returns `403 PLAN_UPGRADE_REQUIRED`.

---

#### `GET /api/v1/controls/:id`

Get full detail for a single control including history and notes.

---

#### `PATCH /api/v1/controls/:id`

Update a control's notes, remediation owner, due date, or status.

**Request body:**
```json
{
  "notes": "Root cause: IAM policy too permissive. Fix in progress.",
  "remediationOwnerId": "user_xyz",
  "remediationDueDate": "2026-06-01",
  "remediationStatus": "in_progress"
}
```

---

#### `GET /api/v1/controls/score`

Get compliance score per framework for this organisation.

**Response:**
```json
{
  "soc2": { "score": 84, "pass": 21, "fail": 3, "review": 1, "total": 25 },
  "iso27001": { "score": 73, "pass": 22, "fail": 6, "review": 2, "total": 30 }
}
```

---

### Scans

#### `GET /api/v1/scans`

List the 20 most recent scans.

**Response:**
```json
[
  {
    "id": "scan_abc123",
    "orgId": "org_xyz",
    "status": "completed",
    "createdAt": "2026-05-03T02:00:00.000Z",
    "completedAt": "2026-05-03T02:04:32.000Z",
    "results": { "pass": 45, "fail": 8, "review": 3 }
  }
]
```

---

#### `GET /api/v1/scans/:id`

Get a single scan. If the scan is still running, returns live BullMQ progress.

**Response (running):**
```json
{
  "id": "scan_abc123",
  "status": "running",
  "progress": 45
}
```

---

### Evidence

#### `GET /api/v1/evidence`

List automated and manual evidence items.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `framework` | string | Filter by framework |
| `limit` | integer | Max items to return (default 50) |

**Response:**
```json
{
  "automated": [
    {
      "controlId": "CC6.1",
      "title": "Logical Access Controls",
      "framework": "soc2",
      "status": "pass",
      "evidence": { "mfaEnabled": true },
      "checkedAt": "2026-05-03T02:04:00.000Z"
    }
  ],
  "manual": [
    {
      "id": "ev_xyz",
      "title": "Annual security training completion report",
      "description": "CSV export from LMS showing 100% completion",
      "collectedAt": "2026-04-15T10:00:00.000Z"
    }
  ],
  "total": 48
}
```

---

#### `POST /api/v1/evidence`

Upload manual evidence.

**Request body:**
```json
{
  "title": "Penetration test report 2026",
  "description": "External pentest conducted by XYZ Security",
  "controlResultId": "result_abc123",
  "data": { "vendor": "XYZ Security", "date": "2026-03-01" }
}
```

---

#### `GET /api/v1/evidence/export/pdf?framework=soc2`

Download a PDF evidence report for the specified framework.

Returns a PDF file (`Content-Disposition: attachment`).

---

### AI

#### `POST /api/v1/ai/explain/:controlId`

Generate an AI explanation and remediation guidance for a failing control. **Growth plan only.**

**Response (SSE stream):**
```
data: {"type":"chunk","content":"This control is failing because..."}
data: {"type":"chunk","content":" your IAM password policy does not enforce..."}
data: {"type":"done"}
```

---

### Vendors

#### `GET /api/v1/vendors`

List all vendors.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `riskLevel` | string | Filter by `critical`, `high`, `medium`, `low` |
| `expiringSoon` | boolean | Only return vendors with certs expiring within 60 days |

---

#### `POST /api/v1/vendors`

Create a vendor.

**Request body:**
```json
{
  "name": "Stripe Inc.",
  "riskLevel": "high",
  "soc2ExpiresAt": "2026-11-30",
  "iso27001ExpiresAt": null,
  "notes": "Payment processor — critical"
}
```

---

### Webhooks

#### `GET /api/v1/webhooks`

List all configured webhooks.

#### `POST /api/v1/webhooks`

Create a webhook.

**Request body:**
```json
{
  "url": "https://your-system.com/hooks/comply",
  "events": ["scan.complete", "control.drift"],
  "description": "PagerDuty integration"
}
```

> Webhook URLs must use HTTPS.

#### `POST /api/v1/webhooks/:id/test`

Send a test event to a webhook endpoint.

#### `DELETE /api/v1/webhooks/:id`

Delete a webhook.

**Verifying webhook signatures:**
```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  )
}
```

---

### Slack

#### `GET /api/v1/slack/install`

Returns the Slack OAuth authorisation URL. Redirect the user to this URL to begin the install flow. Admin only.

#### `GET /api/v1/slack/callback`

OAuth callback — exchanges the code for a token and stores it. Handled automatically by the Slack OAuth flow.

#### `PATCH /api/v1/slack`

Set the default Slack channel for notifications.

```json
{ "channelId": "C0123456789" }
```

#### `GET /api/v1/slack/channels`

List available Slack channels in the connected workspace.

#### `POST /api/v1/slack/test`

Send a test message to the configured channel.

#### `DELETE /api/v1/slack`

Disconnect the Slack integration.

---

## 7. Configuration Guide

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string — used by BullMQ and caching |
| `JWT_SECRET` | Yes | Secret for signing authentication tokens |
| `ENCRYPTION_KEY` | Yes | AES-256 key for encrypting integration credentials at rest |
| `AWS_ACCESS_KEY_ID` | Yes | iFU Labs service account credentials for STS AssumeRole |
| `AWS_SECRET_ACCESS_KEY` | Yes | iFU Labs service account secret |
| `AWS_REGION` | No | Default region. Defaults to `us-east-1` |
| `S3_BUCKET` | Yes | S3 bucket for evidence file storage |
| `ANTHROPIC_API_KEY` | Yes (Growth) | API key for Claude AI remediation features |
| `SLACK_CLIENT_ID` | Yes (Slack) | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Yes (Slack) | Slack app client secret |
| `SLACK_REDIRECT_URI` | Yes (Slack) | OAuth redirect URI |
| `PORTAL_URL` | Yes | Base URL for portal redirect links |
| `SMTP_HOST` | Yes | SMTP server for drift alert emails |
| `SMTP_PORT` | Yes | SMTP port |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `SMTP_FROM` | Yes | Sender address for notification emails |

### Plan Features

| Feature | Starter | Growth |
|---|---|---|
| SOC 2 | ✅ | ✅ |
| ISO 27001 | ❌ | ✅ |
| GDPR | ❌ | ✅ |
| HIPAA | ❌ | ✅ |
| PCI DSS 4.0 | ❌ | ✅ |
| AI remediation guidance | ❌ | ✅ |
| Regulatory alerts | ❌ | ✅ |
| Max team members | 3 | Unlimited |

### Scheduled Scan Timing

Scans run daily at **02:00 UTC** via the BullMQ scheduler (`src/jobs/scheduler.js`). To change the schedule, update the cron expression in that file and restart the scheduler process.

---

## 8. FAQ

**Q: How often are controls checked automatically?**
A: Automated scans run daily at 02:00 UTC. You can also trigger a manual scan at any time from the Scans page.

**Q: Can I add controls that are not in the library?**
A: Custom frameworks are not yet supported. The pre-built library covers SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS 4.0. Custom framework support is on the roadmap.

**Q: Does Comply store my AWS data?**
A: Comply stores control check results (pass/fail/evidence metadata) in PostgreSQL. Raw AWS resource data is not stored. Evidence files uploaded manually are stored in an encrypted S3 bucket.

**Q: What is the difference between automated and manual evidence?**
A: Automated evidence is gathered by the AWS and GitHub connectors on each scan. Manual evidence is uploaded by your team — for example, penetration test reports, security training completion records, or vendor agreements.

**Q: Can I export evidence for a partial framework?**
A: The PDF export includes all controls for the selected framework. There is no partial export at this time.

**Q: What Slack permissions does Comply require?**
A: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`. Comply does not read message history or access private channels without explicit selection.

**Q: How does drift detection work?**
A: After each scan, the scan worker compares the new result for each control against the previously stored result. If any control moves from `pass` to `fail`, it is flagged as drifted and a notification is dispatched.

---

## 9. Troubleshooting

### Scan completes but controls show "pending"

Ensure your AWS and GitHub integrations are connected and show as **"connected"** on the Integrations page. Pending status means the control has not yet been evaluated — this typically means the scan could not reach the relevant integration.

### AWS checks failing silently

Check that the IAM role has the required permissions listed in the Getting Started section. Missing `guardduty:*` permissions are the most common omission. Individual check failures are logged as warnings and do not block the rest of the scan.

### AI remediation not appearing

Verify that `ANTHROPIC_API_KEY` is set and that your organisation is on the Growth plan. AI features return `403 PLAN_UPGRADE_REQUIRED` on Starter plans.

### Drift alerts not being sent

Check that `SMTP_*` environment variables are configured. Confirm the notification worker is running (`src/jobs/notificationWorker.js`). Check the `notifications` queue in Redis for failed jobs.

### PDF export is blank or incomplete

The PDF service requires completed scan results. Run a fresh scan and wait for it to complete before exporting. If the issue persists, check S3 permissions for the evidence bucket.

### Slack notifications not arriving

Verify the Slack integration is connected and a channel has been selected (`PATCH /api/v1/slack`). Use the test endpoint (`POST /api/v1/slack/test`) to confirm the connection is live.

### GitHub checks not running

Confirm the GitHub App is installed and has access to the target repositories. GitHub checks require `branch protection` read access at the repository or organisation level.

---

## 10. Security & Compliance Notes

### Data Security

- **Credentials encrypted at rest** — all integration credentials (AWS Role ARN, GitHub tokens, Slack tokens) are encrypted with AES-256 before storage in PostgreSQL
- **Short-lived AWS sessions** — STS sessions expire after 1 hour; no long-term credentials are stored
- **S3 evidence storage** — manual evidence files are stored in a dedicated, private S3 bucket with server-side encryption enabled
- **TLS in transit** — all API traffic is served over HTTPS; webhook delivery uses HTTPS only
- **JWT authentication** — all API endpoints require a verified JWT; tokens are validated on every request

### Access Control

- **Role-based access** — admin and standard user roles with different permission levels
- **Plan-based feature gating** — framework access and AI features are enforced server-side via middleware; client-side gating alone is never relied upon
- **Audit log** — every action (scan, control update, evidence upload, team change) is recorded immutably with user ID, organisation ID, and timestamp
- **Multi-tenancy isolation** — all database queries are scoped to `orgId`; cross-organisation data access is not possible

### Compliance Framework Coverage

Comply's control library is mapped to the following standards:

| Standard | Version | Controls |
|---|---|---|
| SOC 2 Type II | 2017 Trust Services Criteria | ~25 controls |
| ISO/IEC 27001 | 2022 | ~30 controls |
| GDPR | Regulation (EU) 2016/679 | ~20 controls |
| HIPAA | 45 CFR Parts 160 and 164 | ~15 controls |
| PCI DSS | Version 4.0 (all 12 requirements) | 29 controls |

> **Note:** Comply automates evidence collection for controls that have programmatic checks. Controls requiring human judgment (e.g. policy reviews, physical security) are surfaced as manual review items. Comply is a compliance management tool, not a substitute for a qualified auditor.

### Responsible Disclosure

If you discover a security vulnerability in iFU Labs Comply, please report it to **security@ifulabs.com**. We commit to acknowledging reports within 48 hours and resolving critical issues within 7 days.
