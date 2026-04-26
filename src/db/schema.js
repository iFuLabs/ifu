import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['starter', 'growth', 'finops'])
export const controlStatusEnum = pgEnum('control_status', ['pass', 'fail', 'review', 'not_applicable'])
export const frameworkEnum = pgEnum('framework', ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'])
export const integrationTypeEnum = pgEnum('integration_type', ['aws', 'github', 'okta', 'google_workspace'])
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error'])
export const severityEnum = pgEnum('severity', ['critical', 'high', 'medium', 'low'])
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired'])
export const recommendationStateEnum = pgEnum('recommendation_state', ['open', 'snoozed', 'done', 'dismissed'])

// ── Organizations (tenants) ────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  domain:          text('domain'),                          // e.g. acme.com
  plan:            planEnum('plan').notNull().default('starter'),
  paystackCustomerCode: text('paystack_customer_code').unique(),
  paystackSubscriptionCode: text('paystack_subscription_code').unique(),
  paystackAuthCode: text('paystack_auth_code'),
  trialEndsAt:     timestamp('trial_ends_at'),
  finopsSettings:  jsonb('finops_settings').default({ tagKeys: ['Environment', 'Team', 'Project', 'CostCenter'] }),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow()
})

// ── Users ──────────────────────────────────────────────────────────────────
// NOTE: email is globally unique across all orgs. This enforces a single canonical
// user identity across the platform. If you need per-tenant identities (allowing
// the same email in multiple orgs), change to a composite unique index on (email, orgId).
export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  auth0Id:        text('auth0_id').unique(),                 // sub from Auth0 JWT (optional now)
  email:          text('email').notNull().unique(),
  passwordHash:   text('password_hash'),                     // bcrypt hash (for local auth)
  name:           text('name'),
  avatarUrl:      text('avatar_url'),
  orgId:          uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  role:           text('role').notNull().default('member'), // owner | admin | member
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_users_org_id').on(table.orgId)
])

// ── Invitations ────────────────────────────────────────────────────────────
export const invitations = pgTable('invitations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email:          text('email').notNull(),
  role:           text('role').notNull().default('member'), // admin | member
  invitedBy:      uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  token:          text('token').notNull().unique(),         // unique invite token
  status:         invitationStatusEnum('status').notNull().default('pending'),
  product:        text('product').default('comply'),        // comply | finops
  expiresAt:      timestamp('expires_at').notNull(),
  acceptedAt:     timestamp('accepted_at'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_invitations_org_id_status').on(table.orgId, table.status),
  uniqueIndex('idx_invitations_org_email').on(table.orgId, table.email)
])

// ── Integrations ───────────────────────────────────────────────────────────
export const integrations = pgTable('integrations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type:           integrationTypeEnum('type').notNull(),
  status:         integrationStatusEnum('status').notNull().default('disconnected'),
  // Encrypted credentials stored as JSONB
  // AWS: { roleArn, externalId }
  // GitHub: { installationId, accessToken }
  credentials:    jsonb('credentials'),
  metadata:       jsonb('metadata'),                        // accountId, org name, etc.
  lastSyncAt:     timestamp('last_sync_at'),
  lastErrorAt:    timestamp('last_error_at'),
  lastError:      text('last_error'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_integrations_org_id').on(table.orgId),
  index('idx_integrations_status').on(table.status)
])

// ── Controls ───────────────────────────────────────────────────────────────
// The global control library — shared across all tenants
export const controlDefinitions = pgTable('control_definitions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  controlId:      text('control_id').notNull().unique(),    // e.g. CC6.1
  framework:      frameworkEnum('framework').notNull(),
  category:       text('category').notNull(),               // e.g. Logical Access
  title:          text('title').notNull(),
  description:    text('description').notNull(),
  guidance:       text('guidance'),                         // How to fix if failing
  severity:       severityEnum('severity').notNull().default('high'),
  // Which integrations can auto-check this control
  automatable:    boolean('automatable').notNull().default(false),
  checkFn:        text('check_fn'),                         // Name of the check function
  createdAt:      timestamp('created_at').notNull().defaultNow()
})

// Per-tenant control results
export const controlResults = pgTable('control_results', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  controlDefId:   uuid('control_def_id').notNull().references(() => controlDefinitions.id),
  status:         controlStatusEnum('status').notNull(),
  evidence:       jsonb('evidence'),                        // Raw evidence data
  notes:          text('notes'),                            // Manual notes
  remediationUrl: text('remediation_url'),
  // C-A1 remediation task tracking
  remediationOwnerId:        uuid('remediation_owner_id').references(() => users.id, { onDelete: 'set null' }),
  remediationDueDate:        timestamp('remediation_due_date'),
  remediationStatus:         text('remediation_status'),    // open | in_progress | blocked | completed | exempted
  remediationStartedAt:      timestamp('remediation_started_at'),
  remediationCompletedAt:    timestamp('remediation_completed_at'),
  remediationOverdueAlertedAt: timestamp('remediation_overdue_alerted_at'),
  checkedAt:      timestamp('checked_at').notNull().defaultNow(),
  nextCheckAt:    timestamp('next_check_at'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_control_results_org_id').on(table.orgId),
  uniqueIndex('idx_control_results_org_control').on(table.orgId, table.controlDefId),
  index('idx_control_results_remediation_owner').on(table.remediationOwnerId)
])

// ── Scans ──────────────────────────────────────────────────────────────────
export const scans = pgTable('scans', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  integrationType: integrationTypeEnum('integration_type'),
  status:         text('status').notNull().default('pending'), // pending | running | complete | failed
  totalControls:  integer('total_controls').default(0),
  passCount:      integer('pass_count').default(0),
  failCount:      integer('fail_count').default(0),
  reviewCount:    integer('review_count').default(0),
  triggeredBy:    text('triggered_by').notNull().default('schedule'), // schedule | manual | webhook
  startedAt:      timestamp('started_at'),
  completedAt:    timestamp('completed_at'),
  error:          text('error'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_scans_org_id').on(table.orgId)
])

// ── Evidence ───────────────────────────────────────────────────────────────
export const evidenceItems = pgTable('evidence_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  controlResultId: uuid('control_result_id').references(() => controlResults.id),
  title:          text('title').notNull(),
  description:    text('description'),
  s3Key:          text('s3_key'),                           // If file stored in S3
  data:           jsonb('data'),                            // Inline evidence data
  collectedAt:    timestamp('collected_at').notNull().defaultNow(),
  expiresAt:      timestamp('expires_at'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_evidence_org_id').on(table.orgId)
])

// ── Vendors ────────────────────────────────────────────────────────────────
export const vendors = pgTable('vendors', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  website:        text('website'),
  category:       text('category'),                         // e.g. Infrastructure, Auth
  riskLevel:      severityEnum('risk_level').default('medium'),
  soc2ExpiresAt:  timestamp('soc2_expires_at'),
  iso27001ExpiresAt: timestamp('iso27001_expires_at'),
  notes:          text('notes'),
  metadata:       jsonb('metadata'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_vendors_org_id').on(table.orgId)
])

// ── Audit log ──────────────────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id:             uuid('id').primaryKey().defaultRandom(),
  orgId:          uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  userId:         uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action:         text('action').notNull(),                 // e.g. integration.connected
  resource:       text('resource'),
  resourceId:     text('resource_id'),
  metadata:       jsonb('metadata'),
  ipAddress:      text('ip_address'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_audit_log_org_id').on(table.orgId)
])


// ── Relations ──────────────────────────────────────────────────────────────
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  integrations: many(integrations),
  controlResults: many(controlResults),
  scans: many(scans),
  evidenceItems: many(evidenceItems),
  vendors: many(vendors),
  auditLogs: many(auditLog),
  invitations: many(invitations),
  subscriptions: many(subscriptions)
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id]
  }),
  auditLogs: many(auditLog),
  invitationsSent: many(invitations)
}))

export const integrationsRelations = relations(integrations, ({ one }) => ({
  org: one(organizations, {
    fields: [integrations.orgId],
    references: [organizations.id]
  })
}))

export const controlResultsRelations = relations(controlResults, ({ one, many }) => ({
  org: one(organizations, {
    fields: [controlResults.orgId],
    references: [organizations.id]
  }),
  controlDef: one(controlDefinitions, {
    fields: [controlResults.controlDefId],
    references: [controlDefinitions.id]
  }),
  evidenceItems: many(evidenceItems)
}))

export const evidenceItemsRelations = relations(evidenceItems, ({ one }) => ({
  org: one(organizations, {
    fields: [evidenceItems.orgId],
    references: [organizations.id]
  }),
  controlResult: one(controlResults, {
    fields: [evidenceItems.controlResultId],
    references: [controlResults.id]
  })
}))

export const vendorsRelations = relations(vendors, ({ one }) => ({
  org: one(organizations, {
    fields: [vendors.orgId],
    references: [organizations.id]
  })
}))

export const scansRelations = relations(scans, ({ one }) => ({
  org: one(organizations, {
    fields: [scans.orgId],
    references: [organizations.id]
  })
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  org: one(organizations, {
    fields: [auditLog.orgId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id]
  })
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  org: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id]
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id]
  })
}))

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  org: one(organizations, {
    fields: [webhooks.orgId],
    references: [organizations.id]
  }),
  deliveries: many(webhookDeliveries)
}))

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id]
  })
}))

export const finopsRecommendationStatesRelations = relations(finopsRecommendationStates, ({ one }) => ({
  org: one(organizations, {
    fields: [finopsRecommendationStates.orgId],
    references: [organizations.id]
  }),
  updatedByUser: one(users, {
    fields: [finopsRecommendationStates.updatedBy],
    references: [users.id]
  })
}))

// ── Password Reset Tokens ──────────────────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:          text('token').notNull().unique(),
  expiresAt:      timestamp('expires_at').notNull(),
  used:           boolean('used').notNull().default(false),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_password_reset_tokens_token').on(table.token),
  index('idx_password_reset_tokens_user_id').on(table.userId)
])

// ── Subscriptions ──────────────────────────────────────────────────────────
// Multi-product subscription tracking
export const subscriptions = pgTable('subscriptions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  orgId:                   uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  product:                 text('product').notNull(), // 'comply' | 'finops'
  plan:                    text('plan').notNull(), // 'starter' | 'growth' | 'finops'
  status:                  text('status').notNull().default('active'), // 'active' | 'trialing' | 'cancelled' | 'expired'
  paystackSubscriptionCode: text('paystack_subscription_code').unique(),
  paystackPlanCode:        text('paystack_plan_code'),
  trialEndsAt:             timestamp('trial_ends_at'),
  createdAt:               timestamp('created_at').notNull().defaultNow(),
  updatedAt:               timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_subscriptions_org_id').on(table.orgId),
  index('idx_subscriptions_org_product').on(table.orgId, table.product),
  index('idx_subscriptions_status').on(table.status)
])

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  org: one(organizations, {
    fields: [subscriptions.orgId],
    references: [organizations.id]
  })
}))

// ── Webhooks (outbound) ────────────────────────────────────────────────────
export const webhooks = pgTable('webhooks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  orgId:       uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  url:         text('url').notNull(),
  secret:      text('secret').notNull(),
  events:      jsonb('events').notNull().default([]),
  description: text('description'),
  active:      boolean('active').notNull().default(true),
  lastDeliveryAt:     timestamp('last_delivery_at'),
  lastDeliveryStatus: text('last_delivery_status'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_webhooks_org_id').on(table.orgId),
  index('idx_webhooks_active').on(table.active)
])

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id:           uuid('id').primaryKey().defaultRandom(),
  webhookId:    uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event:        text('event').notNull(),
  statusCode:   integer('status_code'),
  responseBody: text('response_body'),
  error:        text('error'),
  attempt:      integer('attempt').notNull().default(1),
  deliveredAt:  timestamp('delivered_at').notNull().defaultNow()
}, (table) => [
  index('idx_webhook_deliveries_webhook_id').on(table.webhookId)
])

// ── FinOps Recommendation States ──────────────────────────────────────────
export const finopsRecommendationStates = pgTable('finops_recommendation_states', {
  id:           uuid('id').primaryKey().defaultRandom(),
  orgId:        uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  resourceId:   text('resource_id').notNull(),
  category:     text('category').notNull(),
  state:        recommendationStateEnum('state').notNull().default('open'),
  snoozedUntil: timestamp('snoozed_until'),
  notes:        text('notes'),
  dismissalReason: text('dismissal_reason'),
  dismissalNote:   text('dismissal_note'),
  firstDetectedAt: timestamp('first_detected_at').defaultNow(),
  appliedVerifiedAt: timestamp('applied_verified_at'),
  lastVerifiedStatus: text('last_verified_status'),
  verifiedSavingsMonthly: text('verified_savings_monthly'),
  updatedBy:    uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  uniqueIndex('idx_finops_states_org_resource').on(table.orgId, table.resourceId, table.category),
  index('idx_finops_states_org_state').on(table.orgId, table.state)
])

// ── Control Comments (C-A5) ────────────────────────────────────────────────
export const controlComments = pgTable('control_comments', {
  id:              uuid('id').primaryKey().defaultRandom(),
  orgId:           uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  controlDefId:    uuid('control_def_id').notNull().references(() => controlDefinitions.id),
  authorId:        uuid('author_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  body:            text('body').notNull(),
  parentCommentId: uuid('parent_comment_id'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  editedAt:        timestamp('edited_at'),
  deletedAt:       timestamp('deleted_at')
}, (table) => [
  index('idx_comments_org_control').on(table.orgId, table.controlDefId),
  index('idx_comments_author').on(table.authorId)
])

// ── Control Exemptions (C-A3) ──────────────────────────────────────────────
export const controlExemptions = pgTable('control_exemptions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  orgId:         uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  controlDefId:  uuid('control_def_id').notNull().references(() => controlDefinitions.id),
  requestedBy:   uuid('requested_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  approvedBy:    uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  reason:        text('reason').notNull(),
  justification: text('justification'),
  expiresAt:     timestamp('expires_at'),
  status:        text('status').notNull().default('pending'),
  decidedAt:     timestamp('decided_at'),
  createdAt:     timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_exemptions_org_id').on(table.orgId)
])

// ── Compliance Score Snapshots (C-A2) ──────────────────────────────────────
export const complianceScoreSnapshots = pgTable('compliance_score_snapshots', {
  id:            uuid('id').primaryKey().defaultRandom(),
  orgId:         uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  framework:     text('framework').notNull(),
  scoreOverall:  integer('score_overall').notNull().default(0),
  scorePass:     integer('score_pass').notNull().default(0),
  scoreFail:     integer('score_fail').notNull().default(0),
  scoreReview:   integer('score_review').notNull().default(0),
  scoreTotal:    integer('score_total').notNull().default(0),
  capturedAt:    timestamp('captured_at').notNull().defaultNow()
}, (table) => [
  index('idx_score_snapshots_org_framework').on(table.orgId, table.framework),
  index('idx_score_snapshots_captured_at').on(table.capturedAt)
])

// ── Budgets (F-A3) ─────────────────────────────────────────────────────────
export const budgets = pgTable('budgets', {
  id:              uuid('id').primaryKey().defaultRandom(),
  orgId:           uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),
  scope:           text('scope').notNull().default('org'),
  scopeValue:      text('scope_value'),
  monthlyAmount:   text('monthly_amount').notNull(),
  currency:        text('currency').notNull().default('USD'),
  notifyAt:        jsonb('notify_at').notNull().default([50, 80, 100]),
  channels:        jsonb('channels').notNull().default(['email']),
  lastNotifiedThreshold: integer('last_notified_threshold'),
  createdBy:       uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  index('idx_budgets_org_id').on(table.orgId)
])

// ── Anomalies (F-A3) ──────────────────────────────────────────────────────
export const anomalies = pgTable('anomalies', {
  id:              uuid('id').primaryKey().defaultRandom(),
  orgId:           uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  detectedAt:      timestamp('detected_at').notNull().defaultNow(),
  scope:           text('scope').notNull().default('service'),
  scopeValue:      text('scope_value').notNull(),
  baselineCost:    text('baseline_cost').notNull(),
  observedCost:    text('observed_cost').notNull(),
  deltaPct:        text('delta_pct').notNull(),
  severity:        text('severity').notNull().default('medium'),
  status:          text('status').notNull().default('open'),
  acknowledgedBy:  uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
  acknowledgedAt:  timestamp('acknowledged_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_anomalies_org_id').on(table.orgId),
  index('idx_anomalies_org_status').on(table.orgId, table.status)
])

// ── Slack workspaces (per-org Slack OAuth installs) ────────────────────────
export const slackWorkspaces = pgTable('slack_workspaces', {
  id:           uuid('id').primaryKey().defaultRandom(),
  orgId:        uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  teamId:       text('team_id').notNull(),
  teamName:     text('team_name'),
  accessToken:  text('access_token').notNull(),
  botUserId:    text('bot_user_id'),
  scope:        text('scope'),
  channelId:    text('channel_id'),
  channelName:  text('channel_name'),
  installedBy:  uuid('installed_by').references(() => users.id, { onDelete: 'set null' }),
  active:       boolean('active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow()
}, (table) => [
  uniqueIndex('idx_slack_workspaces_org_team').on(table.orgId, table.teamId),
  index('idx_slack_workspaces_org_id').on(table.orgId)
])
