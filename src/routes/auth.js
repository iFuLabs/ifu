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
import { getActiveSubscriptions, upsertSubscription } from '../services/subscriptions.js'
import { initializeTransaction, verifyTransaction, refundTransaction, createTrialSubscription as paystackCreateTrialSub } from '../services/paystack.js'

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
  orgDomain: z.string().optional(),
  role: z.string().optional() // signup role: cto, engineering, compliance, founder, other
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

    // Create Ghara trial subscription (7-day Growth tier, no card required)
    try {
      await upsertSubscription({
        orgId: result.org.id,
        product: 'ghara',
        plan: 'ghara_growth_trial',
        tier: 'growth',
        status: 'trialing',
        products: ['compliance', 'cost'],
        trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS),
      })
    } catch (subErr) {
      fastify.log.warn({ err: subErr.message, orgId: result.org.id }, 'Failed to create trial subscription row — org still created')
    }

    await auditAction({
      orgId: result.org.id,
      userId: result.user.id,
      action: 'auth.onboarded',
      metadata: { orgName: body.orgName, email: userEmail, signupRole: body.role || null }
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

  // POST /api/v1/auth/onboard-tokenize
  // New card-at-signup flow: creates account + redirects to Paystack for card capture
  fastify.post('/onboard-tokenize', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'orgName', 'plan'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          orgName: { type: 'string', minLength: 2 },
          role: { type: 'string' },
          plan: { type: 'string', enum: ['ghara-starter', 'ghara-growth'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { name, email, password, orgName, role, plan } = request.body
      const normalizedEmail = email.trim().toLowerCase()

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail)
      })
      if (existingUser) {
        return reply.status(409).send({ error: 'Conflict', message: 'User with this email already exists' })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const baseSlug = slugify(orgName)
      const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS)

      // Determine plan code
      const PLAN_MAP = {
        'ghara-starter': process.env.PAYSTACK_GHARA_STARTER_PLAN,
        'ghara-growth': process.env.PAYSTACK_GHARA_GROWTH_PLAN,
      }
      const planCode = PLAN_MAP[plan]
      if (!planCode) {
        return reply.status(400).send({ error: 'Invalid plan or plan not configured' })
      }

      // Create org + user
      let result
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`
        try {
          result = await db.transaction(async (tx) => {
            const [org] = await tx.insert(organizations).values({
              name: orgName,
              slug,
              plan: 'starter',
              trialEndsAt
            }).returning()

            const [user] = await tx.insert(users).values({
              email: normalizedEmail,
              name: name?.trim(),
              passwordHash,
              orgId: org.id,
              role: 'owner'
            }).returning()

            return { org, user }
          })
          break
        } catch (err) {
          if (err.code === '23505' && err.constraint?.includes('slug')) continue
          throw err
        }
      }

      if (!result) {
        return reply.status(409).send({ error: 'Conflict', message: 'Could not generate a unique organization slug.' })
      }

      // Create trial subscription row (status: trialing, tier: growth during trial)
      const selectedTier = plan === 'ghara-growth' ? 'growth' : 'starter'
      await upsertSubscription({
        orgId: result.org.id,
        product: 'ghara',
        plan: `ghara_${selectedTier}_trial`,
        tier: 'growth', // Always Growth during trial
        status: 'trialing',
        products: ['compliance', 'cost'],
        trialEndsAt,
      })

      // Initialize Paystack transaction for card tokenization (100 kobo = smallest valid)
      const callbackUrl = `${process.env.GHARA_URL || 'http://localhost:3005'}/billing/callback`
      const paystackResult = await initializeTransaction({
        email: normalizedEmail,
        amount: 100, // 100 kobo = 1 NGN / 1 ZAR cent — will be refunded immediately
        callbackUrl,
        metadata: {
          orgId: result.org.id,
          userId: result.user.id,
          plan,
          planCode,
          selectedTier,
          trialEndsAt: trialEndsAt.toISOString(),
          type: 'card_tokenization'
        }
      })

      // Set auth cookie so user is logged in when they return from Paystack
      const token = jwt.sign({
        userId: result.user.id,
        email: normalizedEmail,
        orgId: result.org.id,
        role: 'owner'
      }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

      reply.setCookie('token', token, COOKIE_OPTIONS)

      await auditAction({
        orgId: result.org.id,
        userId: result.user.id,
        action: 'auth.onboard_tokenize',
        metadata: { plan, selectedTier, reference: paystackResult.reference }
      })

      return reply.send({
        authorizationUrl: paystackResult.authorization_url,
        reference: paystackResult.reference,
        accessCode: paystackResult.access_code,
        user: { id: result.user.id, email: normalizedEmail, name: result.user.name, role: 'owner' },
        organization: { id: result.org.id, name: result.org.name, slug: result.org.slug }
      })
    } catch (err) {
      fastify.log.error({ err, email: request.body?.email }, 'Onboard-tokenize failed')
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Signup failed. Please try again.' })
    }
  })

  // POST /api/v1/auth/complete-signup
  // Called after Paystack card capture callback — verifies, refunds tokenization, creates subscription
  fastify.post('/complete-signup', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Auth'],
      querystring: {
        type: 'object',
        required: ['reference'],
        properties: { reference: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { reference } = request.query

    // Verify the transaction
    const txn = await verifyTransaction(reference)
    if (txn.status !== 'success') {
      return reply.status(400).send({ error: 'Payment verification failed', message: `Transaction status: ${txn.status}` })
    }

    const metadata = txn.metadata || {}
    const authorizationCode = txn.authorization?.authorization_code
    const customerCode = txn.customer?.customer_code

    if (!authorizationCode) {
      return reply.status(400).send({ error: 'Missing card authorization' })
    }

    // Ensure this transaction belongs to the authenticated user's org
    if (metadata.orgId && metadata.orgId !== request.orgId) {
      return reply.status(403).send({ error: 'Transaction does not belong to this organization' })
    }

    // Refund the tokenization charge immediately
    try {
      await refundTransaction(reference)
      fastify.log.info({ reference, orgId: request.orgId }, 'Tokenization charge refunded')
    } catch (refundErr) {
      // Log loudly but don't block the customer — refund can be retried
      fastify.log.error({ err: refundErr.message, reference, orgId: request.orgId }, 'CRITICAL: Tokenization refund failed — needs manual retry')
    }

    // Create the actual Paystack subscription with delayed start_date
    const planCode = metadata.planCode
    const trialEndsAt = metadata.trialEndsAt ? new Date(metadata.trialEndsAt) : new Date(Date.now() + TRIAL_DURATION_MS)

    const subResult = await paystackCreateTrialSub({
      email: txn.customer?.email || request.user?.email,
      planCode,
      authorizationCode,
      trialEndsAt
    })

    // Update org with Paystack details
    await db.update(organizations).set({
      paystackCustomerCode: customerCode,
      paystackAuthCode: authorizationCode,
      paystackSubscriptionCode: subResult.subscriptionCode,
      updatedAt: new Date()
    }).where(eq(organizations.id, request.orgId))

    // Update subscription row
    const { subscriptions } = await import('../db/schema.js')
    const { and: andOp } = await import('drizzle-orm')
    await db.update(subscriptions).set({
      paystackSubscriptionCode: subResult.subscriptionCode,
      paystackPlanCode: planCode,
      tokenizationReference: reference,
      tokenizationRefundedAt: new Date(),
      updatedAt: new Date()
    }).where(andOp(
      eq(subscriptions.orgId, request.orgId),
      eq(subscriptions.product, 'ghara')
    ))

    await auditAction({
      orgId: request.orgId,
      userId: request.user?.id,
      action: 'signup.card_captured',
      metadata: {
        reference,
        subscriptionCode: subResult.subscriptionCode,
        plan: metadata.plan,
        selectedTier: metadata.selectedTier
      }
    })

    return reply.send({
      status: 'success',
      subscriptionCode: subResult.subscriptionCode,
      trialEndsAt: trialEndsAt.toISOString()
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

    await auditAction({
      orgId: request.user.orgId,
      userId: request.user.id,
      action: 'auth.profile_updated',
      metadata: { fields: Object.keys(updates).filter(k => k !== 'updatedAt') }
    })

    return reply.send({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role
    })
  })

  // POST /api/v1/auth/logout
  // Invalidate all outstanding tokens for this user, then clear the cookie.
  // Soft-decode so an already-expired token still triggers cleanup.
  fastify.post('/logout', {
    schema: { tags: ['Auth'] }
  }, async (request, reply) => {
    const authHeader = request.headers.authorization
    const cookieToken = request.cookies?.auth_token
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

    let userId = null
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })
        userId = decoded.userId
      } catch {
        try {
          const decoded = jwt.decode(token)
          if (decoded?.sub) {
            const user = await db.query.users.findFirst({ where: eq(users.auth0Id, decoded.sub) })
            if (user) userId = user.id
          }
        } catch {}
      }
    }

    if (userId) {
      const now = new Date()
      const [updated] = await db
        .update(users)
        .set({ tokensInvalidatedAt: now, updatedAt: now })
        .where(eq(users.id, userId))
        .returning({ orgId: users.orgId })
      await auditAction({ orgId: updated?.orgId, userId, action: 'auth.logout' }).catch(() => {})
    }

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
    const portalUrl = process.env.GHARA_URL || process.env.PORTAL_URL || 'http://localhost:3005'
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
