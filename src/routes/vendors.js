import { db } from '../db/client.js'
import { vendors } from '../db/schema.js'
import { eq, and, asc, lte } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

export default async function vendorRoutes(fastify) {

  // GET /api/v1/vendors
  // List all vendors with optional risk/expiry filters
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Vendors'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          riskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          expiringSoon: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    // Build WHERE conditions — push filters to SQL
    const conditions = [eq(vendors.orgId, request.orgId)]
    if (request.query.riskLevel) {
      conditions.push(eq(vendors.riskLevel, request.query.riskLevel))
    }

    let allVendors = await db.query.vendors.findMany({
      where: and(...conditions),
      orderBy: [asc(vendors.name)]
    })

    // Filter to vendors with certs expiring within 60 days
    if (request.query.expiringSoon) {
      const cutoff = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      allVendors = allVendors.filter(v =>
        (v.soc2ExpiresAt && new Date(v.soc2ExpiresAt) <= cutoff) ||
        (v.iso27001ExpiresAt && new Date(v.iso27001ExpiresAt) <= cutoff)
      )
    }

    // Annotate with expiry status
    const now = new Date()
    const annotated = allVendors.map(v => ({
      ...v,
      soc2Status: certStatus(v.soc2ExpiresAt, now),
      iso27001Status: certStatus(v.iso27001ExpiresAt, now),
    }))

    // Summary stats
    const stats = {
      total: annotated.length,
      critical: annotated.filter(v => v.riskLevel === 'critical').length,
      expiringSoon: annotated.filter(v => v.soc2Status === 'expiring' || v.iso27001Status === 'expiring').length,
      expired: annotated.filter(v => v.soc2Status === 'expired' || v.iso27001Status === 'expired').length,
    }

    return reply.send({ vendors: annotated, stats })
  })

  // GET /api/v1/vendors/:id
  fastify.get('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Vendors'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const vendor = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, request.params.id), eq(vendors.orgId, request.orgId))
    })
    if (!vendor) return reply.status(404).send({ error: 'Not Found', message: 'Vendor not found' })

    const now = new Date()
    return reply.send({
      ...vendor,
      soc2Status: certStatus(vendor.soc2ExpiresAt, now),
      iso27001Status: certStatus(vendor.iso27001ExpiresAt, now),
    })
  })

  // POST /api/v1/vendors
  fastify.post('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Vendors'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name:               { type: 'string' },
          website:            { type: 'string' },
          category:           { type: 'string' },
          riskLevel:          { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          soc2ExpiresAt:      { type: 'string', format: 'date' },
          iso27001ExpiresAt:  { type: 'string', format: 'date' },
          notes:              { type: 'string' },
          metadata:           { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const [vendor] = await db.insert(vendors).values({
      orgId:              request.orgId,
      name:               request.body.name,
      website:            request.body.website,
      category:           request.body.category,
      riskLevel:          request.body.riskLevel || 'medium',
      soc2ExpiresAt:      request.body.soc2ExpiresAt ? new Date(request.body.soc2ExpiresAt) : null,
      iso27001ExpiresAt:  request.body.iso27001ExpiresAt ? new Date(request.body.iso27001ExpiresAt) : null,
      notes:              request.body.notes,
      metadata:           request.body.metadata,
    }).returning()

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'vendor.created', resourceId: vendor.id,
      metadata: { name: vendor.name }
    })

    return reply.status(201).send(vendor)
  })

  // PATCH /api/v1/vendors/:id
  fastify.patch('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Vendors'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name:               { type: 'string' },
          website:            { type: 'string' },
          category:           { type: 'string' },
          riskLevel:          { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          soc2ExpiresAt:      { type: 'string' },
          iso27001ExpiresAt:  { type: 'string' },
          notes:              { type: 'string' },
          metadata:           { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const existing = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, request.params.id), eq(vendors.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Vendor not found' })

    const updates = { updatedAt: new Date() }
    const fields = ['name', 'website', 'category', 'riskLevel', 'notes', 'metadata']
    for (const f of fields) {
      if (request.body[f] !== undefined) updates[f] = request.body[f]
    }
    if (request.body.soc2ExpiresAt !== undefined) {
      updates.soc2ExpiresAt = request.body.soc2ExpiresAt ? new Date(request.body.soc2ExpiresAt) : null
    }
    if (request.body.iso27001ExpiresAt !== undefined) {
      updates.iso27001ExpiresAt = request.body.iso27001ExpiresAt ? new Date(request.body.iso27001ExpiresAt) : null
    }

    const [updated] = await db.update(vendors).set(updates)
      .where(and(eq(vendors.id, request.params.id), eq(vendors.orgId, request.orgId)))
      .returning()

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'vendor.updated', resourceId: updated.id
    })

    return reply.send(updated)
  })

  // DELETE /api/v1/vendors/:id
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Vendors'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const existing = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, request.params.id), eq(vendors.orgId, request.orgId))
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Vendor not found' })

    await db.delete(vendors).where(and(
      eq(vendors.id, request.params.id),
      eq(vendors.orgId, request.orgId)
    ))

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'vendor.deleted', resourceId: request.params.id,
      metadata: { name: existing.name }
    })

    return reply.status(204).send()
  })
}

// ── Helper ─────────────────────────────────────────────────────────────────
function certStatus(expiresAt, now) {
  if (!expiresAt) return 'none'
  const exp = new Date(expiresAt)
  if (exp < now) return 'expired'
  const daysLeft = (exp - now) / (1000 * 60 * 60 * 24)
  if (daysLeft <= 60) return 'expiring'
  return 'valid'
}
