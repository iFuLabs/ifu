import crypto from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/client.js'
import { users, organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { verifyToken } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import { slugify } from '../services/utils.js'
import { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_OPTIONS, TRIAL_DURATION_MS } from '../services/config.js'
import { sendWelcomeEmail } from '../services/email.js'
import { getActiveSubscriptions } from '../services/subscriptions.js'

const onboardSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .optional(),
  orgName: z.string().min(2).max(100),
  orgDomain: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export default async function authRoutes(fastify) {

  // POST /api/v1/auth/check-email
  // Check if email is available for registration
  fastify.post('/check-email', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    const { email } = request.body

    if (!email || !email.trim()) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email is required'
      })
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.trim().toLowerCase())
    })

    return reply.send({
      available: !existingUser,
      message: existingUser ? 'Email already registered' : 'Email available'
    })
  })

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

    // Get active subscriptions from new table
    const activeSubscriptions = await getActiveSubscriptions(request.user.orgId)

    // BACKWARD COMPATIBILITY: If no subscriptions in new table, create from org.plan
    // This handles users who signed up before the multi-product migration
    let subscriptionsToReturn = activeSubscriptions
    
    if (subscriptionsToReturn.length === 0 && org.plan) {
      // Determine product from plan
      const product = org.plan === 'finops' ? 'finops' : 'comply'
      const now = new Date()
      const isTrialing = org.trialEndsAt && new Date(org.trialEndsAt) > now
      
      // Return a virtual subscription based on org data
      subscriptionsToReturn = [{
        product,
        plan: org.plan,
        status: isTrialing ? 'trialing' : (org.paystackSubscriptionCode ? 'active' : 'expired'),
        trialEndsAt: org.trialEndsAt
      }]
    }

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
      },
      subscriptions: subscriptionsToReturn.map(sub => ({
        product: sub.product,
        plan: sub.plan,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt
      }))
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
    try {
      const body = onboardSchema.parse(request.body)

      // Normalize email
      const normalizedEmail = body.email.trim().toLowerCase()

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail)
      })

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        })
      }

    const userEmail = normalizedEmail
    const userName = body.name
    const passwordHash = await bcrypt.hash(body.password, 10)

    // Generate unique slug — retry with random suffix on conflict
    const baseSlug = slugify(body.orgName)
    let result
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`
      try {
        result = await db.transaction(async (tx) => {
          const [org] = await tx.insert(organizations).values({
            name: body.orgName,
            slug,
            domain: body.orgDomain,
            plan: 'starter',
            trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS)
          }).returning()

          const [user] = await tx.insert(users).values({
            auth0Id: null,
            email: userEmail,
            name: userName,
            passwordHash,
            orgId: org.id,
            role: 'owner'
          }).returning()

          return { org, user }
        })
        break // success
      } catch (err) {
        // Unique constraint violation on slug — retry with different suffix
        if (err.code === '23505' && err.constraint?.includes('slug')) continue
        throw err
      }
    }

    if (!result) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Could not generate a unique organization slug. Please try a different name.'
      })
    }

    await auditAction({
      orgId: result.org.id,
      userId: result.user.id,
      action: 'auth.onboarded',
      metadata: { orgName: body.orgName, email: userEmail }
    })

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      to: userEmail,
      name: userName,
      orgName: result.org.name
    })

    if (!emailResult.success) {
      fastify.log.warn({ error: emailResult.error }, 'Failed to send welcome email')
      // Don't fail the request if email fails
    }

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

    reply.setCookie('auth_token', token, COOKIE_OPTIONS)

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
    } catch (err) {
      // Handle Zod validation errors
      if (err.name === 'ZodError') {
        const firstError = err.errors[0]
        return reply.status(400).send({
          error: 'Validation Error',
          message: firstError.message
        })
      }
      
      fastify.log.error({ err, email: request.body?.email }, 'Onboarding failed')
      
      // Don't expose internal errors to client
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create account. Please try again or contact support.'
      })
    }
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
    try {
      const body = loginSchema.parse(request.body)

    // Normalize email
    const normalizedEmail = body.email.trim().toLowerCase()

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
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

    reply.setCookie('auth_token', token, COOKIE_OPTIONS)

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
    } catch (err) {
      fastify.log.error({ err, email: request.body?.email }, 'Login failed')
      
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed. Please try again or contact support.'
      })
    }
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

  // POST /api/v1/auth/logout
  // Clear the auth cookie
  fastify.post('/logout', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    reply.clearCookie('auth_token', { path: '/' })
    return reply.send({ message: 'Logged out' })
  })

  // POST /api/v1/auth/forgot-password
  // Request password reset email
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    const { email } = request.body

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    // Always return success (don't reveal if email exists)
    const successMessage = 'If email exists, reset link sent'

    if (!user) {
      // User doesn't exist, but don't reveal that
      return reply.send({ message: successMessage })
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    // Store token in database
    const { passwordResetTokens } = await import('../db/schema.js')
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      used: false
    })

    // Send password reset email
    const { sendPasswordResetEmail } = await import('../services/email.js')
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3003'
    const resetUrl = `${portalUrl}/reset-password/${token}`

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl
    })

    if (!emailResult.success) {
      fastify.log.warn({ error: emailResult.error }, 'Failed to send password reset email')
      // Don't fail the request if email fails
    }

    await auditAction({
      orgId: user.orgId,
      userId: user.id,
      action: 'auth.password_reset_requested',
      metadata: { email }
    })

    return reply.send({ message: successMessage })
  })

  // POST /api/v1/auth/reset-password
  // Reset password with token
  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { 
            type: 'string', 
            minLength: 8,
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { token, newPassword } = request.body

    // Validate password
    if (newPassword.length < 8) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters'
      })
    }

    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Password must include uppercase, lowercase, number, and special character'
      })
    }

    // Find token
    const { passwordResetTokens } = await import('../db/schema.js')
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token)
    })

    if (!resetToken) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })
    }

    // Check if token is already used
    if (resetToken.used) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update user password
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId))

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id))

    // Get user for audit log
    const user = await db.query.users.findFirst({
      where: eq(users.id, resetToken.userId)
    })

    await auditAction({
      orgId: user.orgId,
      userId: user.id,
      action: 'auth.password_reset_completed',
      metadata: { email: user.email }
    })

    return reply.send({ message: 'Password reset successful' })
  })
}
