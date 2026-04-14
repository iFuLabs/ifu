// Plan-based feature gating middleware

const PLAN_FEATURES = {
  starter: {
    frameworks: ['soc2'],
    aiFeatures: false,
    maxTeamMembers: 3,
    regulatoryAlerts: false
  },
  growth: {
    frameworks: ['soc2', 'iso27001', 'gdpr', 'hipaa'],
    aiFeatures: true,
    maxTeamMembers: null, // unlimited
    regulatoryAlerts: true
  },
  finops: {
    frameworks: [],
    aiFeatures: false,
    maxTeamMembers: null,
    regulatoryAlerts: false
  }
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

// Middleware: require AI features (Growth plan only)
async function requireAiFeatures(request, reply) {
  if (!request.user?.org) {
    return reply.status(403).send({ 
      error: 'Forbidden', 
      message: 'Organization required' 
    })
  }

  const plan = request.user.org.plan || 'starter'
  
  if (!hasFeature(plan, 'aiFeatures')) {
    return reply.status(403).send({
      error: 'Upgrade Required',
      message: 'AI features are only available on the Growth plan',
      code: 'PLAN_UPGRADE_REQUIRED',
      requiredPlan: 'growth',
      currentPlan: plan
    })
  }
}

// Middleware: check framework access
async function requireFramework(framework) {
  return async function(request, reply) {
    if (!request.user?.org) {
      return reply.status(403).send({ 
        error: 'Forbidden', 
        message: 'Organization required' 
      })
    }

    const plan = request.user.org.plan || 'starter'
    
    if (!hasFramework(plan, framework)) {
      return reply.status(403).send({
        error: 'Upgrade Required',
        message: `${framework.toUpperCase()} framework is only available on the Growth plan`,
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'growth',
        currentPlan: plan
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

export {
  PLAN_FEATURES,
  hasFeature,
  hasFramework,
  requireAiFeatures,
  requireFramework,
  getAllowedFrameworks,
  getMaxTeamMembers
}
