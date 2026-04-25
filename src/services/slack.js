import { db } from '../db/client.js'
import { slackWorkspaces } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt } from './encryption.js'
import { logger } from './logger.js'

const SLACK_OAUTH_URL = 'https://slack.com/api/oauth.v2.access'
const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage'
const SLACK_REVOKE_URL = 'https://slack.com/api/auth.revoke'

const REQUIRED_SCOPES = ['chat:write', 'chat:write.public', 'channels:read', 'groups:read']

export function buildInstallUrl(state) {
  const clientId = process.env.SLACK_CLIENT_ID
  const redirectUri = process.env.SLACK_REDIRECT_URI
  if (!clientId || !redirectUri) {
    throw new Error('SLACK_CLIENT_ID or SLACK_REDIRECT_URI not configured')
  }
  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', REQUIRED_SCOPES.join(','))
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeCode(code) {
  const res = await fetch(SLACK_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI
    })
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack OAuth failed: ${data.error}`)
  return {
    teamId: data.team?.id,
    teamName: data.team?.name,
    accessToken: data.access_token,
    botUserId: data.bot_user_id,
    scope: data.scope
  }
}

export async function saveWorkspace({ orgId, userId, install, channelId, channelName }) {
  const encrypted = JSON.stringify(encrypt(install.accessToken))
  const existing = await db.query.slackWorkspaces.findFirst({
    where: and(eq(slackWorkspaces.orgId, orgId), eq(slackWorkspaces.teamId, install.teamId))
  })
  if (existing) {
    const [updated] = await db.update(slackWorkspaces)
      .set({
        accessToken: encrypted,
        teamName: install.teamName,
        botUserId: install.botUserId,
        scope: install.scope,
        channelId: channelId ?? existing.channelId,
        channelName: channelName ?? existing.channelName,
        active: true,
        updatedAt: new Date()
      })
      .where(eq(slackWorkspaces.id, existing.id))
      .returning()
    return updated
  }
  const [created] = await db.insert(slackWorkspaces).values({
    orgId,
    teamId: install.teamId,
    teamName: install.teamName,
    accessToken: encrypted,
    botUserId: install.botUserId,
    scope: install.scope,
    channelId,
    channelName,
    installedBy: userId,
    active: true
  }).returning()
  return created
}

async function getActiveWorkspace(orgId) {
  return db.query.slackWorkspaces.findFirst({
    where: and(eq(slackWorkspaces.orgId, orgId), eq(slackWorkspaces.active, true))
  })
}

function decryptToken(stored) {
  return decrypt(JSON.parse(stored))
}

export async function postMessage(orgId, { text, blocks, channel }) {
  const ws = await getActiveWorkspace(orgId)
  if (!ws) return { posted: false, reason: 'no_workspace' }
  const targetChannel = channel || ws.channelId
  if (!targetChannel) return { posted: false, reason: 'no_channel' }

  const token = decryptToken(ws.accessToken)
  const res = await fetch(SLACK_POST_MESSAGE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ channel: targetChannel, text, blocks })
  })
  const data = await res.json()
  if (!data.ok) {
    logger.warn({ orgId, error: data.error }, 'Slack postMessage failed')
    if (data.error === 'token_revoked' || data.error === 'invalid_auth' || data.error === 'account_inactive') {
      await db.update(slackWorkspaces)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(slackWorkspaces.id, ws.id))
    }
    return { posted: false, reason: data.error }
  }
  return { posted: true, ts: data.ts, channel: data.channel }
}

export async function revokeWorkspace(orgId) {
  const ws = await getActiveWorkspace(orgId)
  if (!ws) return { revoked: false, reason: 'no_workspace' }
  const token = decryptToken(ws.accessToken)
  try {
    await fetch(SLACK_REVOKE_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
  } catch (err) {
    logger.warn({ orgId, err: err.message }, 'Slack revoke API call failed')
  }
  await db.update(slackWorkspaces)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(slackWorkspaces.id, ws.id))
  return { revoked: true }
}

export async function listChannels(orgId) {
  const ws = await getActiveWorkspace(orgId)
  if (!ws) return []
  const token = decryptToken(ws.accessToken)
  const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  if (!data.ok) {
    logger.warn({ orgId, error: data.error }, 'Slack conversations.list failed')
    return []
  }
  return (data.channels || []).map(c => ({ id: c.id, name: c.name, isPrivate: c.is_private }))
}

export function buildDriftBlocks({ orgName, drifted, scanId }) {
  const lines = drifted.slice(0, 10).map(c => `• *${c.controlId}* — ${c.title} _(${c.framework})_`)
  const more = drifted.length > 10 ? `\n_+${drifted.length - 10} more_` : ''
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Control drift detected — ${orgName}`, emoji: false }
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `${drifted.length} control(s) flipped from *pass* to *fail* in scan \`${scanId}\`.\n\n${lines.join('\n')}${more}` }
    }
  ]
}

export function buildScanCompleteBlocks({ orgName, scan }) {
  const summary = `Pass: *${scan.passCount}* · Fail: *${scan.failCount}* · Review: *${scan.reviewCount}* · Total: *${scan.totalControls}*`
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `Compliance scan complete for *${orgName}* (${scan.integrationType})\n${summary}` }
    }
  ]
}
