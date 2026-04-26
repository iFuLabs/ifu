import { db } from '../db/client.js'
import { auditLog, users } from '../db/schema.js'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'

export default async function auditLogRoutes(fastify) {

  // GET /api/v1/audit-log
  // Query audit log with filters (admin/owner/auditor only)
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          actor: { type: 'string' },
          action: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          limit: { type: 'integer', default: 50, maximum: 200 },
          offset: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    // Only admin, owner, or auditor can view audit log
    if (!['owner', 'admin', 'auditor'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Admin or auditor access required' })
    }

    const { actor, action, start, end, limit = 50, offset = 0 } = request.query
    const conditions = [eq(auditLog.orgId, request.orgId)]

    if (actor) conditions.push(eq(auditLog.userId, actor))
    if (action) conditions.push(eq(auditLog.action, action))
    if (start) conditions.push(gte(auditLog.createdAt, new Date(start)))
    if (end) conditions.push(lte(auditLog.createdAt, new Date(end)))

    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        metadata: auditLog.metadata,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
        userId: auditLog.userId,
        userEmail: users.email,
        userName: users.name
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: db.$count(auditLog, and(...conditions)) })
      .from(auditLog)
      .where(and(...conditions))
      .catch(() => [{ count: 0 }])

    return reply.send({ rows, total: count, limit, offset })
  })

  // GET /api/v1/audit-log/export
  // CSV export of audit log
  fastify.get('/export', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Audit'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    if (!['owner', 'admin', 'auditor'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        userEmail: users.email
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(eq(auditLog.orgId, request.orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(1000)

    const header = 'Timestamp,Actor,Action,Resource,ResourceId,Metadata'
    const csvRows = rows.map(r => [
      new Date(r.createdAt).toISOString(),
      r.userEmail || 'system',
      r.action,
      r.resource || '',
      r.resourceId || '',
      `"${JSON.stringify(r.metadata || {}).replace(/"/g, '""')}"`
    ].join(','))

    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`)
    return reply.send(`${header}\n${csvRows.join('\n')}`)
  })
}
