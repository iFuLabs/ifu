# Multi-tenant isolation audit — AWS integrations

Date: 2026-05-02
Scope: confirm that two organizations cannot see, share, or interfere with each other's data — with particular attention to the case where two orgs register the same AWS account.

## Summary

Tenant isolation is enforced at the data layer. Every state-bearing query in
`src/routes/`, `src/jobs/`, and the AWS connectors filters by `orgId` (verified
by sweep — see below). Caches in Redis are namespaced per `orgId`. STS role
assumption uses a per-row external ID stored alongside the role ARN.

One gap was identified and closed in this pass: the same AWS account could
previously be registered by two different organizations, which is a footgun for
customers (Org A's IAM operator could mistakenly let Org B "claim" their
account if they shared the role ARN + external ID). The fix is described below.

## Findings

### Resolved in this pass
- **F-1** Two orgs could register the same AWS account ID. Now blocked: the
  `POST /integrations/aws` handler queries all currently-connected `aws`
  integrations and rejects with `409 AWS_ACCOUNT_ALREADY_CONNECTED` if
  another org's connected row reports the same `metadata.accountId`. The
  same org reconnecting is unaffected (matched by `orgId`). A previously
  connected account can still be claimed by a different org once the
  original integration is disconnected. — `src/routes/integrations.js`.
- **F-2** Stale FinOps cache after AWS disconnect (covered earlier this
  session). Disconnect now scans+deletes every `finops:*:{orgId}*` key.
  `GET /finops/summary` also requires a connected AWS integration before
  serving cached findings, so cache cleanup failures don't leak data. —
  `src/routes/integrations.js`, `src/routes/finops.js`.

### No issue found (verified)
- **All `db.query.*.findFirst|findMany` calls in `src/routes/*` and
  `src/jobs/*`** filter by `orgId` for any tenant-scoped table
  (`integrations`, `controlResults`, `controlComments`, `scans`, `audits`,
  `vendors`, `evidence`, `controlExemptions`, `finopsRecommendationStates`,
  `webhooks`, `slackWorkspaces`, `subscriptions`, `budgets`, `anomalies`,
  `complianceScoreSnapshots`).
- `controlDefinitions` is queried without `orgId` — correct; it's the global
  framework library shared across all tenants.
- Workers (`scanWorker`, `finopsWorker`, `anomalyWorker`,
  `notificationWorker`, `scoreSnapshotWorker`) take `orgId` from the BullMQ
  job payload and filter integration lookups by both `id` AND `orgId`.
- AWS STS assumption uses each row's encrypted `(roleArn, externalId)` pair —
  there is no shared external ID across orgs.
- Redis cache keys: every cache key in `routes/finops.js`, `routes/ai.js`,
  `routes/controls.js` is prefixed with `:{orgId}` or `:{orgId}:`. No
  cross-tenant key collisions possible.

## Operator runbook: same AWS account, two orgs

When a customer support ticket asks "I want to move our AWS account from Org A
to Org B":

1. Have Org A's admin disconnect AWS in the Comply portal (or run
   `DELETE /api/v1/integrations/:id` against Org A's row).
2. Org B's admin can now run `POST /api/v1/integrations/aws` with the role ARN
   + external ID. The 409 will not fire because Org A's row is no longer
   `connected`.
3. Recommend that Org B's IAM team rotate the external ID at the same time so
   the trust policy can no longer be assumed by anyone holding the old value.
   (Rotation is a customer-side IAM change; we don't enforce it.)

## What is *not* in scope of this audit

- Auth0 tenancy (we trust Auth0 tokens; if Auth0 is misconfigured no
  application-level check helps).
- Postgres row-level security — not enabled. We rely on application-level
  `orgId` filtering. RLS would be defense-in-depth and is a separate proposal.
- Encryption at rest of the credentials column — already encrypted via
  `services/encryption.js` AES-GCM with a key from env.
