import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['starter', 'growth', 'enterprise'])
export const controlStatusEnum = pgEnum('control_status', ['pass', 'fail', 'review', 'not_applicable'])
export const frameworkEnum = pgEnum('framework', ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'])
export const integrationTypeEnum = pgEnum('integration_type', ['aws', 'github', 'okta', 'google_workspace'])
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error'])
export const severityEnum = pgEnum('severity', ['critical', 'high', 'medium', 'low'])
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired'])

// ── Organizations (tenants) ────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  domain:          text('domain'),                          // e.g. acme.com
  plan:            planEnum('plan').notNull().default('starter'),
  paystackCustomerCode: text('paystack_customer_code'),
  paystackSubscriptionCode: text('paystack_subscription_code'),
  paystackAuthCode: text('paystack_auth_code'),
  trialEndsAt:     timestamp('trial_ends_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow()
})

// ── Users ──────────────────────────────────────────────────────────────────
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
  index('idx_invitations_org_id_status').on(table.orgId, table.status)
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
  checkedAt:      timestamp('checked_at').notNull().defaultNow(),
  nextCheckAt:    timestamp('next_check_at'),
  createdAt:      timestamp('created_at').notNull().defaultNow()
}, (table) => [
  index('idx_control_results_org_id').on(table.orgId),
  uniqueIndex('idx_control_results_org_control').on(table.orgId, table.controlDefId)
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
  invitations: many(invitations)
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
