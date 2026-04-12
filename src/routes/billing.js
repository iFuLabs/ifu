import { verifyToken, requireUser, requireOwner } from '../middleware/auth.js'

export default async function billingRoutes(fastify) {

  // GET /api/v1/billing
  // Get current subscription details
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Billing'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    // TODO: Implement Stripe integration
    return reply.send({
      plan: 'starter',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Billing integration coming soon'
    })
  })

  // POST /api/v1/billing/checkout
  // Create Stripe checkout session
  fastify.post('/checkout', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: {
      tags: ['Billing'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string', enum: ['starter', 'growth', 'enterprise'] }
        }
      }
    }
  }, async (request, reply) => {
    // TODO: Create Stripe checkout session
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Stripe billing integration coming soon'
    })
  })

  // POST /api/v1/billing/portal
  // Create Stripe customer portal session
  fastify.post('/portal', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: { tags: ['Billing'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    // TODO: Create Stripe portal session
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Stripe billing integration coming soon'
    })
  })

  // POST /api/v1/billing/webhook
  // Stripe webhook handler
  fastify.post('/webhook', {
    config: { rawBody: true },
    schema: { tags: ['Billing'] }
  }, async (request, reply) => {
    // TODO: Handle Stripe webhooks (subscription.created, subscription.updated, etc.)
    return reply.send({ received: true })
  })
}
