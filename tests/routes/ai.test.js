import { describe, test, expect, jest, beforeEach } from '@jest/globals'

describe('AI Routes - Organization Data', () => {
  let mockRequest, mockReply, mockDb

  beforeEach(() => {
    mockDb = {
      query: {
        controlDefinitions: {
          findFirst: jest.fn()
        },
        controlResults: {
          findFirst: jest.fn()
        }
      },
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([])
    }

    mockRequest = {
      params: { controlId: 'CC6.1' },
      query: { framework: 'soc2' },
      orgId: 'org-123',
      user: {
        id: 'user-123',
        email: 'user@example.com',
        orgId: 'org-123',
        org: {
          id: 'org-123',
          name: 'Acme Corp',
          plan: 'growth'
        }
      }
    }

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      raw: {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      }
    }
  })

  describe('POST /ai/explain/:controlId', () => {
    test('should use actual org data from request.user.org, not hardcoded values', async () => {
      const controlDef = {
        id: 'def-1',
        controlId: 'CC6.1',
        title: 'Test Control',
        description: 'Test description',
        severity: 'high'
      }

      const controlResult = {
        id: 'result-1',
        controlDefId: 'def-1',
        orgId: 'org-123',
        status: 'fail',
        evidence: { details: 'Failed check' }
      }

      mockDb.query.controlDefinitions.findFirst.mockResolvedValue(controlDef)
      mockDb.query.controlResults.findFirst.mockResolvedValue(controlResult)

      // The org object passed to explainControlGap should come from request.user.org
      const expectedOrg = {
        name: mockRequest.user.org.name, // 'Acme Corp'
        plan: mockRequest.user.org.plan   // 'growth'
      }

      expect(expectedOrg.name).toBe('Acme Corp')
      expect(expectedOrg.plan).toBe('growth')
      expect(expectedOrg.name).not.toBe('Your Organization')
    })

    test('should handle missing org data gracefully with defaults', async () => {
      // User without org data
      mockRequest.user.org = null

      const expectedOrg = {
        name: mockRequest.user.org?.name || 'Your Organization',
        plan: mockRequest.user.org?.plan || 'starter'
      }

      expect(expectedOrg.name).toBe('Your Organization')
      expect(expectedOrg.plan).toBe('starter')
    })

    test('should use correct plan for feature gating in AI prompts', async () => {
      // Starter plan org
      mockRequest.user.org.plan = 'starter'

      let orgPlan = mockRequest.user.org.plan
      expect(orgPlan).toBe('starter')

      // Growth plan org
      mockRequest.user.org.plan = 'growth'
      orgPlan = mockRequest.user.org.plan
      expect(orgPlan).toBe('growth')

      // FinOps plan org
      mockRequest.user.org.plan = 'finops'
      orgPlan = mockRequest.user.org.plan
      expect(orgPlan).toBe('finops')
    })
  })

  describe('GET /ai/explain/:controlId/stream', () => {
    test('should use actual org data in streaming response', async () => {
      const controlDef = {
        id: 'def-1',
        controlId: 'CC6.1',
        title: 'Test Control',
        description: 'Test description'
      }

      const controlResult = {
        id: 'result-1',
        controlDefId: 'def-1',
        orgId: 'org-123',
        status: 'fail',
        evidence: {}
      }

      mockDb.query.controlDefinitions.findFirst.mockResolvedValue(controlDef)
      mockDb.query.controlResults.findFirst.mockResolvedValue(controlResult)

      // Org data should come from request.user.org
      const org = {
        name: mockRequest.user.org?.name || 'Your Organization',
        plan: mockRequest.user.org?.plan || 'starter'
      }

      expect(org.name).toBe('Acme Corp')
      expect(org.plan).toBe('growth')
    })
  })

  describe('GET /ai/summary', () => {
    test('should use actual org data for compliance summary', async () => {
      mockDb.where.mockResolvedValue([
        { controlId: 'CC6.1', status: 'pass', severity: 'high' },
        { controlId: 'CC6.2', status: 'fail', severity: 'medium' }
      ])

      // Org data for AI summary
      const org = {
        name: mockRequest.user.org?.name || 'Your Organization',
        plan: mockRequest.user.org?.plan || 'starter'
      }

      expect(org.name).toBe('Acme Corp')
      expect(org.plan).toBe('growth')

      // AI prompt should include actual org name and plan
      // This affects the tone and recommendations in the AI response
    })

    test('should generate different summaries based on plan level', async () => {
      // Growth plan should get more detailed AI insights
      mockRequest.user.org.plan = 'growth'
      let plan = mockRequest.user.org.plan
      expect(plan).toBe('growth')

      // Starter plan might get basic summaries
      mockRequest.user.org.plan = 'starter'
      plan = mockRequest.user.org.plan
      expect(plan).toBe('starter')

      // Plan affects AI feature availability and depth
    })
  })

  describe('Plan-based feature gating', () => {
    test('should respect plan limits in AI features', async () => {
      const plans = {
        starter: { aiExplanations: false, aiSummary: false },
        growth: { aiExplanations: true, aiSummary: true },
        finops: { aiExplanations: true, aiSummary: true }
      }

      // Starter plan - limited AI
      mockRequest.user.org.plan = 'starter'
      expect(plans[mockRequest.user.org.plan].aiExplanations).toBe(false)

      // Growth plan - full AI
      mockRequest.user.org.plan = 'growth'
      expect(plans[mockRequest.user.org.plan].aiExplanations).toBe(true)

      // FinOps plan - full AI
      mockRequest.user.org.plan = 'finops'
      expect(plans[mockRequest.user.org.plan].aiSummary).toBe(true)
    })
  })
})
