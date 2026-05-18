/**
 * Trust Center routes
 *
 * Public endpoints (no auth):
 *   GET  /api/v1/trust-center/:slug          — public page data
 *   POST /api/v1/trust-center/:slug/request  — request access
 *   GET  /api/v1/trust-center/:slug/access   — verify access token
 *
 * Authenticated (org admin):
 *   GET    /api/v1/trust-center              — get own settings
 *   PUT    /api/v1/trust-center              — update settings
 *   POST   /api/v1/trust-center/logo         — get presigned S3 upload URL for logo
 *   GET    /api/v1/trust-center/requests     — list access requests
 *   PATCH  /api/v1/trust-center/requests/:id — approve / deny
 */

import { db } from '../db/client.js'
import { trustCenterSettings, trustCenterAccessRequests, controlResults, controlDefinitions, organizations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { requireTier } from '../middleware/plan.js'
import { auditAction } from '../services/audit.js'
import crypto from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ── Helpers ────────────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Build the public-facing compliance summary for a given org.
 * Only returns aggregate pass/fail counts per published framework — no raw evidence.
 */
async function buildPublicComplianceSummary(orgId, publishedFrameworks) {
  if (!publishedFrameworks?.length) return []

  const results = await db
    .select({
      framework: controlDefinitions.framework,
      status: controlResults.status,
    })
    .from(controlResults)
    .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
    .where(eq(controlResults.orgId, orgId))

  const byFramework = {}
  for (const r of results) {
    if (!publishedFrameworks.includes(r.framework)) continue
    if (!byFramework[r.framework]) byFramework[r.framework] = { pass: 0, fail: 0, review: 0, total: 0 }
    byFramework[r.framework][r.status] = (byFramework[r.framework][r.status] || 0) + 1
    byFramework[r.framework].total++
  }

  return publishedFrameworks.map(fw => {
    const counts = byFramework[fw] || { pass: 0, fail: 0, review: 0, total: 0 }
    const score = counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : null
    return { framework: fw, score, ...counts }
  })
}

// ── Route plugin ───────────────────────────────────────────────────────────

export default async function trustCenterRoutes(fastify) {

  // ── Public: get trust center page ────────────────────────────────────────
  fastify.get('/:slug', {
    schema: { tags: ['Trust Center'] }
  }, async (request, reply) => {
    const { slug } = request.params
    const { token } = request.query

    const settings = await db.query.trustCenterSettings.findFirst({
      where: eq(trustCenterSettings.slug, slug)
    })

    if (!settings || !settings.enabled) {
      return reply.status(404).send({ error: 'Trust Center not found or not enabled' })
    }

    // NDA gate: if required, check for a valid access token
    let accessGranted = !settings.ndaRequired
    if (settings.ndaRequired && token) {
      const accessReq = await db.query.trustCenterAccessRequests.findFirst({
        where: and(
          eq(trustCenterAccessRequests.orgId, settings.orgId),
          eq(trustCenterAccessRequests.token, token),
          eq(trustCenterAccessRequests.status, 'approved')
        )
      })
      if (accessReq && (!accessReq.tokenExpiresAt || new Date(accessReq.tokenExpiresAt) > new Date())) {
        accessGranted = true
      }
    }

    // Fetch org name
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, settings.orgId),
      columns: { name: true }
    })

    const publicData = {
      slug: settings.slug,
      orgName: org?.name,
      headline: settings.headline,
      description: settings.description,
      logoUrl: settings.logoUrl,
      ndaRequired: settings.ndaRequired,
      accessGranted,
    }

    if (accessGranted) {
      const complianceSummary = await buildPublicComplianceSummary(settings.orgId, settings.publishedFrameworks)
      publicData.publishedFrameworks = settings.publishedFrameworks
      publicData.complianceSummary = complianceSummary
      publicData.publishedArtifacts = settings.publishedArtifacts
    }

    return reply.send(publicData)
  })

  // ── Public: request access ────────────────────────────────────────────────
  fastify.post('/:slug/request', {
    schema: {
      tags: ['Trust Center'],
      body: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name:    { type: 'string', minLength: 1 },
          email:   { type: 'string', format: 'email' },
          company: { type: 'string' },
          message: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params
    const { name, email, company, message } = request.body

    const settings = await db.query.trustCenterSettings.findFirst({
      where: eq(trustCenterSettings.slug, slug)
    })

    if (!settings || !settings.enabled) {
      return reply.status(404).send({ error: 'Trust Center not found' })
    }

    // Upsert — if they already requested, update their info
    const existing = await db.query.trustCenterAccessRequests.findFirst({
      where: and(
        eq(trustCenterAccessRequests.orgId, settings.orgId),
        eq(trustCenterAccessRequests.email, email)
      )
    })

    if (existing) {
      if (existing.status === 'approved') {
        return reply.send({ status: 'already_approved', message: 'Your access request has already been approved.' })
      }
      return reply.send({ status: 'pending', message: 'Your access request is already pending review.' })
    }

    await db.insert(trustCenterAccessRequests).values({
      orgId: settings.orgId,
      name,
      email,
      company: company || null,
      message: message || null,
      token: generateToken(),
      tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    })

    return reply.status(201).send({ status: 'pending', message: 'Access request submitted. You will be notified by email when approved.' })
  })

  // ── Public: verify access token ───────────────────────────────────────────
  fastify.get('/:slug/access', {
    schema: {
      tags: ['Trust Center'],
      querystring: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const { slug } = request.params
    const { token } = request.query

    const settings = await db.query.trustCenterSettings.findFirst({
      where: eq(trustCenterSettings.slug, slug)
    })
    if (!settings) return reply.status(404).send({ error: 'Not found' })

    const accessReq = await db.query.trustCenterAccessRequests.findFirst({
      where: and(
        eq(trustCenterAccessRequests.orgId, settings.orgId),
        eq(trustCenterAccessRequests.token, token),
        eq(trustCenterAccessRequests.status, 'approved')
      )
    })

    const valid = !!accessReq && (!accessReq.tokenExpiresAt || new Date(accessReq.tokenExpiresAt) > new Date())
    return reply.send({ valid, name: accessReq?.name || null })
  })

  // ── Authenticated: logo upload — get presigned S3 URL ───────────────────
  fastify.post('/logo', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Trust Center'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['contentType'],
        properties: {
          contentType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] }
        }
      }
    }
  }, async (request, reply) => {
    const BUCKET = process.env.TRUST_CENTER_ASSETS_BUCKET || process.env.S3_BUCKET
    const REGION = process.env.AWS_REGION || 'us-east-1'

    if (!BUCKET) {
      return reply.status(501).send({
        error: 'Not configured',
        message: 'Logo upload requires S3_BUCKET or TRUST_CENTER_ASSETS_BUCKET env var to be set.'
      })
    }

    const { contentType } = request.body
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }[contentType] || 'png'
    const key = `trust-center-logos/${request.orgId}/${crypto.randomBytes(8).toString('hex')}.${ext}`

    const s3 = new S3Client({ region: REGION })
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5 min
    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

    return reply.send({ uploadUrl, publicUrl, key })
  })

  // ── Authenticated: get own settings ──────────────────────────────────────
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Trust Center'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const settings = await db.query.trustCenterSettings.findFirst({
      where: eq(trustCenterSettings.orgId, request.orgId)
    })
    return reply.send(settings || null)
  })

  // ── Authenticated: create / update settings ───────────────────────────────
  fastify.put('/', {
    preHandler: [verifyToken, requireUser, requireTier('growth')],
    schema: {
      tags: ['Trust Center'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          enabled:             { type: 'boolean' },
          slug:                { type: 'string', minLength: 2, maxLength: 50, pattern: '^[a-z0-9-]+$' },
          headline:            { type: 'string', maxLength: 120 },
          description:         { type: 'string', maxLength: 1000 },
          logoUrl:             { type: 'string' },
          ndaRequired:         { type: 'boolean' },
          ndaDocumentUrl:      { type: 'string' },
          publishedFrameworks: { type: 'array', items: { type: 'string' } },
          publishedArtifacts:  { type: 'array', items: { type: 'object' } }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body
    const existing = await db.query.trustCenterSettings.findFirst({
      where: eq(trustCenterSettings.orgId, request.orgId)
    })

    // Slug uniqueness check (excluding own row)
    if (body.slug) {
      const slugConflict = await db.query.trustCenterSettings.findFirst({
        where: eq(trustCenterSettings.slug, body.slug)
      })
      if (slugConflict && slugConflict.orgId !== request.orgId) {
        return reply.status(409).send({ error: 'Conflict', message: 'This slug is already taken. Choose a different one.' })
      }
    }

    let result
    if (existing) {
      ;[result] = await db.update(trustCenterSettings)
        .set({
          enabled:             body.enabled !== undefined ? body.enabled : existing.enabled,
          slug:                body.slug ?? existing.slug,
          headline:            body.headline ?? existing.headline,
          description:         body.description ?? existing.description,
          logoUrl:             body.logoUrl ?? existing.logoUrl,
          ndaRequired:         body.ndaRequired !== undefined ? body.ndaRequired : existing.ndaRequired,
          ndaDocumentUrl:      body.ndaDocumentUrl ?? existing.ndaDocumentUrl,
          publishedFrameworks: body.publishedFrameworks ?? existing.publishedFrameworks,
          publishedArtifacts:  body.publishedArtifacts ?? existing.publishedArtifacts,
          updatedAt:           new Date()
        })
        .where(eq(trustCenterSettings.orgId, request.orgId))
        .returning()
    } else {
      if (!body.slug) {
        // Auto-generate slug from org name
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, request.orgId),
          columns: { slug: true }
        })
        body.slug = org?.slug || request.orgId.slice(0, 8)
      }
      ;[result] = await db.insert(trustCenterSettings)
        .values({
          orgId:               request.orgId,
          enabled:             body.enabled ?? false,
          slug:                body.slug,
          headline:            body.headline ?? null,
          description:         body.description ?? null,
          logoUrl:             body.logoUrl ?? null,
          ndaRequired:         body.ndaRequired ?? false,
          ndaDocumentUrl:      body.ndaDocumentUrl ?? null,
          publishedFrameworks: body.publishedFrameworks ?? [],
          publishedArtifacts:  body.publishedArtifacts ?? [],
        })
        .returning()
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'trust_center.updated',
      metadata: { enabled: body.enabled, slug: body.slug }
    })

    return reply.send(result)
  })

  // ── Authenticated: list access requests ──────────────────────────────────
  fastify.get('/requests', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Trust Center'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['pending', 'approved', 'denied', 'all'] } }
      }
    }
  }, async (request, reply) => {
    const { status = 'all' } = request.query

    const where = status === 'all'
      ? eq(trustCenterAccessRequests.orgId, request.orgId)
      : and(
          eq(trustCenterAccessRequests.orgId, request.orgId),
          eq(trustCenterAccessRequests.status, status)
        )

    const requests = await db.query.trustCenterAccessRequests.findMany({
      where,
      columns: { token: false }, // never return raw tokens to the admin UI
      orderBy: (t, { desc }) => [desc(t.createdAt)]
    })

    return reply.send({ requests, total: requests.length })
  })

  // ── Authenticated: approve / deny access request ──────────────────────────
  fastify.patch('/requests/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Trust Center'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'denied'] }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { status } = request.body

    const accessReq = await db.query.trustCenterAccessRequests.findFirst({
      where: and(
        eq(trustCenterAccessRequests.id, id),
        eq(trustCenterAccessRequests.orgId, request.orgId)
      )
    })

    if (!accessReq) {
      return reply.status(404).send({ error: 'Access request not found' })
    }

    const updates = {
      status,
      updatedAt: new Date(),
      ...(status === 'approved' ? {
        approvedBy: request.user.id,
        approvedAt: new Date(),
        tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      } : {})
    }

    const [updated] = await db.update(trustCenterAccessRequests)
      .set(updates)
      .where(eq(trustCenterAccessRequests.id, id))
      .returning({ id: trustCenterAccessRequests.id, status: trustCenterAccessRequests.status, email: trustCenterAccessRequests.email, token: trustCenterAccessRequests.token })

    // Send approval email with access link
    if (status === 'approved') {
      const settings = await db.query.trustCenterSettings.findFirst({
        where: eq(trustCenterSettings.orgId, request.orgId)
      })
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, request.orgId),
        columns: { name: true }
      })
      const PORTAL_URL = process.env.GHARA_URL || process.env.PORTAL_URL || 'https://app.ghara.ifulabs.com'
      const accessUrl = `${PORTAL_URL}/trust/${settings?.slug}?token=${updated.token}`

      const { emailWrap, emailHeader, emailFooter } = await import('../services/email.js')
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'

      await resend.emails.send({
        from: `Ghara <product@${DOMAIN}>`,
        to: updated.email,
        replyTo: process.env.REPLY_TO_EMAIL || 'info@ifulabs.com',
        subject: `Your access to ${org?.name || 'our'} Trust Center has been approved`,
        html: emailWrap(
          emailHeader('Trust Center Access Approved'),
          `
          <p>Hi ${accessReq.name},</p>
          <p>Your request to access <strong>${org?.name || 'our'}</strong> Trust Center has been approved.</p>
          <p>Click the button below to view our compliance posture, certifications, and security documentation.</p>
          <a href="${accessUrl}" class="button">View Trust Center →</a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">This link is personal to you and expires in 90 days.</p>
          <p>Regards,<br>The Ghara Team</p>
          `,
          emailFooter(updated.email)
        )
      }).catch(() => null) // Don't fail the request if email fails
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: `trust_center.request.${status}`,
      metadata: { requestId: id, email: accessReq.email }
    })

    return reply.send({ id: updated.id, status: updated.status })
  })
}
