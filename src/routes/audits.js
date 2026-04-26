import { db } from '../db/client.js'
import { audits } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

export default async function auditRoutes(fastify) {

  // GET /api/v1/audits
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Audits'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.audits.findMany({
      where: eq(audits.orgId, request.orgId)
    })
    return reply.send(results)
  })

  // POST /api/v1/audits
  fastify.post('/', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Audits'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['framework', 'type'],
        properties: {
          framework: { type: 'string' },
          type: { type: 'string', enum: ['type1', 'type2', 'iso', 'gdpr', 'hipaa', 'pci'] },
          status: { type: 'string', enum: ['planning', 'in_progress', 'complete'] },
          kickoffAt: { type: 'string' },
          fieldworkAt: { type: 'string' },
          expectedCloseAt: { type: 'string' },
          auditorFirm: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { framework, type, status, kickoffAt, fieldworkAt, expectedCloseAt, auditorFirm, notes } = request.body

    const [audit] = await db.insert(audits).values({
      orgId: request.orgId,
      framework,
      type,
      status: status || 'planning',
      kickoffAt: kickoffAt ? new Date(kickoffAt) : null,
      fieldworkAt: fieldworkAt ? new Date(fieldworkAt) : null,
      expectedCloseAt: expectedCloseAt ? new Date(expectedCloseAt) : null,
      auditorFirm,
      notes
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'audit.created',
      resource: 'audit',
      resourceId: audit.id,
      metadata: { framework, type }
    })

    return reply.status(201).send(audit)
  })

  // PATCH /api/v1/audits/:id
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Audits'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['planning', 'in_progress', 'complete'] },
          kickoffAt: { type: 'string' },
          fieldworkAt: { type: 'string' },
          expectedCloseAt: { type: 'string' },
          completedAt: { type: 'string' },
          auditorFirm: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const existing = await db.query.audits.findFirst({
      where: and(eq(audits.id, request.params.id), eq(audits.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Audit not found' })

    const updates = { updatedAt: new Date() }
    for (const key of ['status', 'auditorFirm', 'notes']) {
      if (request.body[key] !== undefined) updates[key] = request.body[key]
    }
    for (const key of ['kickoffAt', 'fieldworkAt', 'expectedCloseAt', 'completedAt']) {
      if (request.body[key] !== undefined) updates[key] = request.body[key] ? new Date(request.body[key]) : null
    }

    const [updated] = await db.update(audits).set(updates).where(eq(audits.id, existing.id)).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'audit.updated',
      resource: 'audit',
      resourceId: existing.id,
      metadata: updates
    })

    return reply.send(updated)
  })

  // DELETE /api/v1/audits/:id
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Audits'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const existing = await db.query.audits.findFirst({
      where: and(eq(audits.id, request.params.id), eq(audits.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Audit not found' })

    await db.delete(audits).where(eq(audits.id, existing.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'audit.deleted',
      resource: 'audit',
      resourceId: existing.id
    })

    return reply.status(204).send()
  })

  // GET /api/v1/audits/calendar.ics
  fastify.get('/calendar.ics', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Audits'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const orgAudits = await db.query.audits.findMany({
      where: eq(audits.orgId, request.orgId)
    })

    const formatDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

    const events = orgAudits.flatMap(a => {
      const items = []
      if (a.kickoffAt) items.push({ summary: `${a.framework} Audit Kickoff`, date: a.kickoffAt })
      if (a.fieldworkAt) items.push({ summary: `${a.framework} Audit Fieldwork`, date: a.fieldworkAt })
      if (a.expectedCloseAt) items.push({ summary: `${a.framework} Audit Close`, date: a.expectedCloseAt })
      return items.map(e => `BEGIN:VEVENT\r\nDTSTART:${formatDate(e.date)}\r\nSUMMARY:${e.summary}\r\nUID:${a.id}-${e.summary.replace(/\s/g, '')}\r\nEND:VEVENT`)
    })

    const ical = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//iFu Labs//Comply//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR`

    reply.header('Content-Type', 'text/calendar; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="comply-audits.ics"')
    return reply.send(ical)
  })
}
