import { db } from '../db/client.js'
import { integrations, kubernetesIntegrations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { requireTier } from '../middleware/plan.js'
import { encrypt, decrypt } from '../services/encryption.js'
import { auditAction } from '../services/audit.js'
import { scanQueue } from '../jobs/queues.js'
import { validateAwsRole } from '../connectors/aws/validate.js'
import { validateInstallation } from '../connectors/github/client.js'
import { handleGithubWebhook } from '../connectors/github/webhook.js'
import { validateOktaCredentials } from '../connectors/okta/checks.js'
import { validateGoogleWorkspaceCredentials } from '../connectors/google-workspace/checks.js'
import { validateOpenCostEndpoint } from '../connectors/kubernetes/opencost.js'
import { redis } from '../services/redis.js'
import { rateLimit } from '../services/rate-limit.js'

// Drop every cached FinOps response keyed by this org so the dashboard
// can't keep serving findings from a now-disconnected AWS account.
async function clearFinopsCacheForOrg(orgId, log) {
  const patterns = [
    `finops:findings:${orgId}*`,
    `finops:trend:${orgId}:*`,
    `finops:allocation:${orgId}:*`,
    `finops:purchase-recs:${orgId}`,
    `finops:ai-gpu:${orgId}`
  ]
  try {
    for (const match of patterns) {
      const stream = redis.scanStream({ match, count: 200 })
      for await (const keys of stream) {
        if (keys.length) await redis.del(...keys)
      }
    }
  } catch (err) {
    log?.warn({ err, orgId }, 'Failed to clear FinOps cache after integration disconnect')
  }
}

export default async function integrationRoutes(fastify) {

  // GET /api/v1/integrations/aws/setup-info
  // Get AWS account ID and external ID for setting up the role
  fastify.get('/aws/setup-info', {
    schema: { tags: ['Integrations'] }
  }, async (request, reply) => {
    // In production, this would be your actual AWS account ID
    // For now, using a placeholder
    return reply.send({
      accountId: process.env.AWS_ACCOUNT_ID || '123456789012',
      externalIdPrefix: 'ifu-',
      instructions: [
        'Open AWS IAM → Roles → Create role',
        'Select "Another AWS account"',
        'Enter the Account ID shown above',
        'Enter your External ID (generated in the form)',
        'Attach policy: SecurityAudit',
        'Copy the Role ARN'
      ]
    })
  })

  // GET /api/v1/integrations
  // List all integrations for the org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Integrations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.integrations.findMany({
      where: eq(integrations.orgId, request.orgId),
      columns: { credentials: false } // Never return raw credentials
    })
    return reply.send(results)
  })

  // POST /api/v1/integrations/aws
  // Connect an AWS account via cross-account IAM role
  fastify.post('/aws', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['roleArn', 'externalId'],
        properties: {
          roleArn: {
            type: 'string',
            pattern: '^arn:aws:iam::[0-9]{12}:role/.+$',
            description: 'ARN of the read-only IAM role in the customer account'
          },
          externalId: {
            type: 'string',
            description: 'External ID for secure role assumption'
          },
          product: {
            type: 'string',
            enum: ['comply', 'finops', 'ghara'],
            description: 'Which product this AWS role is for.',
            default: 'comply'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { roleArn, externalId } = request.body
    const product = request.body.product || 'comply'

    // Check for existing AWS integration for THIS product. Comply and FinOps
    // each have their own row; we only update the row that matches this product.
    const existing = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.product, product)
      )
    })

    // Validate that we can actually assume this role before saving
    const validation = await validateAwsRole(roleArn, externalId)
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Ensure the IAM role trust policy allows assumption from the iFu Labs Comply account'
      })
    }

    // Multi-tenant isolation: prevent another org from claiming the same AWS account
    // for the SAME product. Two different orgs each connecting account 123 for
    // different products (one for Comply, one for FinOps) is allowed; both
    // connecting it for the same product is the actual collision we block.
    const allConnected = await db.query.integrations.findMany({
      where: and(
        eq(integrations.type, 'aws'),
        eq(integrations.product, product),
        eq(integrations.status, 'connected')
      ),
      columns: { id: true, orgId: true, metadata: true }
    })
    const collision = allConnected.find(row =>
      row.orgId !== request.orgId &&
      row.metadata?.accountId === validation.accountId
    )
    if (collision) {
      fastify.log.warn({
        attemptingOrgId: request.orgId,
        existingOrgId: collision.orgId,
        awsAccountId: validation.accountId
      }, 'Blocked duplicate AWS account registration across orgs')
      return reply.status(409).send({
        error: 'Conflict',
        message: `AWS account ${validation.accountId} is already connected to another organization. Disconnect it from the existing organization first.`,
        code: 'AWS_ACCOUNT_ALREADY_CONNECTED'
      })
    }

    // Encrypt credentials before storing
    const encryptedCredentials = encrypt(JSON.stringify({
      roleArn,
      externalId,
      awsAccountId: validation.accountId
    }))

    let integration
    if (existing) {
      // Update existing - clear error state on successful reconnection
      ;[integration] = await db
        .update(integrations)
        .set({
          status: 'connected',
          credentials: encryptedCredentials,
          metadata: { accountId: validation.accountId, alias: validation.accountAlias, externalId },
          lastError: null,
          lastErrorAt: null,
          disconnectedAt: null,
          updatedAt: new Date()
        })
        .where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      // Create new
      ;[integration] = await db
        .insert(integrations)
        .values({
          orgId: request.orgId,
          type: 'aws',
          product,
          status: 'connected',
          credentials: encryptedCredentials,
          metadata: { accountId: validation.accountId, alias: validation.accountAlias, externalId }
        })
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    // Kick off an immediate scan for compliance + cost
    if (product === 'comply' || product === 'ghara') {
      await scanQueue.add('scan', {
        orgId: request.orgId,
        integrationId: integration.id,
        integrationType: 'aws',
        triggeredBy: 'manual'
      }, { priority: 1 })
    }

    // Also queue a finops scan for ghara integrations
    if (product === 'ghara' || product === 'finops') {
      const { finopsScanQueue } = await import('../jobs/queues.js')
      await finopsScanQueue.add('finops-scan', {
        orgId: request.orgId,
        integrationId: integration.id,
        triggeredBy: 'manual'
      }, { priority: 1 })
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.connected',
      resource: 'aws',
      resourceId: integration.id,
      metadata: { accountId: validation.accountId, product }
    })

    return reply.status(201).send({
      ...integration,
      message: 'AWS account connected. Initial scan has been queued.'
    })
  })

  // DELETE /api/v1/integrations/:id
  // Disconnect an integration
  fastify.delete('/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, request.params.id),
        eq(integrations.orgId, request.orgId)
      )
    })

    if (!integration) {
      return reply.status(404).send({ error: 'Not Found', message: 'Integration not found' })
    }

    await db.update(integrations)
      .set({
        status: 'disconnected',
        credentials: null,
        lastError: null,
        lastErrorAt: null,
        disconnectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(integrations.id, integration.id))

    // Only the FinOps AWS row drives the FinOps cache; disconnecting the
    // Comply AWS row must not blow away cost data the customer is still using.
    if (integration.type === 'aws' && integration.product === 'finops') {
      await clearFinopsCacheForOrg(request.orgId, fastify.log)
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.disconnected',
      resource: integration.type,
      resourceId: integration.id,
      metadata: { product: integration.product }
    })

    return reply.status(204).send()
  })

  // POST /api/v1/integrations/:id/sync
  // Manually trigger a scan for a specific integration. One sync per org
  // per 5 min — schedules the underlying AWS / GitHub work.
  fastify.post('/:id/sync', {
    preHandler: [
      verifyToken,
      requireUser,
      requireAdmin,
      rateLimit('integration-sync', 300)
    ],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', additionalProperties: true } // Allow empty body
    }
  }, async (request, reply) => {
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, request.params.id),
        eq(integrations.orgId, request.orgId)
      )
    })

    if (!integration) {
      return reply.status(404).send({ error: 'Not Found', message: 'Integration not found' })
    }

    if (integration.status !== 'connected') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Integration is not connected' })
    }

    const job = await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: integration.type,
      triggeredBy: 'manual'
    }, { priority: 1 })

    // Also trigger finops scan if this is an AWS integration (ghara or finops product)
    if (integration.type === 'aws' && ['ghara', 'finops'].includes(integration.product)) {
      const { finopsScanQueue } = await import('../jobs/queues.js')
      await finopsScanQueue.add('finops-scan', {
        orgId: request.orgId,
        integrationId: integration.id,
        triggeredBy: 'manual'
      }, { priority: 1 })
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.sync_triggered',
      resource: integration.type,
      resourceId: integration.id,
      metadata: { jobId: job.id }
    })

    return reply.send({ message: 'Scan queued', jobId: job.id })
  })

  // POST /api/v1/integrations/github
  // Connect a GitHub org via GitHub App installation
  fastify.post('/github', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['installationId'],
        properties: {
          installationId: {
            type: 'integer',
            description: 'GitHub App installation ID — found in the GitHub App installation URL'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { installationId } = request.body

    // Validate the installation exists and we can access it
    const validation = await validateInstallation(installationId)

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Install the iFu Labs GitHub App in your organisation first: https://github.com/apps/ifu-labs-comply'
      })
    }

    // Check for existing GitHub integration
    const existing = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'github')
      )
    })

    const encryptedCredentials = encrypt(JSON.stringify({ installationId, orgLogin: validation.orgLogin }))

    let integration
    if (existing) {
      ;[integration] = await db.update(integrations).set({
        status: 'connected',
        credentials: encryptedCredentials,
        metadata: { orgLogin: validation.orgLogin, orgType: validation.orgType, repoSelection: validation.repoSelection },
        disconnectedAt: null,
        updatedAt: new Date()
      }).where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      ;[integration] = await db.insert(integrations).values({
        orgId: request.orgId,
        type: 'github',
        status: 'connected',
        credentials: encryptedCredentials,
        metadata: { orgLogin: validation.orgLogin, orgType: validation.orgType, repoSelection: validation.repoSelection }
      }).returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    // Queue immediate scan
    await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: 'github',
      triggeredBy: 'manual'
    }, { priority: 1 })

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.connected',
      resource: 'github',
      resourceId: integration.id,
      metadata: { orgLogin: validation.orgLogin }
    })

    return reply.status(201).send({
      ...integration,
      message: `GitHub org ${validation.orgLogin} connected. Initial scan queued.`
    })
  })

  // POST /api/v1/integrations/okta
  // Connect Okta via API token
  fastify.post('/okta', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['domain', 'apiToken'],
        properties: {
          domain:   { type: 'string', minLength: 4, description: 'e.g. acme.okta.com' },
          apiToken: { type: 'string', minLength: 10 }
        }
      }
    }
  }, async (request, reply) => {
    const { domain, apiToken } = request.body
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    const validation = await validateOktaCredentials(cleanDomain, apiToken)
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Ensure the API token has read access to users, groups, and policies.'
      })
    }

    const existing = await db.query.integrations.findFirst({
      where: and(eq(integrations.orgId, request.orgId), eq(integrations.type, 'okta'))
    })

    const encryptedCredentials = encrypt(JSON.stringify({ domain: cleanDomain, apiToken }))
    const metadata = { domain: cleanDomain, identity: validation.identity }

    let integration
    if (existing) {
      ;[integration] = await db.update(integrations).set({
        status: 'connected', credentials: encryptedCredentials, metadata,
        lastError: null, lastErrorAt: null, disconnectedAt: null, updatedAt: new Date()
      }).where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      ;[integration] = await db.insert(integrations).values({
        orgId: request.orgId, type: 'okta', status: 'connected',
        credentials: encryptedCredentials, metadata
      }).returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: 'okta',
      triggeredBy: 'manual'
    }, { priority: 1 })

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'integration.connected', resource: 'okta',
      resourceId: integration.id, metadata: { domain: cleanDomain }
    })

    return reply.status(201).send({ ...integration, message: `Okta org ${cleanDomain} connected. Initial scan queued.` })
  })

  // POST /api/v1/integrations/google-workspace
  // Connect Google Workspace via service account JSON + admin email
  fastify.post('/google-workspace', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['serviceAccount', 'adminEmail'],
        properties: {
          serviceAccount: {
            description: 'Service account JSON object or stringified JSON',
            oneOf: [
              { type: 'string', minLength: 50 },
              { type: 'object' }
            ]
          },
          adminEmail: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    const { serviceAccount, adminEmail } = request.body

    const validation = await validateGoogleWorkspaceCredentials(serviceAccount, adminEmail)
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Integration Error',
        message: validation.error,
        hint: 'Service account must have domain-wide delegation enabled and the admin user must be a Workspace super-admin.'
      })
    }

    const existing = await db.query.integrations.findFirst({
      where: and(eq(integrations.orgId, request.orgId), eq(integrations.type, 'google_workspace'))
    })

    const saString = typeof serviceAccount === 'string' ? serviceAccount : JSON.stringify(serviceAccount)
    const encryptedCredentials = encrypt(JSON.stringify({ serviceAccount: saString, adminEmail }))
    const metadata = { domain: validation.domain, adminEmail }

    let integration
    if (existing) {
      ;[integration] = await db.update(integrations).set({
        status: 'connected', credentials: encryptedCredentials, metadata,
        lastError: null, lastErrorAt: null, disconnectedAt: null, updatedAt: new Date()
      }).where(eq(integrations.id, existing.id))
        .returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    } else {
      ;[integration] = await db.insert(integrations).values({
        orgId: request.orgId, type: 'google_workspace', status: 'connected',
        credentials: encryptedCredentials, metadata
      }).returning({ id: integrations.id, type: integrations.type, status: integrations.status, metadata: integrations.metadata })
    }

    await scanQueue.add('scan', {
      orgId: request.orgId,
      integrationId: integration.id,
      integrationType: 'google_workspace',
      triggeredBy: 'manual'
    }, { priority: 1 })

    await auditAction({
      orgId: request.orgId, userId: request.user.id,
      action: 'integration.connected', resource: 'google_workspace',
      resourceId: integration.id, metadata: { domain: validation.domain }
    })

    return reply.status(201).send({ ...integration, message: `Google Workspace ${validation.domain} connected. Initial scan queued.` })
  })

  // POST /api/v1/integrations/github/webhook
  // Receives GitHub App webhook events (push, member, installation)
  fastify.post('/github/webhook', {
    config: { rawBody: true }, // Need raw body for signature verification
    schema: { tags: ['Integrations'] }
  }, handleGithubWebhook)

  // ── Kubernetes Integration Routes ──────────────────────────────────────────

  // GET /api/v1/integrations/kubernetes
  // List all K8s integrations for the org
  fastify.get('/kubernetes', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Integrations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.kubernetesIntegrations.findMany({
      where: eq(kubernetesIntegrations.orgId, request.orgId),
      columns: { encryptedToken: false }
    })
    return reply.send(results)
  })

  // POST /api/v1/integrations/kubernetes
  // Connect a Kubernetes cluster via OpenCost
  fastify.post('/kubernetes', {
    preHandler: [verifyToken, requireUser, requireAdmin, requireTier('growth')],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['clusterName', 'connectionType'],
        properties: {
          clusterName: { type: 'string', minLength: 1, description: 'Human-readable cluster name' },
          connectionType: { type: 'string', enum: ['opencost', 'eks_container_insights'] },
          endpointUrl: { type: 'string', description: 'OpenCost API URL (required for opencost type)' },
          bearerToken: { type: 'string', description: 'Bearer token for OpenCost auth (optional)' },
          awsIntegrationId: { type: 'string', description: 'AWS integration ID (required for eks_container_insights)' }
        }
      }
    }
  }, async (request, reply) => {
    const { clusterName, connectionType, endpointUrl, bearerToken, awsIntegrationId } = request.body

    // Validate based on connection type
    if (connectionType === 'opencost') {
      if (!endpointUrl) {
        return reply.status(400).send({ error: 'endpointUrl is required for OpenCost connection type' })
      }

      const validation = await validateOpenCostEndpoint(endpointUrl, bearerToken)
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Integration Error',
          message: validation.error,
          hint: 'Ensure OpenCost is running and the endpoint is reachable. Deploy with: helm install opencost opencost/opencost --namespace opencost --create-namespace'
        })
      }
    } else if (connectionType === 'eks_container_insights') {
      if (!awsIntegrationId) {
        return reply.status(400).send({ error: 'awsIntegrationId is required for EKS Container Insights' })
      }
      // Verify the AWS integration exists and belongs to this org
      const awsInt = await db.query.integrations.findFirst({
        where: and(
          eq(integrations.id, awsIntegrationId),
          eq(integrations.orgId, request.orgId),
          eq(integrations.type, 'aws'),
          eq(integrations.status, 'connected')
        )
      })
      if (!awsInt) {
        return reply.status(400).send({ error: 'AWS integration not found or not connected' })
      }
    }

    // Check for existing cluster with same name
    const existing = await db.query.kubernetesIntegrations.findFirst({
      where: and(
        eq(kubernetesIntegrations.orgId, request.orgId),
        eq(kubernetesIntegrations.clusterName, clusterName)
      )
    })

    const encryptedTokenValue = bearerToken ? encrypt(bearerToken) : null

    let k8sIntegration
    if (existing) {
      ;[k8sIntegration] = await db.update(kubernetesIntegrations).set({
        connectionType,
        endpointUrl: endpointUrl || null,
        encryptedToken: encryptedTokenValue,
        awsIntegrationId: awsIntegrationId || null,
        status: 'connected',
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date()
      }).where(eq(kubernetesIntegrations.id, existing.id))
        .returning()
    } else {
      ;[k8sIntegration] = await db.insert(kubernetesIntegrations).values({
        orgId: request.orgId,
        clusterName,
        connectionType,
        endpointUrl: endpointUrl || null,
        encryptedToken: encryptedTokenValue,
        awsIntegrationId: awsIntegrationId || null,
        status: 'connected'
      }).returning()
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.kubernetes.connected',
      resource: 'kubernetes',
      resourceId: k8sIntegration.id,
      metadata: { clusterName, connectionType }
    })

    return reply.status(201).send({
      ...k8sIntegration,
      encryptedToken: undefined,
      message: `Kubernetes cluster "${clusterName}" connected via ${connectionType}.`
    })
  })

  // DELETE /api/v1/integrations/kubernetes/:id
  // Disconnect a Kubernetes integration
  fastify.delete('/kubernetes/:id', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const k8s = await db.query.kubernetesIntegrations.findFirst({
      where: and(
        eq(kubernetesIntegrations.id, request.params.id),
        eq(kubernetesIntegrations.orgId, request.orgId)
      )
    })

    if (!k8s) {
      return reply.status(404).send({ error: 'Kubernetes integration not found' })
    }

    await db.update(kubernetesIntegrations).set({
      status: 'disconnected',
      encryptedToken: null,
      updatedAt: new Date()
    }).where(eq(kubernetesIntegrations.id, k8s.id))

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'integration.kubernetes.disconnected',
      resource: 'kubernetes',
      resourceId: k8s.id,
      metadata: { clusterName: k8s.clusterName }
    })

    return reply.status(204).send()
  })

  // GET /api/v1/integrations/aws/cloudformation-url
  // Generate a pre-filled CloudFormation Quick Launch URL
  fastify.get('/aws/cloudformation-url', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Integrations'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const accountId = process.env.AWS_ACCOUNT_ID || '123456789012'
    const externalId = `ghara-${request.orgId.slice(0, 8)}`

    // CloudFormation template URL (would be hosted in an S3 bucket in production)
    const templateUrl = process.env.GHARA_CFN_TEMPLATE_URL || 'https://ghara-public.s3.amazonaws.com/cfn/ghara-iam-role.yaml'

    const cfnUrl = new URL('https://console.aws.amazon.com/cloudformation/home')
    cfnUrl.hash = `/stacks/quickcreate?templateURL=${encodeURIComponent(templateUrl)}&stackName=GharaReadOnlyRole&param_ExternalId=${externalId}&param_TrustedAccountId=${accountId}`

    return reply.send({
      cloudFormationUrl: cfnUrl.toString(),
      externalId,
      accountId,
      templateUrl,
      instructions: [
        'Click the CloudFormation link to open AWS Console',
        'Review the IAM role permissions (read-only)',
        'Check "I acknowledge that AWS CloudFormation might create IAM resources"',
        'Click "Create stack"',
        'Once complete, copy the Role ARN from the Outputs tab',
        'Paste it back here to finish connecting'
      ]
    })
  })
}
