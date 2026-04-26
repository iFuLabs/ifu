import { verifyToken, requireUser, requireOwner } from '../middleware/auth.js'
import { db } from '../db/client.js'
import { organizations, subscriptions as subscriptionsTable } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import {
  initializeTransaction,
  verifyTransaction,
  createSubscription,
  getSubscription,
  disableSubscription,
  verifyWebhookSignature
} from '../services/paystack.js'
import { upsertSubscription } from '../services/subscriptions.js'
import { logger } from '../services/logger.js'
import { auditAction } from '../services/audit.js'
import { TRIAL_DURATION_MS } from '../services/config.js'

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

// Maps the public plan slug to the org-level plan tier stored in the
// `organizations.plan` enum column. Each product has its own tier value so
// downstream code can branch correctly.
const PLAN_TIERS = {
  'comply-starter': 'starter',
  'comply-growth': 'growth',
  'finops': 'finops'
}

// Maps plan to product
const PLAN_TO_PRODUCT = {
  'comply-starter': 'comply',
  'comply-growth': 'comply',
  'finops': 'finops'
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

    // Check subscriptions table first (multi-product), fall back to org row
    const activeSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptionsTable.orgId, request.orgId),
        eq(subscriptionsTable.status, 'active')
      )
    }) || await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptionsTable.orgId, request.orgId),
        eq(subscriptionsTable.status, 'trialing')
      )
    })

    let subscription = null
    const subCode = activeSub?.paystackSubscriptionCode || org.paystackSubscriptionCode
    if (subCode) {
      try {
        subscription = await getSubscription(subCode)
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to fetch Paystack subscription')
      }
    }

    // Determine status: Paystack active > subscriptions table > trial > expired
    const paystackActive = subscription?.status === 'active'
    const subTableActive = activeSub?.status === 'active' || activeSub?.status === 'trialing'

    return reply.send({
      plan: activeSub?.plan || org.plan,
      product: activeSub?.product || null,
      status: paystackActive ? 'active'
        : (subTableActive || trialActive) ? 'trialing'
        : 'expired',
      trialEndsAt: activeSub?.trialEndsAt || org.trialEndsAt,
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
    preHandler: [verifyToken, requireUser, requireOwner],
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

    const customerCode = txn.customer?.customer_code
    const authorizationCode = txn.authorization?.authorization_code
    const metadata = txn.metadata || {}
    const planCode = metadata.planCode || metadata.plan_code
    const plan = metadata.plan

    if (!customerCode || !authorizationCode) {
      logger.error({ reference, hasCustomer: !!txn.customer, hasAuth: !!txn.authorization },
        'Paystack transaction missing customer or authorization data')
      return reply.status(400).send({ error: 'Transaction is missing customer or card authorization data' })
    }

    if (!planCode) {
      return reply.status(400).send({ error: 'Missing plan information in transaction' })
    }

    // Ensure the transaction metadata's orgId matches the authenticated org
    if (metadata.orgId && metadata.orgId !== request.orgId) {
      logger.warn({ reference, metaOrg: metadata.orgId, reqOrg: request.orgId },
        'Verify request orgId does not match transaction metadata')
      return reply.status(403).send({ error: 'Transaction does not belong to this organization' })
    }

    // Check if organization already has a subscription
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    if (!org) {
      return reply.status(404).send({ error: 'Organization not found' })
    }

    const startDateMs = Date.now() + TRIAL_DURATION_MS
    const startDate = new Date(startDateMs).toISOString()
    const trialEndsAt = new Date(startDateMs)
    const planTier = PLAN_TIERS[plan] || 'starter'

    let subscription
    let alreadyProvisioned = false

    // Idempotency: if this exact authorization has already been processed for
    // this org, skip re-creating the subscription so callback retries / refresh
    // don't double-charge or create duplicate subscriptions.
    if (org.paystackAuthCode === authorizationCode && org.paystackSubscriptionCode) {
      try {
        subscription = await getSubscription(org.paystackSubscriptionCode)
        alreadyProvisioned = true
      } catch (err) {
        logger.warn({ err: err.message, code: org.paystackSubscriptionCode },
          'Existing subscription not found in Paystack — will recreate')
      }
    }

    if (!subscription) {
      if (org.paystackSubscriptionCode) {
        // Subscription already exists for this org but was for a different
        // authorization — reuse if Paystack still has it, otherwise recreate.
        try {
          subscription = await getSubscription(org.paystackSubscriptionCode)
        } catch (err) {
          subscription = await createSubscription({
            customer: customerCode,
            plan: planCode,
            authorization: authorizationCode,
            startDate
          })
        }
      } else {
        // Create new subscription with start_date in the future so the
        // first real charge happens after the free trial.
        subscription = await createSubscription({
          customer: customerCode,
          plan: planCode,
          authorization: authorizationCode,
          startDate
        })
      }
    }

    // Update organization with Paystack details (for backward compatibility)
    // Note: We no longer update paystackSubscriptionCode here since we support
    // multiple subscriptions per org. Each subscription is tracked separately.
    await db.update(organizations).set({
      paystackCustomerCode: customerCode,
      paystackAuthCode: authorizationCode,
      plan: planTier,
      trialEndsAt,
      updatedAt: new Date()
    }).where(eq(organizations.id, request.orgId))

    // Create or update subscription in the new subscriptions table
    const product = PLAN_TO_PRODUCT[plan] || 'comply'
    await upsertSubscription({
      orgId: request.orgId,
      product,
      plan: planTier,
      status: 'trialing',
      paystackSubscriptionCode: subscription.subscription_code,
      paystackPlanCode: planCode,
      trialEndsAt
    })

    if (!alreadyProvisioned) {
      await auditAction({
        orgId: request.orgId,
        userId: request.user.id,
        action: 'billing.subscription_created',
        metadata: {
          plan,
          planTier,
          product,
          subscriptionCode: subscription.subscription_code,
          reference
        }
      })
      logger.info({
        orgId: request.orgId,
        plan,
        product,
        subscriptionCode: subscription.subscription_code
      }, 'Subscription created with free trial')
    } else {
      logger.info({
        orgId: request.orgId,
        subscriptionCode: subscription.subscription_code
      }, 'Verify call returned already-provisioned subscription (idempotent)')
    }

    return reply.send({
      status: 'success',
      plan: planTier,
      product,
      planName: PLAN_NAMES[plan] || plan,
      trialEndsAt: trialEndsAt.toISOString(),
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

    try {
      if (!verifyWebhookSignature(rawBody, signature)) {
        return reply.status(401).send({ error: 'Invalid webhook signature' })
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Webhook signature verification failed')
      return reply.status(500).send({ error: 'Webhook verification not configured' })
    }

    const event = request.body
    logger.info({ event: event.event }, 'Paystack webhook received')

    switch (event.event) {
      case 'subscription.create': {
        const sub = event.data
        const [org] = await db.select().from(organizations)
          .where(eq(organizations.paystackSubscriptionCode, sub.subscription_code))
          .limit(1)
        if (org) {
          await auditAction({
            orgId: org.id,
            action: 'billing.webhook.subscription_create',
            metadata: {
              subscriptionCode: sub.subscription_code,
              plan: sub.plan?.plan_code,
              status: sub.status
            }
          })
        }
        logger.info({ code: sub.subscription_code, orgId: org?.id }, 'Subscription created')
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
            await auditAction({
              orgId: org.id,
              action: 'billing.webhook.charge_success',
              metadata: {
                amount: charge.amount,
                currency: charge.currency,
                reference: charge.reference,
                customerCode
              }
            })
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

          await auditAction({
            orgId: org.id,
            action: 'billing.webhook.subscription_disable',
            metadata: {
              subscriptionCode: sub.subscription_code,
              status: sub.status
            }
          })
          logger.info({ orgId: org.id }, 'Subscription disabled via webhook')
        }
        break
      }

      case 'subscription.not_renew': {
        const sub = event.data
        const [org] = await db.select().from(organizations)
          .where(eq(organizations.paystackSubscriptionCode, sub.subscription_code))
          .limit(1)
        if (org) {
          await auditAction({
            orgId: org.id,
            action: 'billing.webhook.subscription_not_renew',
            metadata: { subscriptionCode: sub.subscription_code }
          })
        }
        logger.info({ code: sub.subscription_code, orgId: org?.id }, 'Subscription will not renew')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data
        const customerCode = invoice.customer?.customer_code
        if (customerCode) {
          const [org] = await db.select().from(organizations)
            .where(eq(organizations.paystackCustomerCode, customerCode))
            .limit(1)
          if (org) {
            await auditAction({
              orgId: org.id,
              action: 'billing.webhook.payment_failed',
              metadata: {
                amount: invoice.amount,
                customerCode,
                subscriptionCode: invoice.subscription?.subscription_code
              }
            })
          }
        }
        logger.warn({ customer: invoice.customer?.customer_code }, 'Payment failed')
        break
      }

      default:
        logger.info({ event: event.event }, 'Unhandled Paystack webhook event')
    }

    return reply.send({ received: true })
  })
}
