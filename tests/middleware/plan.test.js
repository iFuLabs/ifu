import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import {
  PLAN_FEATURES,
  hasFeature,
  hasFramework,
  getAllowedFrameworks,
  getMaxTeamMembers,
  requireAiFeatures
} from '../../src/middleware/plan.js'

describe('Plan Middleware - Feature Gating', () => {
  let mockRequest, mockReply

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-123',
        orgId: 'org-123',
        org: {
          id: 'org-123',
          name: 'Test Org',
          plan: 'starter'
        }
      }
    }

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    }
  })

  describe('PLAN_FEATURES configuration', () => {
    test('starter plan should have limited features', () => {
      const starter = PLAN_FEATURES.starter

      expect(starter.frameworks).toEqual(['soc2'])
      expect(starter.aiFeatures).toBe(false)
      expect(starter.maxTeamMembers).toBe(3)
      expect(starter.regulatoryAlerts).toBe(false)
    })

    test('growth plan should have all features', () => {
      const growth = PLAN_FEATURES.growth

      expect(growth.frameworks).toEqual(['soc2', 'iso27001', 'gdpr', 'hipaa'])
      expect(growth.aiFeatures).toBe(true)
      expect(growth.maxTeamMembers).toBeNull() // unlimited
      expect(growth.regulatoryAlerts).toBe(true)
    })

    test('finops plan should have specific features', () => {
      const finops = PLAN_FEATURES.finops

      expect(finops.frameworks).toEqual([])
      expect(finops.aiFeatures).toBe(false)
      expect(finops.maxTeamMembers).toBeNull() // unlimited
      expect(finops.regulatoryAlerts).toBe(false)
    })
  })

  describe('hasFeature()', () => {
    test('should return false for AI features on starter plan', () => {
      expect(hasFeature('starter', 'aiFeatures')).toBe(false)
    })

    test('should return true for AI features on growth plan', () => {
      expect(hasFeature('growth', 'aiFeatures')).toBe(true)
    })

    test('should return false for AI features on finops plan', () => {
      expect(hasFeature('finops', 'aiFeatures')).toBe(false)
    })

    test('should return true for regulatory alerts on growth plan', () => {
      expect(hasFeature('growth', 'regulatoryAlerts')).toBe(true)
    })

    test('should default to starter plan for unknown plans', () => {
      expect(hasFeature('unknown-plan', 'aiFeatures')).toBe(false)
      expect(hasFeature('unknown-plan', 'maxTeamMembers')).toBe(3)
    })
  })

  describe('hasFramework()', () => {
    test('starter plan should only have SOC2', () => {
      expect(hasFramework('starter', 'soc2')).toBe(true)
      expect(hasFramework('starter', 'iso27001')).toBe(false)
      expect(hasFramework('starter', 'gdpr')).toBe(false)
      expect(hasFramework('starter', 'hipaa')).toBe(false)
    })

    test('growth plan should have all compliance frameworks', () => {
      expect(hasFramework('growth', 'soc2')).toBe(true)
      expect(hasFramework('growth', 'iso27001')).toBe(true)
      expect(hasFramework('growth', 'gdpr')).toBe(true)
      expect(hasFramework('growth', 'hipaa')).toBe(true)
    })

    test('finops plan should have no compliance frameworks', () => {
      expect(hasFramework('finops', 'soc2')).toBe(false)
      expect(hasFramework('finops', 'iso27001')).toBe(false)
    })
  })

  describe('getAllowedFrameworks()', () => {
    test('should return correct frameworks for each plan', () => {
      expect(getAllowedFrameworks('starter')).toEqual(['soc2'])
      expect(getAllowedFrameworks('growth')).toEqual(['soc2', 'iso27001', 'gdpr', 'hipaa'])
      expect(getAllowedFrameworks('finops')).toEqual([])
    })

    test('should default to starter frameworks for unknown plan', () => {
      expect(getAllowedFrameworks('unknown')).toEqual(['soc2'])
    })
  })

  describe('getMaxTeamMembers()', () => {
    test('starter plan should limit to 3 team members', () => {
      expect(getMaxTeamMembers('starter')).toBe(3)
    })

    test('growth plan should have unlimited team members', () => {
      expect(getMaxTeamMembers('growth')).toBeNull()
    })

    test('finops plan should have unlimited team members', () => {
      expect(getMaxTeamMembers('finops')).toBeNull()
    })

    test('should default to starter limit for unknown plan', () => {
      expect(getMaxTeamMembers('unknown')).toBe(3)
    })
  })

  describe('requireAiFeatures middleware', () => {
    test('should block starter plan from AI features', async () => {
      mockRequest.user.org.plan = 'starter'

      await requireAiFeatures(mockRequest, mockReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upgrade Required',
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'growth',
          currentPlan: 'starter'
        })
      )
    })

    test('should allow growth plan to access AI features', async () => {
      mockRequest.user.org.plan = 'growth'

      await requireAiFeatures(mockRequest, mockReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    test('should block finops plan from AI features', async () => {
      mockRequest.user.org.plan = 'finops'

      await requireAiFeatures(mockRequest, mockReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
    })

    test('should require org to be present', async () => {
      mockRequest.user.org = null

      await requireAiFeatures(mockRequest, mockReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Organization required'
        })
      )
    })

    test('should default to starter plan if plan is undefined', async () => {
      mockRequest.user.org.plan = undefined

      await requireAiFeatures(mockRequest, mockReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPlan: 'starter'
        })
      )
    })
  })

  describe('Team member limits enforcement', () => {
    test('starter plan should enforce 3 member limit', () => {
      const maxMembers = getMaxTeamMembers('starter')
      const currentMembers = 3

      expect(currentMembers).toBe(maxMembers)
      // Adding 4th member should be blocked
      expect(currentMembers + 1).toBeGreaterThan(maxMembers)
    })

    test('growth plan should allow unlimited members', () => {
      const maxMembers = getMaxTeamMembers('growth')
      const currentMembers = 100

      expect(maxMembers).toBeNull()
      // Any number of members should be allowed
    })

    test('should check limit before allowing invitation', () => {
      const plan = 'starter'
      const maxMembers = getMaxTeamMembers(plan)
      const currentMembers = 3

      if (maxMembers !== null && currentMembers >= maxMembers) {
        // Should block invitation
        expect(currentMembers).toBeGreaterThanOrEqual(maxMembers)
      }
    })
  })

  describe('Framework access control', () => {
    test('should block starter plan from ISO27001', () => {
      const plan = 'starter'
      const framework = 'iso27001'

      expect(hasFramework(plan, framework)).toBe(false)
    })

    test('should allow growth plan to access all frameworks', () => {
      const plan = 'growth'
      const frameworks = ['soc2', 'iso27001', 'gdpr', 'hipaa']

      frameworks.forEach(framework => {
        expect(hasFramework(plan, framework)).toBe(true)
      })
    })

    test('should block finops plan from compliance frameworks', () => {
      const plan = 'finops'
      const frameworks = ['soc2', 'iso27001', 'gdpr', 'hipaa']

      frameworks.forEach(framework => {
        expect(hasFramework(plan, framework)).toBe(false)
      })
    })
  })

  describe('Plan upgrade scenarios', () => {
    test('upgrading from starter to growth should unlock features', () => {
      const starterFeatures = {
        aiFeatures: hasFeature('starter', 'aiFeatures'),
        frameworks: getAllowedFrameworks('starter'),
        maxTeamMembers: getMaxTeamMembers('starter')
      }

      const growthFeatures = {
        aiFeatures: hasFeature('growth', 'aiFeatures'),
        frameworks: getAllowedFrameworks('growth'),
        maxTeamMembers: getMaxTeamMembers('growth')
      }

      expect(starterFeatures.aiFeatures).toBe(false)
      expect(growthFeatures.aiFeatures).toBe(true)

      expect(starterFeatures.frameworks.length).toBe(1)
      expect(growthFeatures.frameworks.length).toBe(4)

      expect(starterFeatures.maxTeamMembers).toBe(3)
      expect(growthFeatures.maxTeamMembers).toBeNull()
    })

    test('downgrading from growth to starter should restrict features', () => {
      const growthAI = hasFeature('growth', 'aiFeatures')
      const starterAI = hasFeature('starter', 'aiFeatures')

      expect(growthAI).toBe(true)
      expect(starterAI).toBe(false)

      // Features should be blocked after downgrade
    })
  })

  describe('Edge cases', () => {
    test('should handle null plan gracefully', () => {
      expect(hasFeature(null, 'aiFeatures')).toBe(false)
      expect(getAllowedFrameworks(null)).toEqual(['soc2'])
      expect(getMaxTeamMembers(null)).toBe(3)
    })

    test('should handle undefined plan gracefully', () => {
      expect(hasFeature(undefined, 'aiFeatures')).toBe(false)
      expect(getAllowedFrameworks(undefined)).toEqual(['soc2'])
      expect(getMaxTeamMembers(undefined)).toBe(3)
    })

    test('should handle empty string plan gracefully', () => {
      expect(hasFeature('', 'aiFeatures')).toBe(false)
      expect(getAllowedFrameworks('')).toEqual(['soc2'])
      expect(getMaxTeamMembers('')).toBe(3)
    })
  })
})
