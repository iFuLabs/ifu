import { z } from 'zod'
import { db } from '../db/client.js'
import { users, organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { verifyToken } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import { slugify } from '../services/utils.js'

const onboardSchema = z.object({
  orgName: z.string().min(2).max(100),
  orgDomain: z.string().optional()
})

export default async function authRoutes(fastify) {

  // GET /api/v1/auth/me
  // Returns the current user + org. Called by frontend on every load.
  fastify.get('/me', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Auth'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    if (!request.user) {
      // User has a valid Auth0 token but hasn't completed onboarding
      return reply.status(200).send({
        authenticated: true,
        onboarded: false,
        auth0Sub: request.auth0Sub,
        email: request.auth0Email
      })
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.user.orgId)
    })

    return reply.send({
      authenticated: true,
      onboarded: true,
      user: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        avatarUrl: request.user.avatarUrl,
        role: request.user.role
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt
      }
    })
  })

  // POST /api/v1/auth/onboard
  // Creates org + user record on first login
  fastify.post('/onboard', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orgName'],
        properties: {
          orgName: { type: 'string' },
          orgDomain: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    // If already onboarded, return existing profile
    if (request.user) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User already onboarded'
      })
    }

    const body = onboardSchema.parse(request.body)

    // Generate unique slug for the org
    let slug = slugify(body.orgName)
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    })
    if (existing) slug = `${slug}-${Date.now()}`

    // Create org + user in a transaction
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx.insert(organizations).values({
        name: body.orgName,
        slug,
        domain: body.orgDomain,
        plan: 'starter',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
      }).returning()

      // Create user as owner
      const [user] = await tx.insert(users).values({
        auth0Id: request.auth0Sub,
        email: request.auth0Email,
        orgId: org.id,
        role: 'owner'
      }).returning()

      return { org, user }
    })

    await auditAction({
      orgId: result.org.id,
      userId: result.user.id,
      action: 'auth.onboarded',
      metadata: { orgName: body.orgName }
    })

    return reply.status(201).send({
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        plan: result.org.plan,
        trialEndsAt: result.org.trialEndsAt
      }
    })
  })

  // PATCH /api/v1/auth/me
  // Update user profile (name, avatar)
  fastify.patch('/me', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          avatarUrl: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Onboarding required' })
    }

    const updates = {}
    if (request.body.name) updates.name = request.body.name
    if (request.body.avatarUrl) updates.avatarUrl = request.body.avatarUrl
    updates.updatedAt = new Date()

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, request.user.id))
      .returning()

    return reply.send({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role
    })
  })
}
