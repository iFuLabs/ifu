// Shared helper for both scanWorker (Comply) and finopsWorker. When a
// scheduled scan fails on what looks like an auth/connection issue, email
// the org owner — but only once per 24 h per integration so retry storms
// don't spam them.

import { db } from '../db/client.js'
import { integrations, organizations, users } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { sendIntegrationFailureEmail } from './email.js'
import { logger } from './logger.js'

const DEBOUNCE_MS = 24 * 60 * 60 * 1000

export async function notifyIntegrationFailure({ orgId, integrationId, errorMessage }) {
  try {
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, integrationId)
    })
    if (!integration) return

    if (integration.lastFailureEmailAt &&
        Date.now() - new Date(integration.lastFailureEmailAt).getTime() < DEBOUNCE_MS) {
      return // sent within the last 24h, don't spam
    }

    const owner = await db.query.users.findFirst({
      where: and(eq(users.orgId, orgId), eq(users.role, 'owner'))
    })
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    })
    if (!owner?.email || !org) return

    await sendIntegrationFailureEmail({
      to: owner.email,
      name: owner.name,
      orgName: org.name,
      integrationType: integration.type,
      errorMessage
    })

    await db.update(integrations)
      .set({ lastFailureEmailAt: new Date() })
      .where(eq(integrations.id, integrationId))
  } catch (err) {
    logger.warn({ err: err.message, integrationId }, 'notifyIntegrationFailure failed')
  }
}
