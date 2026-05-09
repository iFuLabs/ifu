# Demo seed scripts

Populate a sandbox AWS account with realistic data so the iFU Labs dashboards
have something to show in the YC demo video. Tear everything down after recording.

## Prereqs

- `aws` CLI configured with admin credentials in a sandbox account
- `python3` available
- `AWS_REGION` env var set (defaults to `us-east-1`)

## Run

```bash
chmod +x scripts/demo/*.sh

# Seed
./scripts/demo/seed-comply-demo.sh
./scripts/demo/seed-finops-demo.sh

# Connect this AWS account to iFU Labs via the IAM-role flow,
# run scans, record the demo, then:

./scripts/demo/teardown-finops-demo.sh
./scripts/demo/teardown-comply-demo.sh
```

## What gets created

### Comply (mix of pass + fail to make the dashboard tell a story)

| Resource | Comply control | Status |
|---|---|---|
| Strong IAM password policy | CC6.2-PASSWORD | PASS |
| IAM user without MFA | CC6.1-MFA | FAIL |
| S3 bucket: encrypted + versioned + PAB | S3 controls | PASS |
| S3 bucket: unencrypted, default settings | S3 controls | FAIL |
| Multi-region CloudTrail with log-file validation | Audit logging | PASS |
| Security group with `0.0.0.0/0:22` ingress | EC2 / network | FAIL |

### FinOps

| Resource | Detector |
|---|---|
| 3× unattached EBS volumes (10/50/100 GB gp3) | Unattached EBS |
| 2× unused Elastic IPs | Unused EIPs |
| 1× idle ALB (optional, prompts before creating) | Idle load balancer |

## Cost

If torn down within 24 hours: **under $2 total.**

- EBS gp3: ~$0.08/GB/month → 160 GB total ≈ $0.42/day
- Elastic IPs unattached: ~$0.005/hour each → $0.24/day for 2
- ALB: ~$0.54/day (only if you opt-in)
- CloudTrail (first trail): free
- S3 buckets (empty): pennies
- IAM users / password policy / security groups: free

## What can't be faked in a fresh demo

These detections need real time aging and are skipped:

- Stopped EC2 (>30 days stopped)
- Old EBS snapshots (>90 days)
- Idle RDS / NAT (real instances cost too much for a demo)

The 5–6 findings the seed scripts produce are enough for a 3-minute YC demo.
