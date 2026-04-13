import { z } from 'zod'
import crypto from 'crypto'
import { db } from '../db/client.js'
import { users, invitations, organizations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member'])
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

    // TODO: Send invitation email
    // For now, just return the invitation with the token
    const inviteUrl = `${process.env.PORTAL_URL || 'http://localhost:3003'}/invite/${token}`

    return reply.status(201).send({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      inviteUrl,
      expiresAt: invitation.expiresAt
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

    await db.delete(users).where(eq(users.id, id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'team.removed',
      metadata: { removedUserId: id, email: member.email }
    })

    return reply.status(204).send()
  })
}
