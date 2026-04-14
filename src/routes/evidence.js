import { db } from '../db/client.js'
import { evidenceItems, controlResults, controlDefinitions, organizations, scans } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { getAllowedFrameworks } from '../middleware/plan.js'
import { generateEvidencePdf } from '../services/pdf/evidenceReport.js'
import { auditAction } from '../services/audit.js'

export default async function evidenceRoutes(fastify) {

  // GET /api/v1/evidence
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Evidence'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          framework: { type: 'string' },
          limit: { type: 'integer', default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const { limit = 50 } = request.query

    const results = await db
      .select({
        id: controlResults.id,
        controlId: controlDefinitions.controlId,
        title: controlDefinitions.title,
        framework: controlDefinitions.framework,
        category: controlDefinitions.category,
        severity: controlDefinitions.severity,
        status: controlResults.status,
        evidence: controlResults.evidence,
        checkedAt: controlResults.checkedAt,
        notes: controlResults.notes,
      })
      .from(controlResults)
      .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
      .where(eq(controlResults.orgId, request.orgId))
      .orderBy(desc(controlResults.checkedAt))
      .limit(limit)

    const manualItems = await db.query.evidenceItems.findMany({
      where: eq(evidenceItems.orgId, request.orgId),
      orderBy: [desc(evidenceItems.collectedAt)],
      limit: 50
    })

    return reply.send({ automated: results, manual: manualItems, total: results.length + manualItems.length })
  })

  // POST /api/v1/evidence — manual evidence upload
  fastify.post('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Evidence'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title:           { type: 'string' },
          description:     { type: 'string' },
          controlResultId: { type: 'string' },
          data:            { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const [item] = await db.insert(evidenceItems).values({
      orgId: request.orgId,
      title: request.body.title,
      description: request.body.description,
      controlResultId: request.body.controlResultId,
      data: request.body.data,
      collectedAt: new Date()
    }).returning()

    await auditAction({ orgId: request.orgId, userId: request.user.id, action: 'evidence.created', resourceId: item.id })
    return reply.status(201).send(item)
  })

  // DELETE /api/v1/evidence/:id
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Evidence'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    await db.delete(evidenceItems).where(and(
      eq(evidenceItems.id, request.params.id),
      eq(evidenceItems.orgId, request.orgId)
    ))
    return reply.status(204).send()
  })

  // GET /api/v1/evidence/export/pdf
  fastify.get('/export/pdf', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Evidence'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { framework: { type: 'string', default: 'soc2' } }
      }
    }
  }, async (request, reply) => {
    const framework = request.query.framework || 'soc2'

    // Check if user has access to this framework
    const plan = request.user.org?.plan || 'starter'
    const allowedFrameworks = getAllowedFrameworks(plan)
    
    if (!allowedFrameworks.includes(framework)) {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `PDF export for ${framework.toUpperCase()} is only available on the Growth plan`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'growth',
        currentPlan: plan
      })
    }

    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, request.orgId) })

    const controlData = await db
      .select({
        controlId: controlDefinitions.controlId,
        title: controlDefinitions.title,
        framework: controlDefinitions.framework,
        category: controlDefinitions.category,
        severity: controlDefinitions.severity,
        description: controlDefinitions.description,
        guidance: controlDefinitions.guidance,
        automatable: controlDefinitions.automatable,
        status: controlResults.status,
        evidence: controlResults.evidence,
        checkedAt: controlResults.checkedAt,
        notes: controlResults.notes,
      })
      .from(controlDefinitions)
      .leftJoin(controlResults, and(
        eq(controlResults.controlDefId, controlDefinitions.id),
        eq(controlResults.orgId, request.orgId)
      ))
      .where(eq(controlDefinitions.framework, framework))
      .orderBy(controlDefinitions.category, controlDefinitions.controlId)

    const recentScans = await db.query.scans.findMany({
      where: and(eq(scans.orgId, request.orgId), eq(scans.status, 'complete')),
      orderBy: [desc(scans.completedAt)],
      limit: 5
    })

    const total = controlData.length
    const passing = controlData.filter(c => c.status === 'pass').length
    const score = total > 0 ? Math.round((passing / total) * 100) : 0

    const pdfBuffer = await generateEvidencePdf({
      org, framework, controls: controlData, scans: recentScans,
      score, generatedAt: new Date(), generatedBy: request.user
    })

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'evidence.exported', metadata: { framework, score, controlCount: total }
    })

    const filename = `${org.slug}-${framework}-evidence-${new Date().toISOString().slice(0, 10)}.pdf`
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer)
  })
}
