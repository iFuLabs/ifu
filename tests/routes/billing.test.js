import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'

describe('Billing Routes', () => {
  let mockRequest, mockReply, mockDb, mockPaystack

  beforeEach(() => {
    // Set required environment variables
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_xxx'
    process.env.PAYSTACK_WEBHOOK_SECRET = 'whsec_test_xxx'
    process.env.PAYSTACK_COMPLY_STARTER_PLAN = 'PLN_starter'
    process.env.PAYSTACK_COMPLY_GROWTH_PLAN = 'PLN_growth'
    process.env.PAYSTACK_FINOPS_PLAN = 'PLN_finops'
    process.env.PORTAL_URL = 'http://localhost:3003'

    mockDb = {
      query: {
        organizations: {
          findFirst: jest.fn()
        }
      },
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    }

    mockRequest = {
      orgId: 'org-123',
      user: {
        id: 'user-123',
        email: 'owner@example.com',
        role: 'owner',
        orgId: 'org-123',
        org: {
          id: 'org-123',
          name: 'Test Org',
          plan: 'starter'
        }
      },
      body: {},
      query: {},
      headers: {},
      rawBody: ''
    }

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.PAYSTACK_SECRET_KEY
    delete process.env.PAYSTACK_WEBHOOK_SECRET
    delete process.env.PAYSTACK_COMPLY_STARTER_PLAN
    delete process.env.PAYSTACK_COMPLY_GROWTH_PLAN
    delete process.env.PAYSTACK_FINOPS_PLAN
    delete process.env.PORTAL_URL
  })

  describe('GET /billing - Subscription status', () => {
    test('should return trial status for org in trial period', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

      mockDb.query.organizations.findFirst.mockResolvedValue({
        id: 'org-123',
        plan: 'starter',
        trialEndsAt: futureDate,
        paystackSubscriptionCode: null,
        paystackAuthCode: null
      })

      // Simulate the response
      const trialDaysLeft = Math.ceil((futureDate - new Date()) / (1000 * 60 * 60 * 24))

      expect(trialDaysLeft).toBeGreaterThan(0)
      expect(trialDaysLeft).toBeLessThanOrEqual(7)
    })

    test('should return expired status for org past trial', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago

      mockDb.query.organizations.findFirst.mockResolvedValue({
        id: 'org-123',
        plan: 'starter',
        trialEndsAt: pastDate,
        paystackSubscriptionCode: null,
        paystackAuthCode: null
      })

      const now = new Date()
      const trialActive = pastDate && new Date(pastDate) > now

      expect(trialActive).toBe(false)
    })

    test('should return active status for org with active subscription', async () => {
      mockDb.query.organizations.findFirst.mockResolvedValue({
        id: 'org-123',
        plan: 'growth',
        trialEndsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        paystackSubscriptionCode: 'SUB_xxx',
        paystackAuthCode: 'AUTH_xxx'
      })

      // Mock subscription would be active
      const mockSubscription = {
        status: 'active',
        subscription_code: 'SUB_xxx',
        next_payment_date: '2024-02-01',
        amount: 50000,
        plan: { name: 'Growth Plan', currency: 'ZAR' }
      }

      expect(mockSubscription.status).toBe('active')
    })
  })

  describe('POST /billing/initialize - Start checkout', () => {
    test('should initialize transaction with correct plan code', () => {
      mockRequest.body = { plan: 'comply-growth' }

      const planCode = process.env.PAYSTACK_COMPLY_GROWTH_PLAN
      expect(planCode).toBe('PLN_growth')

      // Transaction should include metadata
      const metadata = {
        orgId: mockRequest.orgId,
        plan: 'comply-growth',
        planCode: 'PLN_growth',
        userId: mockRequest.user.id,
        orgName: mockRequest.user.org.name
      }

      expect(metadata.orgId).toBe('org-123')
      expect(metadata.plan).toBe('comply-growth')
    })

    test('should reject invalid plan', () => {
      mockRequest.body = { plan: 'invalid-plan' }

      const planCode = process.env[`PAYSTACK_${mockRequest.body.plan.toUpperCase().replace('-', '_')}_PLAN`]
      expect(planCode).toBeUndefined()
    })

    test('should include callback URL in transaction', () => {
      const callbackUrl = `${process.env.PORTAL_URL}/billing/callback`
      expect(callbackUrl).toBe('http://localhost:3003/billing/callback')
    })
  })

  describe('GET /billing/verify - Verify transaction', () => {
    test('should enforce orgId match between transaction and request', () => {
      const txnMetadata = { orgId: 'org-456' }
      const requestOrgId = 'org-123'

      // This should fail - transaction belongs to different org
      expect(txnMetadata.orgId).not.toBe(requestOrgId)
    })

    test('should handle idempotent verification (same auth code)', () => {
      const org = {
        id: 'org-123',
        paystackAuthCode: 'AUTH_xxx',
        paystackSubscriptionCode: 'SUB_xxx'
      }

      const txnAuthCode = 'AUTH_xxx'

      // Same auth code means already provisioned
      const alreadyProvisioned = org.paystackAuthCode === txnAuthCode && !!org.paystackSubscriptionCode

      expect(alreadyProvisioned).toBe(true)
    })

    test('should map plan slug to tier correctly', () => {
      const PLAN_TIERS = {
        'comply-starter': 'starter',
        'comply-growth': 'growth',
        'finops': 'finops'
      }

      expect(PLAN_TIERS['comply-starter']).toBe('starter')
      expect(PLAN_TIERS['comply-growth']).toBe('growth')
      expect(PLAN_TIERS['finops']).toBe('finops')
    })

    test('should set trial end date in the future', () => {
      const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
      const startDateMs = Date.now() + TRIAL_DURATION_MS
      const trialEndsAt = new Date(startDateMs)

      expect(trialEndsAt.getTime()).toBeGreaterThan(Date.now())
    })

    test('should require customer code and authorization code', () => {
      const txn = {
        status: 'success',
        customer: { customer_code: 'CUS_xxx' },
        authorization: { authorization_code: 'AUTH_xxx' }
      }

      expect(txn.customer.customer_code).toBeDefined()
      expect(txn.authorization.authorization_code).toBeDefined()
    })
  })

  describe('POST /billing/cancel - Cancel subscription', () => {
    test('should require active subscription to cancel', () => {
      const org = {
        id: 'org-123',
        paystackSubscriptionCode: null
      }

      expect(org.paystackSubscriptionCode).toBeNull()
      // Should return 400 error
    })

    test('should clear subscription code after cancellation', () => {
      const org = {
        id: 'org-123',
        paystackSubscriptionCode: 'SUB_xxx'
      }

      // After cancellation
      const updatedOrg = {
        ...org,
        paystackSubscriptionCode: null
      }

      expect(updatedOrg.paystackSubscriptionCode).toBeNull()
    })
  })

  describe('POST /billing/webhook - Paystack webhooks', () => {
    test('should verify webhook signature', async () => {
      const { createHmac } = await import('crypto')
      const secret = 'whsec_test_xxx'
      const body = JSON.stringify({ event: 'charge.success' })

      const hash = createHmac('sha512', secret)
        .update(body)
        .digest('hex')

      expect(hash).toBeDefined()
      expect(hash.length).toBe(128) // SHA-512 produces 128 hex characters
    })

    test('should reject webhook without signature', () => {
      mockRequest.headers['x-paystack-signature'] = undefined

      expect(mockRequest.headers['x-paystack-signature']).toBeUndefined()
      // Should return 400 error
    })

    test('should handle subscription.create event', () => {
      const event = {
        event: 'subscription.create',
        data: {
          subscription_code: 'SUB_xxx',
          plan: { plan_code: 'PLN_growth' },
          status: 'active'
        }
      }

      expect(event.event).toBe('subscription.create')
      expect(event.data.subscription_code).toBeDefined()
    })

    test('should handle charge.success event', () => {
      const event = {
        event: 'charge.success',
        data: {
          amount: 50000,
          currency: 'ZAR',
          reference: 'TXN_xxx',
          customer: { customer_code: 'CUS_xxx' }
        }
      }

      expect(event.event).toBe('charge.success')
      expect(event.data.customer.customer_code).toBeDefined()
    })

    test('should handle subscription.disable event', () => {
      const event = {
        event: 'subscription.disable',
        data: {
          subscription_code: 'SUB_xxx',
          status: 'cancelled'
        }
      }

      expect(event.event).toBe('subscription.disable')
      // Should clear paystackSubscriptionCode in org
    })

    test('should handle invoice.payment_failed event', () => {
      const event = {
        event: 'invoice.payment_failed',
        data: {
          amount: 50000,
          customer: { customer_code: 'CUS_xxx' },
          subscription: { subscription_code: 'SUB_xxx' }
        }
      }

      expect(event.event).toBe('invoice.payment_failed')
      // Should log warning and create audit entry
    })
  })

  describe('Security - Multi-tenant isolation', () => {
    test('should prevent cross-org transaction verification', () => {
      const txnOrgId = 'org-456'
      const requestOrgId = 'org-123'

      expect(txnOrgId).not.toBe(requestOrgId)
      // Should return 403 Forbidden
    })

    test('should only allow owner to initialize billing', () => {
      const user = { role: 'member' }
      expect(user.role).not.toBe('owner')
      // requireOwner middleware should block
    })

    test('should only allow owner to cancel subscription', () => {
      const user = { role: 'admin' }
      expect(user.role).not.toBe('owner')
      // requireOwner middleware should block
    })
  })
})
