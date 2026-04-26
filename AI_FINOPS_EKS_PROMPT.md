# AI Handoff — Add EKS / Kubernetes cost tracking to iFu Costless

## Context

iFu Costless is the FinOps SaaS in this monorepo. It connects read-only to a customer's AWS account via STS AssumeRole + external ID and surfaces cost, waste, rightsizing, RI/SP coverage, anomalies, budgets, tag allocation, and an AI summary. Today it does **not** break out Kubernetes / EKS spend separately — EKS shows up only inside the generic "top services" cost row.

We are AWS-only by design. Customers run workloads on **Amazon EKS**. Finance leads keep asking *"how much of my AWS bill is Kubernetes, and which cluster / namespace / team is driving it?"* — we can't answer that today.

## Goal

Ship a first-pass **EKS spend view** that the customer can read **without installing anything inside their cluster**. Use only what AWS already exposes through the existing read-only IAM role: Cost Explorer, EKS DescribeCluster, EC2 DescribeInstances, CloudWatch metrics, Pricing API.

Pod-level / namespace-level allocation (OpenCost, Kubecost, Container Insights with KubeCost addon) is **out of scope for this pass** — it requires in-cluster install and we want to ship the Cost Explorer cut first.

## What to build

### 1. New connector check function — `getEksSpend()`
**File:** new `src/connectors/aws/checks/eksChecks.js` (mirror the pattern of the existing `*Checks.js` files in that folder).

Inputs: AWS SDK clients already created by the parent FinOps runner (CostExplorer, EKS, EC2, CloudWatch, Pricing), startDate, endDate.

Outputs an object:
```js
{
  totalSpend: number,            // EKS-attributable spend across the period
  controlPlaneSpend: number,     // sum of "Amazon Elastic Kubernetes Service" line item
  dataPlaneSpend: number,        // sum of EC2 spend tagged to a cluster (best-effort match)
  clusters: [
    {
      name,
      region,
      version,
      controlPlaneMonthly,       // $0.10/hr × 730 (Pricing API; fallback constant if call fails)
      nodeGroups: [
        { name, instanceType, desired, monthlySpend, avgCpuUtilPct, avgMemUtilPct, idle: boolean }
      ],
      totalMonthly,
      idle: boolean              // cluster is idle if all node groups idle
    }
  ],
  recommendations: [
    { type, clusterName, nodeGroup?, monthlySavings, annualSavings, confidence, recommendation }
  ]
}
```

How to compute it:
- **Control plane spend:** `GetCostAndUsageCommand` filter `SERVICE = "Amazon Elastic Kubernetes Service"`. Group by `RESOURCE_ID` if available, else by `LINKED_ACCOUNT`.
- **Data plane spend:** Two complementary signals (use both, prefer the first when present):
  1. Cost Explorer with `TAG` filter on `eks:cluster-name` (AWS auto-tags EKS-managed nodes with this).
  2. Cost Explorer with `TAG` filter on `aws:eks:cluster-name` and / or `kubernetes.io/cluster/<name>=owned`.
- **Per-cluster enumeration:** `EKS:ListClusters` then `EKS:DescribeCluster` then `EKS:ListNodegroups` + `EKS:DescribeNodegroup` for each.
- **Idle node detection:** for each node group, pull last-7-day CloudWatch `CPUUtilization` (EC2 namespace, `AutoScalingGroupName` dimension from the node group). Flag `idle = true` if avg < 5% **and** max < 20%.
- **Recommendations to emit:**
  - `eks_idle_cluster` — every node group idle for 7 days → savings = totalMonthly.
  - `eks_idle_nodegroup` — single node group idle → savings = nodeGroup.monthlySpend.
  - `eks_oversized_nodegroup` — avg CPU < 30% AND avg mem < 40% → savings = 50% of monthlySpend, confidence "medium".
  - `eks_old_version` — control plane version more than two minors behind latest → no savings, recommendation = "upgrade".

Match the existing recommendation shape used by `rightsizingChecks` / waste checks so the dashboard renders them with no extra work.

### 2. Wire it into the FinOps runner
**File:** `src/connectors/finops/checks.js`

Find where the other check functions are dispatched (`runFinOpsChecks` or similar). Add `eks` to the parallel run, merge its `recommendations` into the master recommendations array, and stash the structured `eks` block on the result under `result.eks`.

Add EKS-attributable spend to the existing `topServices` rollup so it stops being hidden inside the generic services pie chart — i.e., subtract EKS spend from "EC2-Instance" and surface "EKS (control + data plane)" as its own row.

### 3. New API endpoint
**File:** `src/routes/finops.js`

Add `GET /api/v1/finops/eks` returning the `result.eks` block (cached via the same Redis findings cache so it's free after the daily scan). Plan-gating: same as the rest of FinOps (subscription required).

Also include `eks` in the existing `/finops` main payload so the dashboard doesn't need a second round-trip on first load.

### 4. CSV / FOCUS export
**File:** `src/routes/finops.js` — extend the `GET /finops/export` handler.

Append EKS recommendations to the recommendations CSV using the same column order. Add a `category=eks` value so users can filter.

### 5. Dashboard UI
**File:** `finops/src/app/dashboard/page.tsx` (or split into a dedicated `dashboard/eks/page.tsx` if the main page is already heavy — check current size first; if `page.tsx` is over ~1000 lines, create a new route).

Build a section titled **"Kubernetes (EKS) spend"**:
- Header KPI row — total EKS monthly spend, control-plane share %, data-plane share %, idle clusters count.
- Cluster table — name, region, version, node groups count, monthly spend, idle badge if applicable. Click a row to expand node-group detail (instance type, desired count, avg CPU, avg mem, idle flag).
- Recommendation cards — reuse the existing `RecommendationCard` / state-toggle component (`open / snoozed / done / dismissed`) so EKS recs flow through the same workflow as the rest of FinOps.
- Empty state — "No EKS clusters detected in this account" with a one-line explainer that we picked it up from the Cost Explorer + EKS API and that pod / namespace level is on the roadmap.

Style: follow the existing dashboard tokens (Plum / Lavender / Iris). No new chart libraries — reuse Recharts already in finops/.

### 6. SDK + IAM
**File:** `package.json` (root) — confirm `@aws-sdk/client-eks` is present; add it if missing (the rest of `@aws-sdk/*` clients are already there).

**Docs:** the customer-facing IAM policy is generated in `portal/src/app/onboarding/page.tsx` (search for the JSON IAM policy block). Add these read-only permissions:
```
eks:ListClusters
eks:DescribeCluster
eks:ListNodegroups
eks:DescribeNodegroup
eks:ListFargateProfiles
eks:DescribeFargateProfile
```
Update the same policy wherever it's documented in the website / brand showcase if applicable.

### 7. Tests
Match whatever unit-test style exists for the other check files (look in `src/__tests__` or `src/connectors/aws/checks/__tests__/`). Mock the AWS SDK and assert:
- Empty AWS account → returns zeroed payload, no errors.
- One cluster, idle → produces `eks_idle_cluster` recommendation.
- Cost Explorer error → check function returns `{ totalSpend: 0, clusters: [], recommendations: [], error: <msg> }` instead of throwing.

## Out of scope (do NOT do these in this pass)

- Pod / namespace / workload-level cost allocation.
- OpenCost or Kubecost integration.
- CloudWatch Container Insights ingestion.
- Fargate-only clusters' pod-level breakdown (control plane + Fargate profile spend is fine; pod allocation is not).
- Cross-cluster cost optimisation recommendations (e.g., "merge these two underused clusters") — defer.
- Multi-cloud Kubernetes (GKE / AKS) — AWS only.

## Conventions to follow (from this codebase)

- Backend is **ESM JavaScript**, not TypeScript. Match the style of existing files in `src/`.
- Use the existing `logger` (`src/services/logger.js`) — Pino-based.
- Wrap every AWS SDK call in try/catch and degrade gracefully — never let one missing permission kill the whole FinOps scan.
- Cache key namespacing follows `finops:findings:{orgId}:{rangeKey}` — nest EKS data inside the same cache, don't add a parallel cache.
- Plan gating: re-use `requirePlanFeature` middleware already in use elsewhere in `finops.js`.
- Audit logging: call `auditAction({ orgId, userId, action: 'finops.eks_viewed', ... })` from the route handler when first served per session — match how other FinOps routes log.

## Acceptance

A FinOps user with at least one EKS cluster in their connected AWS account should:
1. See a "Kubernetes (EKS) spend" section appear on the dashboard after their next daily scan (or after hitting the manual "Re-scan" button).
2. See total EKS monthly spend split into control-plane and data-plane.
3. See each cluster listed with node groups and an idle flag where applicable.
4. Receive at least one of the four EKS recommendations if their cluster matches the rules.
5. Be able to snooze / mark done / dismiss those recommendations using the same UI as other FinOps recommendations.
6. Be able to export EKS recommendations in the CSV / FOCUS export.

A FinOps user with **no** EKS cluster sees an empty state — no errors, no broken cards.

## Don't

- Don't widen the IAM trust to require write permissions.
- Don't introduce a Kubernetes API client — we're not talking to clusters directly.
- Don't add new third-party services (OpenCost, Datadog, etc.).
- Don't refactor unrelated FinOps code.
- Don't touch Comply.

## When done

- Run the existing test suite, lint, type-check (frontend).
- Manually verify on the dashboard with a test AWS account that has an EKS cluster.
- Commit as `feat(finops): EKS spend tracking — control plane, node groups, idle detection`.
- Update `CLAUDE.md` "FinOps current features" section: add "EKS spend tracking (control plane + data plane, per-cluster idle detection)" and remove from the "Absent" list.
