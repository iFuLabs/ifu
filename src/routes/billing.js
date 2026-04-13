import { verifyToken, requireUser, requireOwner } from '../middleware/auth.js'
import { db } from '../db/client.js'
import { organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import {
  initializeTransaction,
  verifyTransaction,
  createSubscription,
  getSubscription,
  disableSubscription,
  verifyWebhookSignature
} from '../services/paystack.js'
import { logger } from '../services/logger.js'

const PLAN_MAP = {
  'comply-starter': process.env.PAYSTACK_COMPLY_STARTER_PLAN,
  'comply-growth': process.env.PAYSTACK_COMPLY_GROWTH_PLAN,
  'finops': process.env.PAYSTACK_FINOPS_PLAN
}

const PLAN_NAMES = {
  'comply-starter': 'Comply Starter',
  'comply-growth': 'Comply Growth',
  'finops': 'FinOps'
}

export default async function billingRoutes(fastify) {

  // GET /api/v1/billing — current subscription status
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Billing'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    if (!org) return reply.status(404).send({ error: 'Organization not found' })

    const now = new Date()
    const trialActive = org.trialEndsAt && new Date(org.trialEndsAt) > now
    const trialDaysLeft = trialActive
      ? Math.ceil((new Date(org.trialEndsAt) - now) / (1000 * 60 * 60 * 24))
      : 0

    let subscription = null
    if (org.paystackSubscriptionCode) {
      try {
        subscription = await getSubscription(org.paystackSubscriptionCode)
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to fetch Paystack subscription')
      }
    }

    return reply.send({
      plan: org.plan,
      status: subscription?.status === 'active' ? 'active'
        : trialActive ? 'trialing'
        : 'expired',
      trialEndsAt: org.trialEndsAt,
      trialDaysLeft,
      hasPaymentMethod: !!org.paystackAuthCode,
      subscription: subscription ? {
        code: subscription.subscription_code,
        status: subscription.status,
        nextPaymentDate: subscription.next_payment_date,
        planName: subscription.plan?.name,
        amount: subscription.amount,
        currency: subscription.plan?.currency
      } : null
    })
  })

  // POST /api/v1/billing/initialize — start Paystack checkout to tokenize card
  fastify.post('/initialize', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: {
      tags: ['Billing'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string', enum: ['comply-starter', 'comply-growth', 'finops'] }
        }
      }
    }
  }, async (request, reply) => {
    const { plan } = request.body
    const planCode = PLAN_MAP[plan]

    if (!planCode) {
      return reply.status(400).send({ error: 'Invalid plan or plan not configured' })
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    const callbackUrl = `${process.env.PORTAL_URL || 'http://localhost:3003'}/billing/callback`

    const result = await initializeTransaction({
      email: request.user.email,
      amount: 1000, // ZAR 10.00 in cents for card tokenization
      callbackUrl,
      metadata: {
        orgId: request.orgId,
        plan,
        planCode,
        userId: request.user.id,
        orgName: org?.name
      }
    })

    return reply.send({
      authorizationUrl: result.authorization_url,
      reference: result.reference,
      accessCode: result.access_code
    })
  })

  // GET /api/v1/billing/verify — verify transaction and create subscription
  fastify.get('/verify', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Billing'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['reference'],
        properties: {
          reference: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { reference } = request.query

    const txn = await verifyTransaction(reference)

    if (txn.status !== 'success') {
      return reply.status(400).send({
        error: 'Payment verification failed',
        message: `Transaction status: ${txn.status}`
      })
    }

    const customerCode = txn.customer.customer_code
    const authorizationCode = txn.authorization.authorization_code
    const metadata = txn.metadata || {}
    const planCode = metadata.planCode || metadata.plan_code
    const plan = metadata.plan

    if (!planCode) {
      return reply.status(400).send({ error: 'Missing plan information in transaction' })
    }

    // Check if organization already has a subscription
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    let subscription
    
    if (org.paystackSubscriptionCode) {
      // Subscription already exists, just fetch it
      try {
        subscription = await getSubscription(org.paystackSubscriptionCode)
      } catch (err) {
        // If subscription doesn't exist in Paystack, create new one
        const startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        subscription = await createSubscription({
          customer: customerCode,
          plan: planCode,
          authorization: authorizationCode,
          startDate
        })
      }
    } else {
      // Create new subscription with start_date = now + 3 days (trial period)
      const startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      subscription = await createSubscription({
        customer: customerCode,
        plan: planCode,
        authorization: authorizationCode,
        startDate
      })
    }

    // Determine which plan tier to set
    const planTier = plan?.startsWith('comply') ? (plan === 'comply-growth' ? 'growth' : 'starter') : 'starter'

    // Update organization with Paystack details
    await db.update(organizations).set({
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: subscription.subscription_code,
      paystackAuthCode: authorizationCode,
      plan: planTier,
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }).where(eq(organizations.id, request.orgId))

    logger.info({
      orgId: request.orgId,
      plan,
      subscriptionCode: subscription.subscription_code
    }, 'Subscription created with 3-day trial')

    return reply.send({
      status: 'success',
      plan: planTier,
      planName: PLAN_NAMES[plan] || plan,
      trialEndsAt: startDate,
      subscription: {
        code: subscription.subscription_code,
        nextPaymentDate: subscription.next_payment_date
      }
    })
  })

  // POST /api/v1/billing/cancel — cancel subscription
  fastify.post('/cancel', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: { tags: ['Billing'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    if (!org?.paystackSubscriptionCode) {
      return reply.status(400).send({ error: 'No active subscription to cancel' })
    }

    // Fetch subscription to get the email_token needed for disable
    const sub = await getSubscription(org.paystackSubscriptionCode)

    await disableSubscription({
      code: sub.subscription_code,
      token: sub.email_token
    })

    await db.update(organizations).set({
      paystackSubscriptionCode: null,
      updatedAt: new Date()
    }).where(eq(organizations.id, request.orgId))

    logger.info({ orgId: request.orgId }, 'Subscription cancelled')

    return reply.send({ status: 'cancelled', message: 'Subscription has been cancelled' })
  })

  // POST /api/v1/billing/webhook — Paystack webhook handler
  fastify.post('/webhook', {
    config: { rawBody: true },
    schema: { tags: ['Billing'] }
  }, async (request, reply) => {
    const signature = request.headers['x-paystack-signature']
    if (!signature) {
      return reply.status(400).send({ error: 'Missing x-paystack-signature header' })
    }

    const rawBody = typeof request.rawBody === 'string'
      ? request.rawBody
      : request.rawBody?.toString() || JSON.stringify(request.body)

    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid webhook signature' })
    }

    const event = request.body
    logger.info({ event: event.event }, 'Paystack webhook received')

    switch (event.event) {
      case 'subscription.create': {
        const sub = event.data
        logger.info({ code: sub.subscription_code }, 'Subscription created')
        break
      }

      case 'charge.success': {
        const charge = event.data
        const customerCode = charge.customer?.customer_code
        if (customerCode) {
          // Find org by customer code and confirm payment
          const [org] = await db.select().from(organizations)
            .where(eq(organizations.paystackCustomerCode, customerCode))
            .limit(1)

          if (org) {
            logger.info({ orgId: org.id, amount: charge.amount }, 'Payment received')
          }
        }
        break
      }

      case 'subscription.disable': {
        const sub = event.data
        const [org] = await db.select().from(organizations)
          .where(eq(organizations.paystackSubscriptionCode, sub.subscription_code))
          .limit(1)

        if (org) {
          await db.update(organizations).set({
            paystackSubscriptionCode: null,
            updatedAt: new Date()
          }).where(eq(organizations.id, org.id))

          logger.info({ orgId: org.id }, 'Subscription disabled via webhook')
        }
        break
      }

      case 'subscription.not_renew': {
        const sub = event.data
        logger.info({ code: sub.subscription_code }, 'Subscription will not renew')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data
        logger.warn({ customer: invoice.customer?.customer_code }, 'Payment failed')
        break
      }

      default:
        logger.info({ event: event.event }, 'Unhandled Paystack webhook event')
    }

    return reply.send({ received: true })
  })
}
