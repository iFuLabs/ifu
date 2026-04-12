import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'

// ── Enums ──────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['starter', 'growth', 'enterprise'])
export const controlStatusEnum = pgEnum('control_status', ['pass', 'fail', 'review', 'not_applicable'])
export const frameworkEnum = pgEnum('framework', ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'])
export const integrationTypeEnum = pgEnum('integration_type', ['aws', 'github', 'okta', 'google_workspace'])
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error'])
export const severityEnum = pgEnum('severity', ['critical', 'high', 'medium', 'low'])

// ── Organizations (tenants) ────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  domain:          text('domain'),                          // e.g. acme.com
  plan:            planEnum('plan').notNull().default('starter'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubId:     text('stripe_subscription_id'),
  trialEndsAt:     timestamp('trial_ends_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow()
})

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  auth0Id:        text('auth0_id').notNull().unique(),       // sub from Auth0 JWT
  email:          text('email').notNull().unique(),
  name:           text('name'),
  avatarUrl:      text('avatar_url'),
  orgId:          uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  role:           text('role').notNull().default('member'), // owner | admin | member
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow()
})

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
})

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
})

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
})

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
})

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
})

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
})
