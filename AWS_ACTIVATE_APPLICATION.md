# AWS Activate Founders — Application Draft

**Apply at:** https://aws.amazon.com/activate/
**Tier:** Founders ($1,000 credits + 2 yrs Business Support + $350 Developer Support credits)
**Date prepared:** 2026-04-27

---

## Company basics

| Field | Value |
|---|---|
| Company name | iFU Labs |
| AWS account ID | 385936845264 |
| Funding stage | Bootstrapped — no external funding |
| Year founded | (fill in) |
| Headquarters | Remote-first (fill in legal HQ) |
| Website | (fill in) |
| Industry | SaaS — Cloud cost management & compliance automation |
| Stage | Post-launch, revenue-generating |
| AWS Partner status | AWS Partner Network member |

---

## Short answers

### What does your company do? (≤500 chars)
iFU Labs builds AWS-native SaaS for startups. iFu Costless is a FinOps dashboard that detects 8 types of waste, recommends rightsizing, forecasts spend, and exports FOCUS 1.1. iFu Comply automates SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS evidence collection from AWS and GitHub with daily scans, drift alerts, and audit-ready PDFs. We also run an AWS consultancy with read-only access and full IaC handover.

### What problem are you solving?
Startups overspend on AWS and fail compliance audits because they can't afford a full DevOps + FinOps + GRC team. Enterprise tools (Vanta, CloudHealth, Apptio) are too expensive and too heavy for early-stage companies. iFU Labs targets the lighter, faster, AWS-only, founder-friendly end of that market.

### Who is your target customer?
Pre-seed through Series C startups running on AWS, plus small/fast-growing teams that need AWS expertise without hiring a platform team.

### How will you use AWS credits?
- **Amazon Bedrock** — Claude 3 Haiku inference for FinOps AI summaries and Comply gap explanations (Growth tier feature)
- **AWS Cost Explorer / Compute Optimizer / Pricing API** — per-customer scans scale linearly with subscriber count
- **Amazon S3** — encrypted evidence storage for compliance artifacts and PDF exports
- **Amazon RDS (Postgres)** — shared multi-tenant backend
- **ElastiCache (Redis)** — BullMQ queues + 6-hour scan caching
- **CloudWatch Logs** — observability across 6 background workers
- **STS** — cross-account AssumeRole for every customer integration

---

## Product detail

### iFu Costless — FinOps SaaS
- **Pricing:** $199/month, billed annually, 14-day trial
- **Connection:** Customer creates IAM role in their AWS account that trusts iFu Labs (account `385936845264`) with an external ID. We use STS AssumeRole — read-only, never write.
- **Detection:** 8 waste types (unattached EBS, unused EIPs, stopped EC2 >30d, idle NAT, idle RDS, unused ALB/NLB/Classic LBs, snapshots >90d, AI/GPU spend)
- **Recommendations:** Top 20 rightsizing from Compute Optimizer; RI/Savings Plan coverage (read-only)
- **Forecast:** End-of-month spend from Cost Explorer
- **AI:** Bedrock Claude 3 Haiku 2-3 sentence summary, rule-based fallback
- **Schedule:** Daily 03:00 UTC automated scans
- **Export:** CSV, JSON, FOCUS 1.1
- **Workflow:** Recommendation states (open/snoozed/done/dismissed)

### iFu Comply — Compliance SaaS
- **Pricing:** Starter $299/mo (SOC 2 only, 3 users), Growth $799/mo (all frameworks + AI)
- **Frameworks:** SOC 2 (~25 controls), ISO 27001 (~30), GDPR (~20), HIPAA (~15), PCI DSS 4.0 (29) — 77 controls total
- **Evidence:** Auto from AWS (IAM, S3, CloudTrail, RDS, GuardDuty, Config) + GitHub (branch protection, secret scanning, CODEOWNERS); manual S3 uploads
- **AI:** Anthropic Claude gap explanations with 24h cache (Growth)
- **Schedule:** Daily 02:00 UTC scans, drift detection, email + Slack alerts
- **Output:** Per-framework PDF evidence packs

### Portal
- Auth, onboarding, Paystack billing, shared JWT cookie across all 4 apps (website, portal, comply, finops)

---

## Architecture

- **Backend:** Fastify (Node.js) API
- **Database:** Postgres + Drizzle ORM (12+ migrations)
- **Cache/Queue:** Redis + BullMQ (6 workers: scan, finops scan, notifications, webhooks, score snapshots, anomaly)
- **Scheduling:** node-cron
- **Frontend:** 4 Next.js apps (website, portal, comply, finops) — same parent domain
- **Auth:** Local JWT primary, Auth0 fallback
- **Multi-tenancy:** Cross-account read-only via STS AssumeRole + external ID

### AWS SDK clients in use (`package.json`)
`@aws-sdk/client-bedrock-runtime`, `client-cloudtrail`, `client-cloudwatch`, `client-cloudwatch-logs`, `client-compute-optimizer`, `client-config-service`, `client-cost-explorer`, `client-ec2`, `client-elastic-load-balancing`, `client-elastic-load-balancing-v2`, `client-guardduty`, `client-iam`, `client-pricing`, `client-rds`, `client-s3`, `client-sts`

---

## Traction signals (built in code)

- Two SaaS products live with real billing (Paystack)
- 5 compliance frameworks seeded, 77 controls
- Daily scheduled scans running for both products
- Outbound webhooks (HMAC-signed, 5-retry)
- Slack OAuth app published with Block Kit notifications
- Read-only auditor role enforced backend-wide
- 14-day free trial on both products

---

## Team

(Fill in — list founders, AWS certifications held: Solutions Architect, DevOps Engineer Professional, Security Specialty, Data Engineer, ML Engineer per marketing site)

---

## Application checklist

- [ ] Confirm AWS account `385936845264` has billing email matching company
- [ ] Have business email on @yourdomain (Gmail/personal addresses get rejected)
- [ ] Company website live and reachable
- [ ] LinkedIn profiles for founders ready
- [ ] Pitch deck OR product demo URL (the live FinOps/Comply dashboards work)
- [ ] Submit at https://aws.amazon.com/activate/
- [ ] Mention APN membership in the application — it helps

## Notes

- Founders tier doesn't require funding — bootstrapped is fine
- Approval typically takes 7–10 business days
- Credits expire 2 years after issuance
- If approved, also apply credits to Bedrock usage immediately (highest-leverage spend)
