import { verifyToken, requireUser, requireAdmin } from '../middleware/auth.js'
import { getUsageForOrg } from '../services/ai-usage.js'

export default async function aiUsageRoutes(fastify) {
  // GET /api/v1/ai-usage
  // Per-org AI/LLM token + cost summary. Admin-only — exposes spend.
  fastify.get('/', {
    preHandler: [verifyToken, requireUser, requireAdmin],
    schema: {
      tags: ['AI'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          windowDays: { type: 'integer', minimum: 1, maximum: 365, default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const days = request.query.windowDays || 30
    const usage = await getUsageForOrg(request.orgId, days)
    return reply.send(usage)
  })
}
