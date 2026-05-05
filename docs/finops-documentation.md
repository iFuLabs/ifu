# iFU Labs — FinOps Documentation

```
---------------------------------------
iFU Labs

FinOps Documentation

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
10. [Security Notes](#10-security-notes)

---

## 1. Overview

### What is iFU Labs FinOps?

iFU Labs FinOps is a cloud cost management platform purpose-built for AWS environments. It connects to your AWS account via a secure cross-account IAM role, analyses your infrastructure spend in real time, and surfaces actionable savings opportunities — without ever requiring long-term credentials or direct access to your workloads.

FinOps gives your engineering and finance teams a single pane of glass for AWS spend visibility, waste elimination, rightsizing, and commitment planning.

### Who is it for?

| Audience | Use Case |
|---|---|
| Engineering leads | Identify idle resources and rightsizing opportunities before the next sprint |
| Finance / CFO | Track spend trends, forecasts, and potential annual savings |
| DevOps / Platform teams | Automate cost hygiene and act on CLI-ready recommendations |
| Startup CTOs | Keep cloud costs under control without a dedicated FinOps team |

### Key Value Proposition

- **See your waste in minutes** — connect your AWS account and run a scan to see exactly which resources are costing you money for nothing
- **Actionable, not advisory** — every finding includes a ready-to-run AWS CLI command
- **AI-powered summaries** — Claude (Amazon Bedrock) generates a plain-English digest of your findings
- **No IAM user credentials** — uses STS AssumeRole with an external ID, the AWS security best practice for cross-account access
- **Export-ready** — findings export as CSV or FOCUS 1.1 for integration with any FinOps toolchain

---

## 2. Getting Started

### Prerequisites

Before connecting FinOps, you need:

- An active iFU Labs account (Starter or FinOps plan)
- AWS account administrator access to create an IAM role
- The iFU Labs external ID (provided during setup)

### Step 1 — Create an IAM Role in Your AWS Account

FinOps uses AWS STS AssumeRole to access your account securely. You need to create a read-only cross-account role.

1. Log into your AWS console and navigate to **IAM → Roles → Create Role**
2. Select **"Another AWS account"** as the trusted entity
3. Enter the iFU Labs AWS Account ID (provided in your dashboard under Integrations)
4. Under **"Options"**, tick **"Require external ID"** and enter the external ID shown in your iFU Labs dashboard
5. Attach the following AWS managed policies:
   - `ReadOnlyAccess`
   - `CostExplorerFullAccess` *(required for spend and forecast data)*
6. Name the role (e.g. `iFU-Labs-FinOps-ReadOnly`) and create it
7. Copy the **Role ARN** — you will paste this into iFU Labs

### Step 2 — Connect the Integration

1. Log into [app.ifulabs.com](https://app.ifulabs.com) and go to **FinOps → Integrations**
2. Click **"Connect AWS Account"**
3. Paste the Role ARN from Step 1
4. Click **"Validate & Connect"**
5. iFU Labs will test the role with a live STS call — you will see a green confirmation on success

### Step 3 — Run Your First Scan

1. Go to **FinOps → Dashboard**
2. Click **"Run Scan"**
3. Watch real-time progress as iFU Labs checks your account across 8 waste categories
4. Your findings appear within 2–5 minutes depending on account size

> **Note:** Scan results are cached for 6 hours. Click "Refresh" to force a new scan at any time.

---

## 3. Core Features

### 3.1 Waste Detection

FinOps scans your AWS account for 8 categories of infrastructure waste. Each finding includes the resource ID, estimated monthly savings, severity rating (high / medium / low), and a ready-to-run AWS CLI command.

| Waste Type | Detection Logic | Typical Saving |
|---|---|---|
| Unattached EBS volumes | `available` state, older than 7 days | $5–$50/mo per volume |
| Unused Elastic IPs | Not associated to any resource | $3.60/mo per IP |
| Stopped EC2 instances | Stopped for more than 30 days | Storage cost of attached EBS |
| Idle NAT Gateways | < 1 GB traffic AND < 100 connections over 7 days | $35–$45/mo per gateway |
| Idle RDS instances | Zero connections AND < 5% avg CPU over 7 days | $50–$500/mo per instance |
| Unused ALB / NLB | No target groups or no healthy targets | $18–$25/mo per LB |
| Unused Classic Load Balancers | No healthy instances registered | $18/mo per LB |
| Old EBS snapshots | Older than 90 days, not managed by AWS Backup, > $2/mo estimated cost | Variable |

Findings are sorted by ROI (estimated savings × severity confidence) so the highest-impact items appear first.

### 3.2 Rightsizing Recommendations

FinOps retrieves EC2 rightsizing recommendations directly from AWS Cost Explorer. Recommendations cover:

- **Downsize** — move to a smaller instance in the same family (e.g. `m5.xlarge` → `m5.large`)
- **Terminate** — instances with consistently < 1% CPU utilisation

Up to 20 recommendations are returned, sorted by estimated monthly savings. Each includes current and target instance type, CPU and memory utilisation, and estimated savings.

### 3.3 Cost Trend & Spend Analysis

The trend chart shows your daily AWS spend broken down by your top 5 services over 30, 90, or 180 days. It includes:

- Day-by-day spend series with service-level breakdown
- Period-over-period comparison (current vs. prior equivalent period)
- Month-to-date total and end-of-month forecast

### 3.4 End-of-Month Cost Forecast

iFU Labs uses the AWS Cost Explorer Forecast API to project your spend to the end of the current month. The forecast is surfaced on the dashboard summary card and updated with each scan.

### 3.5 Tag-Based Cost Allocation

The **Allocation** page lets you group your AWS spend by any tag key (e.g. `Environment`, `Team`, `Project`). For each tag value you see:

- Spend for the selected period
- Percentage of total spend
- Month-over-month delta

Untagged resources are surfaced separately when they represent more than 5% of spend. Supported date ranges: month-to-date, custom start/end dates.

### 3.6 Reserved Instance & Savings Plans Coverage

FinOps shows your current RI and Savings Plans coverage for each AWS service with meaningful on-demand spend (> $50/month). Coverage below 70% triggers a gap alert.

### 3.7 Purchase Recommendations

The **Purchase Recommendations** page surfaces AWS Cost Explorer recommendations for:

- **Compute Savings Plans** — 1-year and 3-year terms, all payment options
- **EC2 Reserved Instances** — 1-year and 3-year, no-upfront

Each recommendation shows estimated monthly and annual savings, hourly commitment, upfront cost, estimated ROI, and break-even period in months.

### 3.8 AI/GPU Spend View

The **AI & GPU** page tracks spend on AI/ML AWS services and GPU EC2 instance families:

- **AI services tracked:** Bedrock, SageMaker, Comprehend, Rekognition, Textract, Transcribe, Translate, Polly
- **GPU families tracked:** g4dn, g4ad, g5, g5g, g6, p3, p4d, p4de, p5, inf1, inf2, trn1, dl1, dl2q
- Month-over-month delta for each service
- Idle GPU instance detection (< 5% avg CPU over 7 days)

### 3.9 AI Summary

After each scan, Claude (via Amazon Bedrock) generates a 2–3 sentence plain-English summary of your key findings and top savings opportunities. If Bedrock is unavailable, a rule-based fallback summary is generated automatically.

### 3.10 Recommendation Workflow States

Every waste and rightsizing recommendation can be triaged with a workflow state:

| State | When to use |
|---|---|
| `open` | Default — action not yet taken |
| `snoozed` | Acknowledged but deferred — requires a snooze-until date |
| `done` | Resource has been cleaned up |
| `dismissed` | Intentionally keeping the resource — requires a dismissal reason |

Dismissal reasons: `business_critical`, `cost_acceptable`, `pending_approval`, `wont_fix`, `other`.

State changes are logged to the audit trail.

### 3.11 Export

Findings can be exported on demand via the dashboard or API:

| Format | Contents |
|---|---|
| CSV | Category, resource ID, type, description, severity, monthly savings, recommendation |
| JSON | Full findings object including metadata |
| FOCUS 1.1 | FinOps Open Cost and Usage Specification format — compatible with any FOCUS-compliant tool |

### 3.12 Scheduled Scans

FinOps scans run automatically every day at 03:00 UTC for all organisations with a connected AWS integration. Results are cached and available in the dashboard without manual intervention.

### 3.13 Webhooks & Slack

FinOps integrates with your existing alerting and workflow tooling:

- **Webhooks** — receive `scan.complete` events at any HTTPS endpoint, signed with HMAC-SHA256
- **Slack** — post scan summaries to a Slack channel of your choice via the iFU Labs Slack app

---

## 4. How It Works — Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     iFU Labs FinOps                          │
│                                                             │
│  Next.js Frontend ──► Fastify API ──► AWS via STS Role      │
│                          │                                  │
│                     Redis Cache (6h)                        │
│                          │                                  │
│                     BullMQ Scheduler ──► Daily 03:00 UTC    │
│                          │                                  │
│                     Bedrock (Claude) ──► AI Summary          │
│                          │                                  │
│                     PostgreSQL ──► Audit log, states         │
└─────────────────────────────────────────────────────────────┘
                          │
              STS AssumeRole + External ID
                          │
┌─────────────────────────────────────────────────────────────┐
│                  Your AWS Account                            │
│                                                             │
│  Cost Explorer · EC2 · RDS · ELB/ELBv2 · CloudWatch        │
│  NAT Gateways · EBS · Snapshots · Pricing API               │
└─────────────────────────────────────────────────────────────┘
```

### Key Modules

| Module | Location | Purpose |
|---|---|---|
| FinOps connector | `src/connectors/finops/checks.js` | All AWS API calls and waste detection logic |
| FinOps routes | `src/routes/finops.js` | REST API endpoints, caching, auth |
| FinOps AI service | `src/services/finops-ai.js` | Bedrock-powered scan summaries |
| FinOps scheduler | `src/jobs/scheduler.js` | Daily cron at 03:00 UTC |
| FinOps worker | `src/jobs/finopsWorker.js` | BullMQ job processor for scheduled scans |
| Pricing service | `src/services/aws-pricing.js` | Real-time AWS pricing for savings calculations |
| Webhook service | `src/services/webhooks.js` | HMAC-signed outbound webhooks |
| Slack service | `src/services/slack.js` | Slack OAuth and Block Kit notifications |

---

## 5. User Guide

### Running a Scan

1. Navigate to **FinOps → Dashboard**
2. If no AWS integration is connected, click **"Connect AWS"** and follow the setup wizard
3. Click **"Run Scan"** to start a live scan with real-time progress
4. Findings appear in sections: Waste, Rightsizing, RI/SP Coverage, and Summary

### Triaging Recommendations

1. On the Dashboard, each waste or rightsizing card shows an estimated saving and a CLI command
2. Click the state dropdown on any card to mark it as **Snoozed**, **Done**, or **Dismissed**
3. Snoozed items require a date — they reappear automatically when the snooze expires
4. Dismissed items require a reason and are hidden from the default view

### Viewing Cost Trends

1. Go to **FinOps → Dashboard** and scroll to the Trend chart
2. Toggle between 30, 90, and 180-day views
3. Hover over any point to see the service-level breakdown for that day

### Viewing Cost Allocation by Tag

1. Go to **FinOps → Allocation**
2. Select a tag key from the dropdown (e.g. `Environment`)
3. Optionally set a custom date range
4. The table shows spend per tag value, percentage of total, and month-over-month change

### Exporting Findings

1. Click **"Export"** on the Dashboard
2. Select CSV, JSON, or FOCUS 1.1
3. The file downloads immediately

---

## 6. API Documentation

All FinOps API endpoints are under `/api/v1/finops` and require a Bearer token.

**Authentication:**
```
Authorization: Bearer <your-jwt-token>
```

---

### `GET /api/v1/finops`

Run or retrieve a FinOps scan. Results are cached for 6 hours.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `refresh` | boolean | `false` | Force a fresh scan, bypassing cache |
| `startDate` | string | start of month | Custom range start (YYYY-MM-DD) |
| `endDate` | string | today | Custom range end (YYYY-MM-DD) |

**Response:**
```json
{
  "monthlyCost": 4821.50,
  "forecastedCost": 5100.00,
  "waste": [
    {
      "type": "unattached_ebs",
      "resourceId": "vol-0abc1234",
      "resourceType": "EBS Volume",
      "description": "Unattached gp2 volume (100 GB) — not attached for 45 days",
      "estimatedMonthlySavings": 10.00,
      "recommendation": "aws ec2 delete-volume --volume-id vol-0abc1234",
      "severity": "medium",
      "metadata": { "sizeGb": 100, "volumeType": "gp2", "ageInDays": 45 }
    }
  ],
  "rightsizing": [...],
  "reservations": [...],
  "savingsPlans": [...],
  "topServices": [...],
  "summary": {
    "wasteItems": 12,
    "rightsizingItems": 3,
    "totalMonthlySavings": 842.30,
    "totalAnnualSavings": 10107.60,
    "coverageGaps": 2,
    "checkedAt": "2026-05-03T09:00:00.000Z"
  },
  "aiSummary": "Your AWS account has $842/month in identified savings...",
  "cached": false
}
```

---

### `GET /api/v1/finops/stream`

Server-Sent Events (SSE) endpoint — streams scan progress in real time.

**Example client:**
```javascript
const es = new EventSource('/api/v1/finops/stream', {
  headers: { Authorization: `Bearer ${token}` }
})

es.onmessage = (e) => {
  const { type, progress, message, findings } = JSON.parse(e.data)
  if (type === 'complete') {
    console.log('Findings:', findings)
    es.close()
  }
}
```

**Event types:** `status` · `progress` · `complete` · `error`

---

### `GET /api/v1/finops/summary`

Lightweight summary card — used on the Comply dashboard FinOps widget.

**Response:**
```json
{
  "available": true,
  "monthlyCost": 4821.50,
  "totalMonthlySavings": 842.30,
  "totalAnnualSavings": 10107.60,
  "wasteItems": 12,
  "rightsizingItems": 3,
  "coverageGaps": 2,
  "checkedAt": "2026-05-03T09:00:00.000Z"
}
```

---

### `GET /api/v1/finops/trend`

Historical daily cost series.

**Query parameters:**

| Parameter | Type | Values | Default |
|---|---|---|---|
| `days` | integer | `30`, `90`, `180` | `90` |

**Response:**
```json
{
  "days": 90,
  "total": 14462.50,
  "previousTotal": 13200.00,
  "topServices": ["Amazon EC2", "Amazon RDS", "Amazon S3", "AWS Lambda", "Amazon CloudFront"],
  "series": [
    {
      "date": "2026-02-03",
      "total": 160.50,
      "byService": {
        "Amazon EC2": 95.00,
        "Amazon RDS": 40.00,
        "Other": 25.50
      }
    }
  ]
}
```

---

### `GET /api/v1/finops/allocation`

Tag-based cost allocation.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `tagKey` | string | `Environment` | AWS tag key to group by |
| `startDate` | string | start of month | YYYY-MM-DD |
| `endDate` | string | today | YYYY-MM-DD |

**Response:**
```json
{
  "tagKey": "Environment",
  "startDate": "2026-05-01",
  "endDate": "2026-05-03",
  "total": 482.15,
  "byValue": [
    {
      "value": "production",
      "cost": 380.00,
      "percentage": 78.8,
      "monthOverMonthDelta": 5.2
    },
    {
      "value": "(untagged)",
      "cost": 62.15,
      "percentage": 12.9,
      "monthOverMonthDelta": 15.0
    }
  ]
}
```

---

### `GET /api/v1/finops/purchase-recommendations`

Savings Plans and RI purchase recommendations.

**Response:**
```json
{
  "savingsPlans": [
    {
      "type": "savings_plan",
      "savingsPlansType": "Compute",
      "term": "1y",
      "paymentOption": "no upfront",
      "hourlyCommitment": 1.234,
      "estimatedMonthlySavings": 210.00,
      "estimatedAnnualSavings": 2520.00,
      "breakEvenMonths": 6,
      "estimatedROI": 32.5
    }
  ],
  "reservations": [...],
  "totalAnnualSavings": 4800.00
}
```

---

### `GET /api/v1/finops/ai-gpu`

AI/ML and GPU spend analysis.

**Response:**
```json
{
  "totalAiSpend": 320.50,
  "monthOverMonthDelta": 12.5,
  "services": [
    { "name": "Bedrock", "cost": 200.00, "previousCost": 180.00, "delta": 11.1 },
    { "name": "SageMaker", "cost": 120.50, "previousCost": 105.00, "delta": 14.8 }
  ],
  "idleGpuInstances": [
    {
      "instanceId": "i-0abc1234",
      "instanceType": "g4dn.xlarge",
      "avgCpuLast7Days": 1.2,
      "note": "Low CPU — check GPU utilization via CloudWatch agent"
    }
  ]
}
```

---

### `GET /api/v1/finops/export`

Export findings.

**Query parameters:**

| Parameter | Type | Values | Default |
|---|---|---|---|
| `format` | string | `csv`, `json`, `focus` | `csv` |

Returns a file download (`Content-Disposition: attachment`).

---

### `GET /api/v1/finops/recommendations/states`

Get all recommendation states for the organisation.

**Response:**
```json
{
  "states": [
    {
      "resourceId": "vol-0abc1234",
      "category": "waste",
      "state": "snoozed",
      "snoozedUntil": "2026-06-01T00:00:00.000Z",
      "notes": "Waiting for team to confirm before deletion"
    }
  ]
}
```

---

### `PATCH /api/v1/finops/recommendations/:resourceId/state`

Update a recommendation's workflow state.

**Request body:**
```json
{
  "category": "waste",
  "state": "dismissed",
  "dismissalReason": "business_critical",
  "dismissalNote": "This NAT Gateway serves a critical compliance workload",
  "notes": "Reviewed by platform team on 2026-05-03"
}
```

**States:** `open` · `snoozed` · `done` · `dismissed`

**Dismissal reasons:** `business_critical` · `cost_acceptable` · `pending_approval` · `wont_fix` · `other`

---

## 7. Configuration Guide

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AWS_REGION` | No | Default AWS region for API calls. Defaults to `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Yes | IAM credentials for the iFU Labs service account (used to assume customer roles) |
| `AWS_SECRET_ACCESS_KEY` | Yes | IAM secret for the iFU Labs service account |
| `REDIS_URL` | Yes | Redis connection string — used for 6-hour findings cache |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BEDROCK_REGION` | No | AWS region for Bedrock AI calls. Defaults to `us-east-1` |

### Cache TTLs

| Cache key | TTL | Notes |
|---|---|---|
| `finops:findings:{orgId}` | 6 hours | Main scan results |
| `finops:trend:{orgId}:{days}d` | 12 hours | Daily cost series |
| `finops:allocation:{orgId}:...` | 6 hours | Tag allocation results |
| `finops:purchase-recs:{orgId}` | 6 hours | Purchase recommendations |
| `finops:ai-gpu:{orgId}` | 6 hours | AI/GPU spend data |

To force a cache refresh, call `GET /api/v1/finops?refresh=true` or wait for the next scheduled scan.

---

## 8. FAQ

**Q: How long does a scan take?**
A: Typically 2–5 minutes for accounts with under 500 resources. Large accounts may take up to 10 minutes. Use the `/stream` endpoint for real-time progress.

**Q: Does FinOps make any changes to my AWS account?**
A: No. FinOps is read-only. The IAM role requires only `ReadOnlyAccess` and `CostExplorerFullAccess`. It cannot modify, start, stop, or delete any resources.

**Q: How fresh is the data?**
A: Results are cached for 6 hours. Scheduled scans run daily at 03:00 UTC. You can force a refresh at any time.

**Q: Can I scan multiple AWS accounts?**
A: Each organisation currently supports one connected AWS integration. Multi-account support is on the roadmap.

**Q: Why does the waste check sometimes return fewer items than expected?**
A: Some checks require CloudWatch metrics (NAT Gateways, RDS, GPU instances). If the CloudWatch agent is not configured or IAM permissions are missing for CloudWatch, those checks are skipped gracefully.

**Q: What does "FOCUS 1.1 export" mean?**
A: FOCUS (FinOps Open Cost and Usage Specification) is an open standard for cloud cost data. Exporting in FOCUS 1.1 format allows you to ingest iFU Labs findings into any FOCUS-compatible FinOps tool.

---

## 9. Troubleshooting

### "No AWS integration" error on scan

Ensure your AWS integration is connected and shows as **"connected"** on the Integrations page. If validation fails, verify that the IAM role trust policy includes the iFU Labs account ID and the correct external ID.

### Scan returns empty waste list

This can happen if: (a) your account genuinely has no waste matching the criteria, (b) the IAM role is missing permissions for specific services (e.g. CloudWatch), or (c) all resources were created within the last 7 days. Check the Fastify server logs for individual check warnings.

### Cost trend shows no data

The trend API requires AWS Cost Explorer to have at least 1 day of data for the account. New accounts may see empty trends for the first 24 hours. Also confirm `CostExplorerFullAccess` is attached to the IAM role.

### AI summary returns a fallback message

Bedrock may be unavailable in your region or the IAM role may not have Bedrock permissions. The fallback is rule-based and fully functional — no action is required.

### Scheduled scans not running

Confirm `REDIS_URL` is set and Redis is reachable. The BullMQ scheduler depends on Redis to queue and process jobs. Check `src/jobs/scheduler.js` logs for cron execution confirmation.

---

## 10. Security Notes

- **Read-only by design** — the IAM role attached to FinOps has no write or mutate permissions
- **STS AssumeRole with external ID** — prevents confused deputy attacks; the external ID is unique per organisation
- **Short-lived credentials** — STS sessions are scoped to 1 hour (`DurationSeconds: 3600`)
- **Encrypted credential storage** — role ARN and external ID are encrypted at rest using AES-256 before storage in PostgreSQL
- **Bearer token auth** — all API endpoints require a verified JWT; tokens are validated on every request
- **Audit log** — every scan and recommendation state change is logged to the immutable audit trail with user ID, org ID, action, and timestamp
- **Cache isolation** — Redis cache keys are namespaced by `orgId`; no cross-organisation data leakage is possible
- **HTTPS-only webhooks** — webhook URLs are validated to start with `https://` at creation time
- **HMAC-SHA256 webhook signatures** — all webhook payloads are signed; recipients can verify authenticity before processing
