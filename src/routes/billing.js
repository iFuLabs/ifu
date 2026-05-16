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
  chargeAuthorization,
  getPlan,
  verifyWebhookSignature
} from '../services/paystack.js'
import { upsertSubscription } from '../services/subscriptions.js'
import { logger } from '../services/logger.js'
import { auditAction } from '../services/audit.js'
import { TRIAL_DURATION_MS } from '../services/config.js'
import { sendChargeReceiptEmail, sendPaymentFailedEmail } from '../services/email.js'
import { users as usersTable } from '../db/schema.js'

const PLAN_MAP = {
  // Legacy per-product plans
  'comply-starter': process.env.PAYSTACK_COMPLY_STARTER_PLAN,
  'comply-growth': process.env.PAYSTACK_COMPLY_GROWTH_PLAN,
  'finops': process.env.PAYSTACK_FINOPS_PLAN,
  // Ghara unified plans
  'ghara-starter': process.env.PAYSTACK_GHARA_STARTER_PLAN,
  'ghara-growth': process.env.PAYSTACK_GHARA_GROWTH_PLAN,
}

const PLAN_NAMES = {
  'comply-starter': 'Comply Starter',
  'comply-growth': 'Comply Growth',
  'finops': 'FinOps',
  'ghara-starter': 'Ghara Starter',
  'ghara-growth': 'Ghara Growth',
}

// Maps the public plan slug to the org-level plan tier stored in the
// `organizations.plan` enum column. Each product has its own tier value so
// downstream code can branch correctly.
const PLAN_TIERS = {
  'comply-starter': 'starter',
  'comply-growth': 'growth',
  'finops': 'finops',
  'ghara-starter': 'starter',
  'ghara-growth': 'growth',
}

// Maps plan to product
const PLAN_TO_PRODUCT = {
  'comply-starter': 'comply',
  'comply-growth': 'comply',
  'finops': 'finops',
  'ghara-starter': 'ghara',
  'ghara-growth': 'ghara',
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
      tier: activeSub?.tier || null,
      selectedTier: activeSub?.selectedTier || null,
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
          plan: { type: 'string', enum: ['comply-starter', 'comply-growth', 'finops', 'ghara-starter', 'ghara-growth'] }
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
    const product = PLAN_TO_PRODUCT[plan] || 'ghara'
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

  // POST /api/v1/billing/charge-now — end trial early by charging the existing
  // tokenized card immediately. Useful for "Pay now" on the billing page.
  fastify.post('/charge-now', {
    preHandler: [verifyToken, requireUser, requireOwner],
    schema: { tags: ['Billing'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, request.orgId)
    })

    if (!org) return reply.status(404).send({ error: 'Organization not found' })

    if (!org.paystackAuthCode || !org.paystackCustomerCode) {
      return reply.status(400).send({
        error: 'No card on file',
        message: 'Add a payment method first'
      })
    }

    // Find the active trialing subscription
    const trialSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptionsTable.orgId, request.orgId),
        eq(subscriptionsTable.status, 'trialing')
      )
    })

    if (!trialSub) {
      return reply.status(400).send({
        error: 'No trial subscription found',
        message: 'Your subscription is not in trial state'
      })
    }

    // Get the Paystack plan to know the amount to charge
    let plan
    try {
      plan = await getPlan(trialSub.paystackPlanCode)
    } catch (err) {
      logger.error({ err: err.message, planCode: trialSub.paystackPlanCode },
        'Failed to fetch Paystack plan for charge-now')
      return reply.status(500).send({ error: 'Failed to fetch plan details' })
    }

    // Charge the authorization for one billing period
    let charge
    try {
      charge = await chargeAuthorization({
        email: request.user.email,
        amount: plan.amount,
        authorizationCode: org.paystackAuthCode,
        currency: plan.currency || 'ZAR',
        metadata: {
          orgId: request.orgId,
          plan: trialSub.plan,
          source: 'charge_now',
          userId: request.user.id
        }
      })
    } catch (err) {
      logger.error({ err: err.message, orgId: request.orgId }, 'charge-now: chargeAuthorization failed')
      return reply.status(502).send({
        error: 'Payment failed',
        message: err.message || 'Could not charge your card'
      })
    }

    if (charge.status !== 'success') {
      logger.warn({ orgId: request.orgId, status: charge.status }, 'charge-now: charge not successful')
      return reply.status(402).send({
        error: 'Payment declined',
        message: charge.gateway_response || 'Your card was declined'
      })
    }

    // Disable the future-dated trial subscription and create a fresh one
    // that bills monthly starting today. This avoids the customer waiting
    // until the original trialEndsAt for their next renewal.
    if (trialSub.paystackSubscriptionCode) {
      try {
        const oldSub = await getSubscription(trialSub.paystackSubscriptionCode)
        await disableSubscription({ code: oldSub.subscription_code, token: oldSub.email_token })
      } catch (err) {
        logger.warn({ err: err.message }, 'charge-now: failed to disable old trial subscription (continuing)')
      }
    }

    let newSubscription
    try {
      const nextStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      newSubscription = await createSubscription({
        customer: org.paystackCustomerCode,
        plan: trialSub.paystackPlanCode,
        authorization: org.paystackAuthCode,
        startDate: nextStart.toISOString()
      })
    } catch (err) {
      logger.error({ err: err.message }, 'charge-now: failed to create renewal subscription')
      // Charge already succeeded, so don't fail the request — webhook will
      // still flip trialing→active. Just log.
    }

    // Flip the subscription row to active immediately. The charge.success
    // webhook will also do this, but doing it here ensures the UI updates
    // right away without waiting for the webhook.
    await db.update(subscriptionsTable)
      .set({
        status: 'active',
        ...(trialSub.selectedTier && trialSub.selectedTier !== trialSub.tier
          ? { tier: trialSub.selectedTier }
          : {}),
        ...(newSubscription?.subscription_code
          ? { paystackSubscriptionCode: newSubscription.subscription_code }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(subscriptionsTable.id, trialSub.id))

    if (newSubscription?.subscription_code) {
      await db.update(organizations)
        .set({
          paystackSubscriptionCode: newSubscription.subscription_code,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, request.orgId))
    }

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'billing.charge_now',
      metadata: {
        plan: trialSub.plan,
        amount: charge.amount,
        currency: charge.currency,
        reference: charge.reference,
        newSubscriptionCode: newSubscription?.subscription_code
      }
    })

    logger.info({
      orgId: request.orgId,
      amount: charge.amount,
      reference: charge.reference
    }, 'Trial ended early via Pay Now')

    return reply.send({
      status: 'success',
      message: 'Payment successful',
      charge: {
        amount: charge.amount,
        currency: charge.currency,
        reference: charge.reference,
        last4: charge.authorization?.last4
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

    await auditAction({
      orgId: request.orgId,
      userId: request.user.id,
      action: 'billing.subscription_cancelled',
      metadata: { subscriptionCode: sub.subscription_code }
    })

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

    // Idempotency: skip if we've already processed this event
    const eventId = event.data?.id?.toString() || `${event.event}-${Date.now()}`
    try {
      await db.execute(
        `INSERT INTO paystack_events (id, type, payload) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [eventId, event.event, JSON.stringify(event.data)]
      )
    } catch (dedupErr) {
      // If insert fails due to duplicate, we've already processed this event
      if (dedupErr.code === '23505') {
        logger.info({ eventId }, 'Duplicate Paystack event — skipping')
        return reply.send({ received: true, duplicate: true })
      }
    }

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
            // Flip the trialing subscription row to active. This is the moment
            // a customer transitions from "trial" to "paying", and the row was
            // previously stuck in 'trialing' forever.
            const [updated] = await db.update(subscriptionsTable)
              .set({ status: 'active', updatedAt: new Date() })
              .where(and(
                eq(subscriptionsTable.orgId, org.id),
                eq(subscriptionsTable.status, 'trialing')
              ))
              .returning()
            if (updated) {
              // Downgrade tier to selectedTier now that trial is over
              // (e.g., customer picked Starter but had Growth during trial)
              if (updated.selectedTier && updated.selectedTier !== updated.tier) {
                await db.update(subscriptionsTable)
                  .set({ tier: updated.selectedTier, updatedAt: new Date() })
                  .where(eq(subscriptionsTable.id, updated.id))
                logger.info({ orgId: org.id, from: updated.tier, to: updated.selectedTier }, 'Tier downgraded to selectedTier after trial')
              }
              logger.info({ orgId: org.id, subId: updated.id }, 'Subscription flipped to active on first charge')
            }

            // Send receipt to the org owner. Best-effort — don't fail webhook.
            try {
              const owner = await db.query.users.findFirst({
                where: and(eq(usersTable.orgId, org.id), eq(usersTable.role, 'owner'))
              })
              if (owner?.email) {
                let subDetails = null
                if (org.paystackSubscriptionCode) {
                  try { subDetails = await getSubscription(org.paystackSubscriptionCode) } catch {}
                }
                await sendChargeReceiptEmail({
                  to: owner.email,
                  name: owner.name,
                  orgName: org.name,
                  planName: subDetails?.plan?.name || org.plan || 'Subscription',
                  amount: charge.amount,
                  currency: charge.currency || subDetails?.plan?.currency || 'ZAR',
                  reference: charge.reference,
                  nextPaymentDate: subDetails?.next_payment_date,
                  last4: charge.authorization?.last4
                })
              }
            } catch (err) {
              logger.warn({ err: err.message, orgId: org.id }, 'Failed to send charge receipt email')
            }

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
            // Mark subscription as past_due
            await db.update(subscriptionsTable)
              .set({ status: 'past_due', updatedAt: new Date() })
              .where(and(
                eq(subscriptionsTable.orgId, org.id),
                eq(subscriptionsTable.status, 'active')
              ))

            // Email the owner so they can fix the card before Paystack's retries
            // run out and access stops.
            try {
              const owner = await db.query.users.findFirst({
                where: and(eq(usersTable.orgId, org.id), eq(usersTable.role, 'owner'))
              })
              if (owner?.email) {
                let subDetails = null
                if (invoice.subscription?.subscription_code) {
                  try { subDetails = await getSubscription(invoice.subscription.subscription_code) } catch {}
                }
                await sendPaymentFailedEmail({
                  to: owner.email,
                  name: owner.name,
                  orgName: org.name,
                  planName: subDetails?.plan?.name || org.plan || 'Subscription',
                  amount: invoice.amount,
                  currency: invoice.currency || subDetails?.plan?.currency || 'ZAR',
                  last4: subDetails?.authorization?.last4
                })
              }
            } catch (err) {
              logger.warn({ err: err.message, orgId: org.id }, 'Failed to send payment-failed email')
            }

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
