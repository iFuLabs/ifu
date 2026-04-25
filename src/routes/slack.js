import crypto from 'crypto'
import { db } from '../db/client.js'
import { slackWorkspaces } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { redis } from '../services/redis.js'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { auditAction } from '../services/audit.js'
import {
  buildInstallUrl,
  exchangeCode,
  saveWorkspace,
  revokeWorkspace,
  listChannels,
  postMessage
} from '../services/slack.js'

const STATE_TTL_SECONDS = 600

export default async function slackRoutes(fastify) {

  // GET /api/v1/slack — installed workspace info
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Slack'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const ws = await db.query.slackWorkspaces.findFirst({
      where: eq(slackWorkspaces.orgId, request.orgId)
    })
    if (!ws) return reply.send({ connected: false })
    return reply.send({
      connected: ws.active,
      workspace: {
        id: ws.id,
        teamId: ws.teamId,
        teamName: ws.teamName,
        channelId: ws.channelId,
        channelName: ws.channelName,
        scope: ws.scope,
        installedAt: ws.createdAt
      }
    })
  })

  // GET /api/v1/slack/install — start OAuth (admin)
  fastify.get('/install', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Slack'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const state = crypto.randomBytes(24).toString('hex')
    await redis.set(
      `slack:oauth:${state}`,
      JSON.stringify({ orgId: request.orgId, userId: request.user.id }),
      'EX',
      STATE_TTL_SECONDS
    )
    const installUrl = buildInstallUrl(state)
    return reply.send({ installUrl })
  })

  // GET /api/v1/slack/callback — OAuth redirect target
  fastify.get('/callback', {
    schema: {
      tags: ['Slack'],
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          error: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { code, state, error } = request.query
    const portalUrl = process.env.PORTAL_URL || process.env.APP_URL || 'http://localhost:3001'

    if (error) {
      return reply.redirect(`${portalUrl}/integrations?slack_error=${encodeURIComponent(error)}`)
    }
    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state' })
    }

    const stateRaw = await redis.get(`slack:oauth:${state}`)
    if (!stateRaw) {
      return reply.status(400).send({ error: 'Invalid or expired state' })
    }
    await redis.del(`slack:oauth:${state}`)
    const { orgId, userId } = JSON.parse(stateRaw)

    let install
    try {
      install = await exchangeCode(code)
    } catch (err) {
      fastify.log.error({ err: err.message }, 'Slack OAuth exchange failed')
      return reply.redirect(`${portalUrl}/integrations?slack_error=${encodeURIComponent(err.message)}`)
    }

    await saveWorkspace({ orgId, userId, install })

    await auditAction({
      orgId,
      userId,
      action: 'slack.installed',
      metadata: { teamId: install.teamId, teamName: install.teamName }
    })

    return reply.redirect(`${portalUrl}/integrations?slack_connected=1`)
  })

  // PATCH /api/v1/slack/channel — choose default notification channel (admin)
  fastify.patch('/channel', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Slack'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['channelId'],
        properties: {
          channelId:   { type: 'string' },
          channelName: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { channelId, channelName } = request.body
    const [updated] = await db.update(slackWorkspaces)
      .set({ channelId, channelName, updatedAt: new Date() })
      .where(eq(slackWorkspaces.orgId, request.orgId))
      .returning()
    if (!updated) return reply.status(404).send({ error: 'Slack not connected' })

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'slack.channel_updated',
      metadata: { channelId, channelName }
    })
    return reply.send({ ok: true, channelId, channelName })
  })

  // GET /api/v1/slack/channels — list channels the bot can post to
  fastify.get('/channels', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Slack'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const channels = await listChannels(request.orgId)
    return reply.send({ channels })
  })

  // POST /api/v1/slack/test — send a test message (admin)
  fastify.post('/test', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Slack'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const result = await postMessage(request.orgId, {
      text: 'Test message from iFu Labs — your Slack integration is working.'
    })
    if (!result.posted) {
      return reply.status(400).send({ error: 'Slack post failed', reason: result.reason })
    }
    return reply.send({ ok: true, ts: result.ts, channel: result.channel })
  })

  // DELETE /api/v1/slack — uninstall (admin)
  fastify.delete('/', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: { tags: ['Slack'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const result = await revokeWorkspace(request.orgId)
    if (!result.revoked) return reply.status(404).send({ error: 'Slack not connected' })

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'slack.uninstalled',
      metadata: {}
    })
    return reply.status(204).send()
  })
}
