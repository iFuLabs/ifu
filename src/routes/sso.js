/**
 * SSO Routes — SAML configuration and authentication endpoints.
 *
 * Admin routes (Scale tier only):
 *   GET  /api/v1/sso              — Get current SSO connection
 *   POST /api/v1/sso              — Create/update SSO connection
 *   DELETE /api/v1/sso            — Remove SSO connection
 *   GET  /api/v1/sso/metadata     — Download SP metadata XML
 *   POST /api/v1/sso/verify-domain — Verify domain ownership via DNS
 *   PATCH /api/v1/sso/settings    — Update enforce/JIT settings
 *
 * Auth routes (public):
 *   POST /api/v1/auth/sso/init       — Start SSO login (by email domain)
 *   POST /api/v1/auth/sso/callback   — SAML ACS endpoint (receives IdP response)
 */
import { db } from '../db/client.js'
import { ssoConnections } from '../db/schema.js'
import { users, organizations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { requireTier } from '../middleware/plan.js'
import { auditAction } from '../services/audit.js'
import {
  buildSpConfig,
  generateVerificationToken,
  generateSpMetadata,
  validateSamlResponse,
  getLoginUrl,
} from '../services/saml.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_OPTIONS } from '../services/config.js'
import dns from 'dns/promises'

export default async function ssoRoutes(fastify) {

  // ─── Admin Routes (Scale tier) ─────────────────────────────────────────────

  // GET /api/v1/sso — Get current SSO connection for the org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('scale')],
    schema: { tags: ['SSO'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const connection = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    if (!connection) {
      const spConfig = buildSpConfig(request.orgId)
      return reply.send({
        configured: false,
        sp: spConfig,
        instructions: {
          step1: 'Create a SAML application in your Identity Provider (Okta, Azure AD, Google Workspace, etc.)',
          step2: `Set the SP Entity ID (Audience URI) to: ${spConfig.spEntityId}`,
          step3: `Set the ACS URL (Reply URL) to: ${spConfig.spAcsUrl}`,
          step4: 'Copy the IdP SSO URL, Entity ID, and X.509 certificate from your IdP',
          step5: 'POST them to this endpoint to complete setup',
        }
      })
    }

    return reply.send({
      configured: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        displayName: connection.displayName,
        domain: connection.domain,
        idpEntityId: connection.idpEntityId,
        idpSsoUrl: connection.idpSsoUrl,
        idpMetadataUrl: connection.idpMetadataUrl,
        spEntityId: connection.spEntityId,
        spAcsUrl: connection.spAcsUrl,
        status: connection.status,
        domainVerified: connection.domainVerified,
        domainVerificationToken: connection.domainVerificationToken,
        enforceSso: connection.enforceSso,
        jitProvisioning: connection.jitProvisioning,
        defaultRole: connection.defaultRole,
        lastUsedAt: connection.lastUsedAt,
        createdAt: connection.createdAt,
      }
    })
  })

  // POST /api/v1/sso — Create or update SSO connection
  fastify.post('/', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('scale')],
    schema: {
      tags: ['SSO'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['domain', 'idpSsoUrl', 'idpCertificate'],
        properties: {
          displayName: { type: 'string', minLength: 1, description: 'e.g. "Okta", "Azure AD"' },
          domain: { type: 'string', minLength: 3, description: 'Email domain for SSO (e.g. "acme.com")' },
          idpEntityId: { type: 'string', description: 'IdP Entity ID / Issuer URL' },
          idpSsoUrl: { type: 'string', format: 'uri', description: 'IdP Single Sign-On URL' },
          idpCertificate: { type: 'string', minLength: 50, description: 'IdP X.509 certificate (PEM format)' },
          idpMetadataUrl: { type: 'string', description: 'Optional IdP metadata URL' },
        }
      }
    }
  }, async (request, reply) => {
    const { displayName, domain, idpEntityId, idpSsoUrl, idpCertificate, idpMetadataUrl } = request.body

    const cleanDomain = domain.toLowerCase().trim().replace(/^@/, '')
    const spConfig = buildSpConfig(request.orgId)
    const verificationToken = generateVerificationToken()

    // Check if another org already has this domain
    const existingDomain = await db.query.ssoConnections.findFirst({
      where: and(
        eq(ssoConnections.domain, cleanDomain),
        eq(ssoConnections.status, 'active')
      )
    })
    if (existingDomain && existingDomain.orgId !== request.orgId) {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Domain "${cleanDomain}" is already configured for another organization`
      })
    }

    // Check for existing connection for this org
    const existing = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    let connection
    if (existing) {
      ;[connection] = await db.update(ssoConnections).set({
        displayName: displayName || existing.displayName,
        domain: cleanDomain,
        idpEntityId: idpEntityId || null,
        idpSsoUrl,
        idpCertificate,
        idpMetadataUrl: idpMetadataUrl || null,
        spEntityId: spConfig.spEntityId,
        spAcsUrl: spConfig.spAcsUrl,
        status: 'pending', // Reset to pending until domain is verified
        domainVerified: false,
        domainVerificationToken: verificationToken,
        updatedAt: new Date(),
      }).where(eq(ssoConnections.id, existing.id)).returning()
    } else {
      ;[connection] = await db.insert(ssoConnections).values({
        orgId: request.orgId,
        provider: 'saml',
        displayName: displayName || 'SAML SSO',
        domain: cleanDomain,
        idpEntityId: idpEntityId || null,
        idpSsoUrl,
        idpCertificate,
        idpMetadataUrl: idpMetadataUrl || null,
        spEntityId: spConfig.spEntityId,
        spAcsUrl: spConfig.spAcsUrl,
        status: 'pending',
        domainVerified: false,
        domainVerificationToken: verificationToken,
      }).returning()
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'sso.configured',
      resource: 'sso_connection',
      resourceId: connection.id,
      metadata: { domain: cleanDomain, provider: 'saml' }
    })

    return reply.status(201).send({
      connection: {
        id: connection.id,
        domain: connection.domain,
        status: connection.status,
        spEntityId: connection.spEntityId,
        spAcsUrl: connection.spAcsUrl,
        domainVerified: connection.domainVerified,
      },
      domainVerification: {
        token: verificationToken,
        dnsRecord: `_ghara-verification.${cleanDomain}`,
        type: 'TXT',
        value: verificationToken,
        instructions: `Add a DNS TXT record: _ghara-verification.${cleanDomain} → ${verificationToken}`,
      },
      spMetadataUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/v1/sso/metadata`,
    })
  })

  // POST /api/v1/sso/verify-domain — Verify domain ownership via DNS TXT record
  fastify.post('/verify-domain', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('scale')],
    schema: { tags: ['SSO'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const connection = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    if (!connection) {
      return reply.status(404).send({ error: 'No SSO connection configured' })
    }

    if (connection.domainVerified) {
      return reply.send({ verified: true, message: 'Domain already verified' })
    }

    // Look up DNS TXT record
    const dnsName = `_ghara-verification.${connection.domain}`
    let records = []
    try {
      records = await dns.resolveTxt(dnsName)
    } catch (err) {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
        return reply.status(400).send({
          error: 'Verification Failed',
          message: `DNS TXT record not found at ${dnsName}. Please add: ${connection.domainVerificationToken}`,
          hint: 'DNS changes can take up to 48 hours to propagate. Try again later.'
        })
      }
      throw err
    }

    // Check if any TXT record matches our token
    const flatRecords = records.map(r => r.join('')).map(r => r.trim())
    const verified = flatRecords.includes(connection.domainVerificationToken)

    if (!verified) {
      return reply.status(400).send({
        error: 'Verification Failed',
        message: `TXT record found but value doesn't match. Expected: ${connection.domainVerificationToken}`,
        found: flatRecords,
      })
    }

    // Mark as verified and activate
    await db.update(ssoConnections).set({
      domainVerified: true,
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(ssoConnections.id, connection.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'sso.domain_verified',
      resource: 'sso_connection',
      resourceId: connection.id,
      metadata: { domain: connection.domain }
    })

    return reply.send({
      verified: true,
      status: 'active',
      message: `Domain ${connection.domain} verified. SSO is now active.`
    })
  })

  // GET /api/v1/sso/metadata — Download SP metadata XML
  fastify.get('/metadata', {
    preHandler: [verifyToken, requireUser, requireTier('scale')],
    schema: { tags: ['SSO'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const connection = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    if (!connection) {
      const spConfig = buildSpConfig(request.orgId)
      // Return metadata even without a full connection (for initial setup)
      const metadata = generateSpMetadata(spConfig)
      reply.header('Content-Type', 'application/xml')
      return reply.send(metadata)
    }

    const metadata = generateSpMetadata(connection)
    reply.header('Content-Type', 'application/xml')
    return reply.send(metadata)
  })

  // PATCH /api/v1/sso/settings — Update SSO enforcement and JIT settings
  fastify.patch('/settings', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('scale')],
    schema: {
      tags: ['SSO'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          enforceSso: { type: 'boolean', description: 'If true, password login is disabled for users with this domain' },
          jitProvisioning: { type: 'boolean', description: 'Auto-create users on first SSO login' },
          defaultRole: { type: 'string', enum: ['member', 'auditor'], description: 'Role for JIT-provisioned users' },
        }
      }
    }
  }, async (request, reply) => {
    const connection = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    if (!connection) {
      return reply.status(404).send({ error: 'No SSO connection configured' })
    }

    if (connection.status !== 'active') {
      return reply.status(400).send({
        error: 'SSO not active',
        message: 'Complete domain verification before changing SSO settings'
      })
    }

    const updates = { updatedAt: new Date() }
    if (request.body.enforceSso !== undefined) updates.enforceSso = request.body.enforceSso
    if (request.body.jitProvisioning !== undefined) updates.jitProvisioning = request.body.jitProvisioning
    if (request.body.defaultRole !== undefined) updates.defaultRole = request.body.defaultRole

    const [updated] = await db.update(ssoConnections).set(updates)
      .where(eq(ssoConnections.id, connection.id)).returning()

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'sso.settings_updated',
      resource: 'sso_connection',
      resourceId: connection.id,
      metadata: { changes: Object.keys(updates).filter(k => k !== 'updatedAt') }
    })

    return reply.send({
      enforceSso: updated.enforceSso,
      jitProvisioning: updated.jitProvisioning,
      defaultRole: updated.defaultRole,
    })
  })

  // DELETE /api/v1/sso — Remove SSO connection
  fastify.delete('/', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('scale')],
    schema: { tags: ['SSO'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const connection = await db.query.ssoConnections.findFirst({
      where: eq(ssoConnections.orgId, request.orgId)
    })

    if (!connection) {
      return reply.status(404).send({ error: 'No SSO connection to remove' })
    }

    await db.delete(ssoConnections).where(eq(ssoConnections.id, connection.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'sso.removed',
      resource: 'sso_connection',
      resourceId: connection.id,
      metadata: { domain: connection.domain }
    })

    return reply.status(204).send()
  })
}

/**
 * SSO Auth Routes — public endpoints for the SSO login flow.
 * Registered separately at /api/v1/auth/sso
 */
export async function ssoAuthRoutes(fastify) {

  // POST /api/v1/auth/sso/init — Start SSO login
  // Client sends email, we look up the domain and redirect to IdP
  fastify.post('/init', {
    schema: {
      tags: ['SSO'],
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
    const domain = email.split('@')[1]?.toLowerCase()

    if (!domain) {
      return reply.status(400).send({ error: 'Invalid email address' })
    }

    // Look up active SSO connection for this domain
    const connection = await db.query.ssoConnections.findFirst({
      where: and(
        eq(ssoConnections.domain, domain),
        eq(ssoConnections.status, 'active')
      )
    })

    if (!connection) {
      return reply.send({
        ssoEnabled: false,
        message: 'No SSO configured for this domain. Use email/password login.'
      })
    }

    // Generate SAML AuthnRequest and return redirect URL
    const loginUrl = await getLoginUrl(connection, email)

    return reply.send({
      ssoEnabled: true,
      redirectUrl: loginUrl,
      provider: connection.displayName,
    })
  })

  // POST /api/v1/auth/sso/callback — SAML Assertion Consumer Service
  // IdP posts the SAML response here after user authenticates
  fastify.post('/callback', {
    schema: { tags: ['SSO'] }
  }, async (request, reply) => {
    const { SAMLResponse, RelayState } = request.body || {}

    if (!SAMLResponse) {
      return reply.status(400).send({ error: 'Missing SAMLResponse' })
    }

    // We need to figure out which connection this response belongs to.
    // Strategy: decode the response to get the Issuer, then look up by idpEntityId.
    // Alternatively, use RelayState (which we set to the user's email).
    let connection

    if (RelayState && RelayState.includes('@')) {
      const domain = RelayState.split('@')[1]?.toLowerCase()
      connection = await db.query.ssoConnections.findFirst({
        where: and(
          eq(ssoConnections.domain, domain),
          eq(ssoConnections.status, 'active')
        )
      })
    }

    if (!connection) {
      // Try all active connections (fallback for IdP-initiated flows)
      const allActive = await db.query.ssoConnections.findMany({
        where: eq(ssoConnections.status, 'active')
      })

      // Try each connection until one validates
      for (const conn of allActive) {
        try {
          const profile = await validateSamlResponse(conn, SAMLResponse)
          if (profile.email) {
            const emailDomain = profile.email.split('@')[1]
            if (emailDomain === conn.domain) {
              connection = conn
              break
            }
          }
        } catch {
          // This connection didn't match, try next
        }
      }
    }

    if (!connection) {
      return reply.status(400).send({
        error: 'SSO Error',
        message: 'Could not identify the SSO connection for this response. Ensure your IdP is configured correctly.'
      })
    }

    // Validate the SAML response
    let profile
    try {
      profile = await validateSamlResponse(connection, SAMLResponse)
    } catch (err) {
      fastify.log.warn({ err: err.message, connectionId: connection.id }, 'SAML validation failed')
      return reply.status(401).send({
        error: 'SSO Authentication Failed',
        message: 'SAML response validation failed. Please try again or contact your IT administrator.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      })
    }

    // Verify the user's email domain matches the connection domain
    const emailDomain = profile.email.split('@')[1]
    if (emailDomain !== connection.domain) {
      return reply.status(403).send({
        error: 'Domain Mismatch',
        message: `Email domain "${emailDomain}" does not match SSO domain "${connection.domain}"`
      })
    }

    // Find or create the user
    let user = await db.query.users.findFirst({
      where: eq(users.email, profile.email),
      with: { org: true }
    })

    if (user) {
      // Existing user — verify they belong to the correct org
      if (user.orgId !== connection.orgId) {
        return reply.status(403).send({
          error: 'Organization Mismatch',
          message: 'This email is associated with a different organization'
        })
      }

      // Update name if provided and user hasn't set one
      if (profile.name && !user.name) {
        await db.update(users).set({ name: profile.name, updatedAt: new Date() })
          .where(eq(users.id, user.id))
      }
    } else if (connection.jitProvisioning) {
      // JIT provisioning — create user in the org
      ;[user] = await db.insert(users).values({
        email: profile.email,
        name: profile.name,
        orgId: connection.orgId,
        role: connection.defaultRole || 'member',
      }).returning()

      // Load org relation
      user.org = await db.query.organizations.findFirst({
        where: eq(organizations.id, connection.orgId)
      })

      await auditAction({
        orgId: connection.orgId,
        userId: user.id,
        action: 'sso.user_provisioned',
        metadata: { email: profile.email, name: profile.name }
      })
    } else {
      // No JIT and user doesn't exist
      return reply.status(403).send({
        error: 'Access Denied',
        message: 'Your account has not been provisioned. Ask your administrator to invite you first.'
      })
    }

    // Update last_used_at on the connection
    await db.update(ssoConnections).set({ lastUsedAt: new Date() })
      .where(eq(ssoConnections.id, connection.id))

    // Issue our JWT — same as normal login
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      sso: true, // Flag that this session was created via SSO
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    await auditAction({
      orgId: user.orgId,
      userId: user.id,
      action: 'auth.sso_login',
      metadata: { provider: connection.displayName, domain: connection.domain }
    })

    // Redirect to the app with the token set as a cookie
    const appUrl = process.env.GHARA_URL || 'http://localhost:3005'
    reply.setCookie('auth_token', token, COOKIE_OPTIONS)
    return reply.redirect(`${appUrl}/dashboard?sso=success`)
  })

  // POST /api/v1/auth/sso/check — Check if SSO is available for an email domain
  // Used by the login form to show "Sign in with SSO" button
  fastify.post('/check', {
    schema: {
      tags: ['SSO'],
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
    const domain = email.split('@')[1]?.toLowerCase()

    if (!domain) {
      return reply.send({ ssoAvailable: false })
    }

    const connection = await db.query.ssoConnections.findFirst({
      where: and(
        eq(ssoConnections.domain, domain),
        eq(ssoConnections.status, 'active')
      )
    })

    if (!connection) {
      return reply.send({ ssoAvailable: false })
    }

    return reply.send({
      ssoAvailable: true,
      enforced: connection.enforceSso,
      provider: connection.displayName,
    })
  })
}
