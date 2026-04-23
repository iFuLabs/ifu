import { db } from '../db/client.js'
import { integrations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { decrypt } from '../services/encryption.js'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { runFinOpsChecks } from '../connectors/finops/checks.js'
import { generateFinOpsSummary } from '../services/finops-ai.js'
import { redis } from '../services/redis.js'
import { auditAction } from '../services/audit.js'

const CACHE_TTL = 60 * 60 * 6 // 6 hours — cost data doesn't change minute to minute

export default async function finopsRoutes(fastify) {

  // GET /api/v1/finops
  // Returns latest FinOps findings (cached 6h, or runs fresh if none exist)
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['FinOps'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { refresh: { type: 'boolean', default: false } }
      }
    }
  }, async (request, reply) => {
    const cacheKey = `finops:findings:${request.orgId}`

    if (!request.query.refresh) {
      const cached = await redis.get(cacheKey).catch(() => null)
      if (cached) return reply.send({ ...JSON.parse(cached), cached: true })
    }

    // Find connected AWS integration
    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({
        error: 'No AWS integration',
        message: 'Connect an AWS account before running FinOps analysis',
        code: 'AWS_REQUIRED'
      })
    }

    const creds = JSON.parse(decrypt(awsIntegration.credentials))
    const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

    try {
      const findings = await runFinOpsChecks({
        credentials: awsCredentials,
        region: process.env.AWS_REGION || 'us-east-1',
        onProgress: async () => {} // no SSE on this endpoint — use /stream for live progress
      })

      // Generate AI summary
      const aiSummary = await generateFinOpsSummary(findings)
      findings.aiSummary = aiSummary

      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

      await auditAction({
        orgId: request.orgId,
        userId: request.user.id,
        action: 'finops.scanned',
        metadata: { totalSavings: findings.summary.totalMonthlySavings }
      })

      return reply.send({ ...findings, cached: false })

    } catch (err) {
      fastify.log.error(err, 'FinOps scan failed')
      return reply.status(500).send({
        error: 'FinOps scan failed',
        message: err.message
      })
    }
  })

  // GET /api/v1/finops/stream
  // Server-sent events — streams FinOps scan progress in real time
  fastify.get('/stream', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const awsIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.orgId, request.orgId),
        eq(integrations.type, 'aws'),
        eq(integrations.status, 'connected')
      )
    })

    if (!awsIntegration) {
      return reply.status(400).send({ error: 'No AWS integration connected' })
    }

    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    const send = (data) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)

    try {
      const creds = JSON.parse(decrypt(awsIntegration.credentials))
      const awsCredentials = await assumeRole(creds.roleArn, creds.externalId)

      send({ type: 'status', message: 'Connected to AWS account', progress: 5 })

      const findings = await runFinOpsChecks({
        credentials: awsCredentials,
        region: process.env.AWS_REGION || 'us-east-1',
        onProgress: async (pct) => {
          const messages = {
            15: 'Fetching current spend & top services...',
            25: 'Generating cost forecast...',
            45: 'Detecting idle resources & waste...',
            65: 'Analysing rightsizing opportunities...',
            80: 'Checking Reserved Instance coverage...',
            90: 'Checking Savings Plans coverage...',
            100: 'Analysis complete'
          }
          send({ type: 'progress', progress: pct, message: messages[pct] || `${pct}% complete` })
        }
      })

      // Cache the result
      const cacheKey = `finops:findings:${request.orgId}`
      
      // Generate AI summary
      const aiSummary = await generateFinOpsSummary(findings)
      findings.aiSummary = aiSummary
      
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(findings)).catch(() => null)

      send({ type: 'complete', findings })
    } catch (err) {
      send({ type: 'error', message: err.message })
    } finally {
      reply.raw.end()
    }
  })

  // GET /api/v1/finops/summary
  // Lightweight summary card — used on the main dashboard
  fastify.get('/summary', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['FinOps'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const cacheKey = `finops:findings:${request.orgId}`
    const cached = await redis.get(cacheKey).catch(() => null)

    if (!cached) {
      return reply.send({
        available: false,
        message: 'No FinOps data yet. Run a scan from the FinOps tab.'
      })
    }

    const findings = JSON.parse(cached)
    return reply.send({
      available: true,
      monthlyCost: findings.monthlyCost,
      totalMonthlySavings: findings.summary.totalMonthlySavings,
      totalAnnualSavings:  findings.summary.totalAnnualSavings,
      wasteItems:          findings.summary.wasteItems,
      rightsizingItems:    findings.summary.rightsizingItems,
      coverageGaps:        findings.summary.coverageGaps,
      checkedAt:           findings.summary.checkedAt
    })
  })
}

// ── Helper ─────────────────────────────────────────────────────────────────
async function assumeRole(roleArn, externalId) {
  const sts = new STSClient({ 
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  })
  const { Credentials } = await sts.send(new AssumeRoleCommand({
    RoleArn:         roleArn,
    RoleSessionName: `iFu-Labs-FinOps-${Date.now()}`,
    ExternalId:      externalId,
    DurationSeconds: 3600
  }))
  return {
    accessKeyId:     Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken:    Credentials.SessionToken
  }
}
