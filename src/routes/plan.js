import { verifyToken, requireUser } from '../middleware/auth.js'
import { PLAN_FEATURES, getAllowedFrameworks, getMaxTeamMembers } from '../middleware/plan.js'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq, count } from 'drizzle-orm'

export default async function planRoutes(fastify) {

  // GET /api/v1/plan/features
  // Get current plan features and limits
  fastify.get('/features', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Plan'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const plan = request.user.org?.plan || 'starter'
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.starter

    // Get current team member count
    const [{ value: currentMembers }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.orgId, request.orgId))

    return reply.send({
      plan,
      features: {
        frameworks: features.frameworks,
        aiFeatures: features.aiFeatures,
        maxTeamMembers: features.maxTeamMembers,
        regulatoryAlerts: features.regulatoryAlerts
      },
      usage: {
        currentMembers,
        maxMembers: features.maxTeamMembers
      },
      limits: {
        teamMembersReached: features.maxTeamMembers !== null && currentMembers >= features.maxTeamMembers
      }
    })
  })

  // GET /api/v1/plan/check/:feature
  // Check if a specific feature is available
  fastify.get('/check/:feature', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Plan'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          feature: { type: 'string', enum: ['aiFeatures', 'regulatoryAlerts'] }
        }
      }
    }
  }, async (request, reply) => {
    const { feature } = request.params
    const plan = request.user.org?.plan || 'starter'
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.starter

    return reply.send({
      available: features[feature] || false,
      plan,
      requiredPlan: features[feature] ? null : 'growth'
    })
  })
}
