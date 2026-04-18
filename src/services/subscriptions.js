import { db } from '../db/client.js'
import { subscriptions } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

/**
 * Check if an organization has an active subscription for a product
 * @param {string} orgId - Organization ID
 * @param {string} product - Product name ('comply' | 'finops')
 * @returns {Promise<boolean>}
 */
export async function hasActiveSubscription(orgId, product) {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.orgId, orgId),
      eq(subscriptions.product, product)
    )
  })

  if (!subscription) return false

  // Check if subscription is active or trialing
  if (subscription.status === 'active') return true
  
  if (subscription.status === 'trialing' && subscription.trialEndsAt) {
    return new Date(subscription.trialEndsAt) > new Date()
  }

  return false
}

/**
 * Get all active subscriptions for an organization
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>}
 */
export async function getActiveSubscriptions(orgId) {
  const subs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.orgId, orgId)
  })

  const now = new Date()
  
  return subs.filter(sub => {
    if (sub.status === 'active') return true
    if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) > now) return true
    return false
  })
}

/**
 * Get subscription for a specific product
 * @param {string} orgId - Organization ID
 * @param {string} product - Product name ('comply' | 'finops')
 * @returns {Promise<Object|null>}
 */
export async function getSubscription(orgId, product) {
  return await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.orgId, orgId),
      eq(subscriptions.product, product)
    )
  })
}

/**
 * Create or update a subscription
 * @param {Object} data - Subscription data
 * @returns {Promise<Object>}
 */
export async function upsertSubscription(data) {
  const { orgId, product, plan, status, paystackSubscriptionCode, paystackPlanCode, trialEndsAt } = data

  // Check if subscription already exists
  const existing = await getSubscription(orgId, product)

  if (existing) {
    // Update existing subscription
    const [updated] = await db
      .update(subscriptions)
      .set({
        plan,
        status,
        paystackSubscriptionCode,
        paystackPlanCode,
        trialEndsAt,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existing.id))
      .returning()
    
    return updated
  } else {
    // Create new subscription
    const [created] = await db
      .insert(subscriptions)
      .values({
        orgId,
        product,
        plan,
        status,
        paystackSubscriptionCode,
        paystackPlanCode,
        trialEndsAt
      })
      .returning()
    
    return created
  }
}

/**
 * Cancel a subscription
 * @param {string} orgId - Organization ID
 * @param {string} product - Product name
 * @returns {Promise<Object>}
 */
export async function cancelSubscription(orgId, product) {
  const subscription = await getSubscription(orgId, product)
  
  if (!subscription) {
    throw new Error('Subscription not found')
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      updatedAt: new Date()
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning()
  
  return updated
}
