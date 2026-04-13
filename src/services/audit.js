import { db } from '../db/client.js'
import { auditLog } from '../db/schema.js'
import { logger } from './logger.js'

export async function auditAction({ orgId, userId, action, resource, resourceId, metadata, ipAddress }) {
  try {
    await db.insert(auditLog).values({
      orgId,
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress
    })
  } catch (err) {
    // Audit log failures should never break the main flow
    logger.error({ err, action, orgId }, 'Audit log error')
  }
}
