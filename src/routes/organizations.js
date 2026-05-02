import { db } from '../db/client.js'
import { users, organizations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin, requireOwner } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

export default async function organizationRoutes(fastify) {

  // GET /api/v1/organizations/current
  fastify.get('/current', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Organizations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })
    return reply.send(org)
  })

  // PATCH /api/v1/organizations/current
  fastify.patch('/current', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          domain: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const updates = {}
    if (request.body.name) updates.name = request.body.name
    if (request.body.domain) updates.domain = request.body.domain
    updates.updatedAt = new Date()

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, request.orgId))
      .returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'organization.updated',
      metadata: updates
    })

    return reply.send(updated)
  })

  // GET /api/v1/organizations/scan-settings
  // Returns the org's per-product scan schedule (admin-controlled refresh timing).
  fastify.get('/scan-settings', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Organizations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })
    const defaults = {
      comply:  { enabled: true, hourUtc: 2 },
      finops:  { enabled: true, hourUtc: 3 },
      anomaly: { enabled: true, hourUtc: 3 }
    }
    return reply.send({
      comply:  { ...defaults.comply,  ...(org?.scanSettings?.comply  || {}) },
      finops:  { ...defaults.finops,  ...(org?.scanSettings?.finops  || {}) },
      anomaly: { ...defaults.anomaly, ...(org?.scanSettings?.anomaly || {}) }
    })
  })

  // PATCH /api/v1/organizations/scan-settings
  // Update the per-product scan schedule. Admins only.
  fastify.patch('/scan-settings', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          comply:  { type: 'object', properties: { enabled: { type: 'boolean' }, hourUtc: { type: 'integer', minimum: 0, maximum: 23 } } },
          finops:  { type: 'object', properties: { enabled: { type: 'boolean' }, hourUtc: { type: 'integer', minimum: 0, maximum: 23 } } },
          anomaly: { type: 'object', properties: { enabled: { type: 'boolean' }, hourUtc: { type: 'integer', minimum: 0, maximum: 23 } } }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const current = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })
    const merged = {
      comply:  { enabled: true, hourUtc: 2, ...(current?.scanSettings?.comply  || {}), ...(request.body.comply  || {}) },
      finops:  { enabled: true, hourUtc: 3, ...(current?.scanSettings?.finops  || {}), ...(request.body.finops  || {}) },
      anomaly: { enabled: true, hourUtc: 3, ...(current?.scanSettings?.anomaly || {}), ...(request.body.anomaly || {}) }
    }

    await db.update(organizations)
      .set({ scanSettings: merged, updatedAt: new Date() })
      .where(eq(organizations.id, request.orgId))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'organization.scan_settings_updated',
      metadata: request.body
    })

    return reply.send(merged)
  })

  // GET /api/v1/organizations/members
  fastify.get('/members', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Organizations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const members = await db.query.users.findMany({
      where: eq(users.orgId, request.orgId),
      columns: { auth0Id: false } // Never expose auth0 IDs
    })
    return reply.send(members)
  })

  // PATCH /api/v1/organizations/members/:userId/role
  fastify.patch('/members/:userId/role', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: {
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { userId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['role'],
        properties: { role: { type: 'string', enum: ['admin', 'member'] } }
      }
    }
  }, async (request, reply) => {
    // Can't change your own role
    if (request.params.userId === request.user.id) {
      return reply.status(400).send({ error: 'Bad Request', message: "You can't change your own role" })
    }

    const [updated] = await db
      .update(users)
      .set({ role: request.body.role, updatedAt: new Date() })
      .where(and(
        eq(users.id, request.params.userId),
        eq(users.orgId, request.orgId)
      ))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: 'Not Found', message: 'Member not found' })
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'member.role_changed',
      resourceId: request.params.userId,
      metadata: { newRole: request.body.role }
    })

    return reply.send(updated)
  })

  // DELETE /api/v1/organizations/members/:userId
  fastify.delete('/members/:userId', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: {
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { userId: { type: 'string' } } }
    }
  }, async (request, reply) => {
    if (request.params.userId === request.user.id) {
      return reply.status(400).send({ error: 'Bad Request', message: "You can't remove yourself" })
    }

    await db
      .delete(users)
      .where(and(
        eq(users.id, request.params.userId),
        eq(users.orgId, request.orgId)
      ))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'member.removed',
      resourceId: request.params.userId
    })

    return reply.status(204).send()
  })
}
