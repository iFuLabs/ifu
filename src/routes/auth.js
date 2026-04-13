import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/client.js'
import { users, organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { verifyToken } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import { slugify } from '../services/utils.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'

const onboardSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  orgName: z.string().min(2).max(100),
  orgDomain: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
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
  // Creates org + user record on first signup (no auth required)
  fastify.post('/onboard', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['name', 'email', 'password', 'orgName'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          orgName: { type: 'string' },
          orgDomain: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const body = onboardSchema.parse(request.body)

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email)
    })

    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User with this email already exists'
      })
    }

    const userEmail = body.email
    const userName = body.name
    const passwordHash = await bcrypt.hash(body.password, 10)

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
        auth0Id: null, // No Auth0, using local auth
        email: userEmail,
        name: userName,
        passwordHash,
        orgId: org.id,
        role: 'owner'
      }).returning()

      return { org, user }
    })

    await auditAction({
      orgId: result.org.id,
      userId: result.user.id,
      action: 'auth.onboarded',
      metadata: { orgName: body.orgName, email: userEmail }
    })

    // Generate JWT token for session
    const token = jwt.sign(
      { 
        userId: result.user.id, 
        email: result.user.email,
        orgId: result.org.id,
        role: result.user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return reply.status(201).send({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
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

  // POST /api/v1/auth/login
  // Login with email + password
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body)

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
      with: { org: true }
    })

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      })
    }

    // Verify password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash)
    if (!validPassword) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        orgId: user.orgId,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    await auditAction({
      orgId: user.orgId,
      userId: user.id,
      action: 'auth.login',
      metadata: { email: body.email }
    })

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      organization: {
        id: user.org.id,
        name: user.org.name,
        slug: user.org.slug,
        plan: user.org.plan
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
