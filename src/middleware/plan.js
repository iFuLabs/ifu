// Plan-based feature gating middleware
import { db } from '../db/client.js'
import { subscriptions } from '../db/schema.js'
import { eq, and, or } from 'drizzle-orm'
import { PAST_DUE_GRACE_MS } from '../services/config.js'

const PLAN_FEATURES = {
  starter: {
    frameworks: ['soc2'],
    aiFeatures: false,
    maxTeamMembers: 3,
    regulatoryAlerts: false,
    kubernetes: false,
    customDateRanges: false,
    anomalyDetection: false,
    slackIntegration: false,
    csvExport: false,
    dailyScans: false,
    vendorRisk: false,
  },
  growth: {
    frameworks: ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'],
    aiFeatures: true,
    maxTeamMembers: null, // unlimited
    regulatoryAlerts: true,
    kubernetes: true,
    customDateRanges: true,
    anomalyDetection: true,
    slackIntegration: true,
    csvExport: true,
    dailyScans: true,
    vendorRisk: true,
  },
  scale: {
    frameworks: ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss'],
    aiFeatures: true,
    maxTeamMembers: null,
    regulatoryAlerts: true,
    kubernetes: true,
    customDateRanges: true,
    anomalyDetection: true,
    slackIntegration: true,
    csvExport: true,
    dailyScans: true,
    vendorRisk: true,
    customFrameworks: true,
    multiAccount: true,
    sso: true,
    auditorRole: true,
    focusExport: true,
  },
  // Legacy: old FinOps-only plan (maps to growth-tier cost features)
  finops: {
    frameworks: [],
    aiFeatures: false,
    maxTeamMembers: null,
    regulatoryAlerts: false,
    kubernetes: false,
    customDateRanges: true,
    anomalyDetection: true,
    slackIntegration: true,
    csvExport: true,
    dailyScans: true,
    vendorRisk: false,
  },
}

/**
 * Resolve product entitlements for an organization.
 * Returns which engines the org has access to and at what tier.
 *
 * @param {string} orgId
 * @returns {Promise<{ compliance: string|null, cost: string|null, tier: string|null }>}
 */
export async function productEntitlements(orgId) {
  const now = new Date()

  // Get all active/trialing subscriptions for this org
  const subs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.orgId, orgId),
  })

  const activeSubs = subs.filter(sub => {
    if (sub.status === 'active') return true
    if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) > now) return true
    // Past-due grace: keep access for PAST_DUE_GRACE_MS after the row went past_due.
    // This gives the customer a window to fix their card without instantly losing access.
    if (sub.status === 'past_due' && sub.pastDueAt && (now - new Date(sub.pastDueAt)) < PAST_DUE_GRACE_MS) return true
    return false
  })

  if (activeSubs.length === 0) {
    return { compliance: null, cost: null, tier: null }
  }

  let compliance = null
  let cost = null
  let highestTier = null

  const tierRank = { starter: 1, growth: 2, scale: 3 }

  for (const sub of activeSubs) {
    // During trial, always grant Growth-tier access regardless of selectedTier
    const effectiveTier = (sub.status === 'trialing') ? 'growth' : (sub.tier || _inferTier(sub.plan))
    const tier = effectiveTier
    const rank = tierRank[tier] || 0

    // Ghara plans grant both engines
    if (sub.product === 'ghara') {
      if (!highestTier || rank > (tierRank[highestTier] || 0)) highestTier = tier
      if (!compliance || rank > (tierRank[compliance] || 0)) compliance = tier
      if (!cost || rank > (tierRank[cost] || 0)) cost = tier
    }
    // Legacy comply subscription
    else if (sub.product === 'comply') {
      if (!compliance || rank > (tierRank[compliance] || 0)) compliance = tier
      if (!highestTier || rank > (tierRank[highestTier] || 0)) highestTier = tier
    }
    // Legacy finops subscription
    else if (sub.product === 'finops') {
      if (!cost || rank > (tierRank[cost] || 0)) cost = tier
      if (!highestTier || rank > (tierRank[highestTier] || 0)) highestTier = tier
    }

    // Also check the products JSONB array for explicit grants
    if (Array.isArray(sub.products) && sub.products.length > 0) {
      if (sub.products.includes('compliance')) {
        if (!compliance || rank > (tierRank[compliance] || 0)) compliance = tier
      }
      if (sub.products.includes('cost')) {
        if (!cost || rank > (tierRank[cost] || 0)) cost = tier
      }
    }
  }

  return { compliance, cost, tier: highestTier }
}

/**
 * Infer tier from legacy plan column values.
 */
function _inferTier(plan) {
  if (!plan) return 'starter'
  if (plan.includes('scale')) return 'scale'
  if (plan.includes('growth') || plan === 'finops') return 'growth'
  return 'starter'
}

// Check if org has access to a specific feature
function hasFeature(plan, feature) {
  const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter
  return planConfig[feature]
}

// Check if org has access to a framework
function hasFramework(plan, framework) {
  const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter
  return planConfig.frameworks.includes(framework)
}

// Middleware: require AI features (Growth plan or higher).
// Sources entitlements from the subscriptions table via productEntitlements
// so Ghara trial users (org.plan='starter' but Growth-tier subscription)
// correctly get AI access.
async function requireAiFeatures(request, reply) {
  if (!request.user?.org) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Organization required'
    })
  }

  const entitlements = await productEntitlements(request.orgId)
  const tier = entitlements.tier

  if (tier !== 'growth' && tier !== 'scale') {
    return reply.status(403).send({
      error: 'Upgrade Required',
      message: 'AI features are only available on the Growth plan or higher',
      code: 'PLAN_UPGRADE_REQUIRED',
      requiredPlan: 'growth',
      currentTier: tier
    })
  }
}

// Middleware: check framework access.
// SOC 2 is available on every paid tier. ISO 27001, GDPR, HIPAA, PCI DSS
// require Growth+ in compliance entitlements.
// NOTE: this is a middleware factory — calling requireFramework('iso27001')
// returns a middleware function. It must NOT be async at the outer level,
// otherwise Fastify treats the returned Promise as the handler.
function requireFramework(framework) {
  return async function(request, reply) {
    if (!request.user?.org) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Organization required'
      })
    }

    const entitlements = await productEntitlements(request.orgId)
    const complianceTier = entitlements.compliance

    if (!complianceTier) {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `${framework.toUpperCase()} requires an active compliance subscription`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'starter',
        currentTier: null
      })
    }

    // SOC 2 is on every tier; everything else needs growth or scale.
    if (framework !== 'soc2' && complianceTier === 'starter') {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `${framework.toUpperCase()} framework is only available on the Growth plan or higher`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'growth',
        currentTier: complianceTier
      })
    }
  }
}

// Get allowed frameworks for a plan
function getAllowedFrameworks(plan) {
  const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter
  return planConfig.frameworks
}

// Get max team members for a plan
function getMaxTeamMembers(plan) {
  const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter
  return planConfig.maxTeamMembers
}

/**
 * Middleware: require a specific product entitlement.
 * Usage: requireProduct('compliance') or requireProduct('cost')
 */
function requireProduct(product) {
  return async function(request, reply) {
    if (!request.user?.org) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Organization required'
      })
    }

    const entitlements = await productEntitlements(request.orgId)
    const entitled = product === 'compliance' ? entitlements.compliance : entitlements.cost

    if (!entitled) {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `Access to ${product} requires an active subscription`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'ghara_starter',
        currentPlan: request.user.org.plan
      })
    }
  }
}

/**
 * Middleware: require a minimum tier for a feature.
 * Usage: requireTier('growth') — blocks starter-tier users.
 */
function requireTier(minTier) {
  const tierRank = { starter: 1, growth: 2, scale: 3 }
  const minRank = tierRank[minTier] || 1

  return async function(request, reply) {
    if (!request.user?.org) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Organization required'
      })
    }

    const entitlements = await productEntitlements(request.orgId)
    const currentRank = tierRank[entitlements.tier] || 0

    if (currentRank < minRank) {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `This feature requires the ${minTier} plan or higher`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: `ghara_${minTier}`,
        currentTier: entitlements.tier
      })
    }
  }
}

export {
  PLAN_FEATURES,
  hasFeature,
  hasFramework,
  requireAiFeatures,
  requireFramework,
  getAllowedFrameworks,
  getMaxTeamMembers,
  requireProduct,
  requireTier,
}
