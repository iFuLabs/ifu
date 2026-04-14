import { z } from 'zod'
import crypto from 'crypto'
import { db } from '../db/client.js'
import { users, invitations, organizations } from '../db/schema.js'
import { eq, and, count } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import { sendTeamInvitationEmail } from '../services/email.js'
import { getMaxTeamMembers } from '../middleware/plan.js'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
  product: z.enum(['comply', 'finops']).optional().default('comply')
})

export default async function teamRoutes(fastify) {

  // GET /api/v1/team/members
  // List all team members in the organization
  fastify.get('/members', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Team'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const members = await db.query.users.findMany({
      where: eq(users.orgId, request.orgId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true
      }
    })
    return reply.send(members)
  })

  // GET /api/v1/team/invitations
  // List pending invitations
  fastify.get('/invitations', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Team'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const invites = await db.query.invitations.findMany({
      where: and(
        eq(invitations.orgId, request.orgId),
        eq(invitations.status, 'pending')
      ),
      with: {
        inviter: {
          columns: { email: true, name: true }
        }
      }
    })
    return reply.send(invites)
  })

  // POST /api/v1/team/invite
  // Invite a new team member
  fastify.post('/invite', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Team'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'member'] }
        }
      }
    }
  }, async (request, reply) => {
    const body = inviteSchema.parse(request.body)

    // Check team member limit based on plan
    const plan = request.user.org?.plan || 'starter'
    const maxMembers = getMaxTeamMembers(plan)
    
    if (maxMembers !== null) {
      // Count current members
      const [{ value: currentCount }] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.orgId, request.orgId))
      
      if (currentCount >= maxMembers) {
        return reply.status(403).send({
          error: 'Upgrade Required',
          message: `Your ${plan} plan is limited to ${maxMembers} team members. Upgrade to Growth for unlimited members.`,
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'growth',
          currentPlan: plan,
          currentMembers: currentCount,
          maxMembers
        })
      }
    }

    // Check if user already exists in this org
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.email, body.email),
        eq(users.orgId, request.orgId)
      )
    })

    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User is already a member of this organization'
      })
    }

    // Check if there's already a pending invitation
    const existingInvite = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, body.email),
        eq(invitations.orgId, request.orgId),
        eq(invitations.status, 'pending')
      )
    })

    if (existingInvite) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'An invitation has already been sent to this email'
      })
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    const [invitation] = await db.insert(invitations).values({
      orgId: request.orgId,
      email: body.email,
      role: body.role,
      product: body.product || 'comply',
      invitedBy: request.user.id,
      token,
      expiresAt
    }).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'team.invited',
      metadata: { email: body.email, role: body.role }
    })

    // Send invitation email
    const inviteUrl = `${process.env.PORTAL_URL || 'http://localhost:3003'}/invite/${token}`
    
    const emailResult = await sendTeamInvitationEmail({
      to: body.email,
      inviterName: request.user.name || request.user.email,
      orgName: (await db.query.organizations.findFirst({ 
        where: eq(organizations.id, request.orgId) 
      })).name,
      role: body.role,
      inviteUrl,
      expiresAt: invitation.expiresAt
    })

    if (!emailResult.success) {
      fastify.log.warn({ error: emailResult.error }, 'Failed to send invitation email')
      // Don't fail the request if email fails - invitation is still created
    }

    return reply.status(201).send({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      inviteUrl,
      expiresAt: invitation.expiresAt,
      emailSent: emailResult.success
    })
  })

  // DELETE /api/v1/team/invitations/:id
  // Cancel a pending invitation
  fastify.delete('/invitations/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Team'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params

    await db.delete(invitations)
      .where(and(
        eq(invitations.id, id),
        eq(invitations.orgId, request.orgId)
      ))

    return reply.status(204).send()
  })

  // DELETE /api/v1/team/members/:id
  // Remove a team member
  fastify.delete('/members/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Team'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const { id } = request.params

    // Can't remove yourself
    if (id === request.user.id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'You cannot remove yourself from the team'
      })
    }

    // Can't remove the owner
    const member = await db.query.users.findFirst({
      where: eq(users.id, id)
    })

    if (!member || member.orgId !== request.orgId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Member not found' })
    }

    if (member.role === 'owner') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Cannot remove the organization owner'
      })
    }

    // Only owners can remove admins
    if (member.role === 'admin' && request.user.role !== 'owner') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only the organization owner can remove admins'
      })
    }

    await db.delete(users).where(eq(users.id, id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'team.removed',
      metadata: { removedUserId: id, email: member.email }
    })

    return reply.status(204).send()
  })

  // GET /api/v1/team/invitation/:token
  // Get invitation details by token (public endpoint)
  fastify.get('/invitation/:token', {
    schema: {
      tags: ['Team'],
      params: { type: 'object', properties: { token: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const { token } = request.params

    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        eq(invitations.status, 'pending')
      ),
      with: {
        org: {
          columns: { id: true, name: true, slug: true }
        },
        inviter: {
          columns: { name: true, email: true }
        }
      }
    })

    if (!invitation) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found or already used'
      })
    }

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return reply.status(410).send({
        error: 'Expired',
        message: 'This invitation has expired'
      })
    }

    return reply.send({
      email: invitation.email,
      role: invitation.role,
      product: invitation.product || 'comply',
      organization: invitation.org,
      invitedBy: invitation.inviter,
      expiresAt: invitation.expiresAt
    })
  })

  // POST /api/v1/team/accept-invitation
  // Accept invitation and create/link user account
  fastify.post('/accept-invitation', {
    schema: {
      tags: ['Team'],
      body: {
        type: 'object',
        required: ['token', 'name', 'password'],
        properties: {
          token: { type: 'string' },
          name: { type: 'string' },
          password: { type: 'string', minLength: 8 }
        }
      }
    }
  }, async (request, reply) => {
    const { token, name, password } = request.body

    // Find invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        eq(invitations.status, 'pending')
      )
    })

    if (!invitation) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found or already used'
      })
    }

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return reply.status(410).send({
        error: 'Expired',
        message: 'This invitation has expired'
      })
    }

    // Check if user already exists with this email
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, invitation.email)
    })

    if (existingUser) {
      // User exists - check if they're already in this org
      if (existingUser.orgId === invitation.orgId) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'You are already a member of this organization'
        })
      }

      // User exists in different org - they can't join multiple orgs yet
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'This email is already associated with another organization. Please use a different email or contact support.'
      })
    }

    // Create new user
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 10)

    const [newUser] = await db.insert(users).values({
      email: invitation.email,
      name,
      passwordHash,
      orgId: invitation.orgId,
      role: invitation.role,
      auth0Id: null
    }).returning()

    // Mark invitation as accepted
    await db.update(invitations)
      .set({ 
        status: 'accepted',
        acceptedAt: new Date()
      })
      .where(eq(invitations.id, invitation.id))

    await auditAction({
      orgId: invitation.orgId,
      userId: newUser.id,
      action: 'team.invitation_accepted',
      metadata: { email: invitation.email, role: invitation.role }
    })

    // Generate JWT token
    const jwt = await import('jsonwebtoken')
    const { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_OPTIONS } = await import('../services/config.js')
    
    const jwtToken = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        orgId: newUser.orgId,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    reply.setCookie('auth_token', jwtToken, COOKIE_OPTIONS)

    return reply.status(201).send({
      token: jwtToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      product: invitation.product || 'comply',
      message: 'Invitation accepted successfully'
    })
  })
}
