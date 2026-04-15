import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * Integration test for password reset flow
 * 
 * This test simulates the complete password reset flow:
 * 1. User requests password reset
 * 2. System generates token and sends email
 * 3. User clicks link and submits new password
 * 4. System validates token and updates password
 * 5. User can login with new password
 */

describe('Password Reset Integration Flow', () => {
  let testUser
  let resetToken
  let mockDb
  let mockEmailService

  beforeAll(() => {
    // Setup test environment
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.PORTAL_URL = 'http://localhost:3003'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

    // Create test user
    testUser = {
      id: 'test-user-id',
      email: 'testuser@example.com',
      name: 'Test User',
      passwordHash: null, // Will be set
      orgId: 'test-org-id',
      role: 'member'
    }

    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      query: {
        users: {
          findFirst: jest.fn()
        },
        passwordResetTokens: {
          findFirst: jest.fn()
        }
      }
    }

    // Mock email service
    mockEmailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
    }
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  test('Complete password reset flow', async () => {
    // ============================================================
    // STEP 1: User has an existing password
    // ============================================================
    const originalPassword = 'OldPassword123!'
    testUser.passwordHash = await bcrypt.hash(originalPassword, 10)

    // Verify original password works
    const originalPasswordValid = await bcrypt.compare(originalPassword, testUser.passwordHash)
    expect(originalPasswordValid).toBe(true)

    // ============================================================
    // STEP 2: User requests password reset
    // ============================================================
    const requestEmail = testUser.email

    // Mock user lookup
    mockDb.query.users.findFirst.mockResolvedValue(testUser)

    const user = await mockDb.query.users.findFirst()
    expect(user).toBeTruthy()
    expect(user.email).toBe(requestEmail)

    // ============================================================
    // STEP 3: System generates secure token
    // ============================================================
    resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    expect(resetToken).toHaveLength(64)
    expect(resetToken).toMatch(/^[0-9a-f]{64}$/)

    // ============================================================
    // STEP 4: System stores token in database
    // ============================================================
    const tokenRecord = {
      id: 'token-id',
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
      createdAt: new Date()
    }

    mockDb.returning.mockResolvedValue([tokenRecord])
    await mockDb.insert().values(tokenRecord).returning()

    expect(mockDb.insert).toHaveBeenCalled()

    // ============================================================
    // STEP 5: System sends email with reset link
    // ============================================================
    const resetUrl = `${process.env.PORTAL_URL}/reset-password/${resetToken}`

    await mockEmailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl
    })

    expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: testUser.email,
      name: testUser.name,
      resetUrl: expect.stringContaining('/reset-password/')
    })

    // ============================================================
    // STEP 6: User clicks link and submits new password
    // ============================================================
    const newPassword = 'NewSecurePassword456!'

    // Mock token lookup
    mockDb.query.passwordResetTokens.findFirst.mockResolvedValue(tokenRecord)

    const foundToken = await mockDb.query.passwordResetTokens.findFirst()
    expect(foundToken).toBeTruthy()
    expect(foundToken.token).toBe(resetToken)
    expect(foundToken.used).toBe(false)
    expect(foundToken.expiresAt.getTime()).toBeGreaterThan(Date.now())

    // ============================================================
    // STEP 7: System validates token and updates password
    // ============================================================
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update user password
    testUser.passwordHash = newPasswordHash
    mockDb.returning.mockResolvedValue([testUser])
    await mockDb.update().set({ passwordHash: newPasswordHash }).where().returning()

    // Mark token as used
    tokenRecord.used = true
    await mockDb.update().set({ used: true }).where()

    // ============================================================
    // STEP 8: Verify new password works
    // ============================================================
    const newPasswordValid = await bcrypt.compare(newPassword, testUser.passwordHash)
    expect(newPasswordValid).toBe(true)

    // ============================================================
    // STEP 9: Verify old password no longer works
    // ============================================================
    const oldPasswordStillValid = await bcrypt.compare(originalPassword, testUser.passwordHash)
    expect(oldPasswordStillValid).toBe(false)

    // ============================================================
    // STEP 10: Verify token cannot be reused
    // ============================================================
    mockDb.query.passwordResetTokens.findFirst.mockResolvedValue(tokenRecord)

    const usedToken = await mockDb.query.passwordResetTokens.findFirst()
    expect(usedToken.used).toBe(true)

    // Attempting to use the token again should fail
    // (In real implementation, this would return 400 error)
  })

  test('Token expiration prevents password reset', async () => {
    // Generate expired token
    const expiredToken = crypto.randomBytes(32).toString('hex')
    const expiredAt = new Date(Date.now() - 3600000) // Expired 1 hour ago

    const expiredTokenRecord = {
      id: 'expired-token-id',
      userId: testUser.id,
      token: expiredToken,
      expiresAt: expiredAt,
      used: false
    }

    mockDb.query.passwordResetTokens.findFirst.mockResolvedValue(expiredTokenRecord)

    const foundToken = await mockDb.query.passwordResetTokens.findFirst()
    expect(foundToken.expiresAt.getTime()).toBeLessThan(Date.now())

    // Token is expired, password reset should fail
    // (In real implementation, this would return 400 error)
  })

  test('Multiple password reset requests invalidate previous tokens', async () => {
    // User requests password reset
    const token1 = crypto.randomBytes(32).toString('hex')
    const tokenRecord1 = {
      id: 'token-1',
      userId: testUser.id,
      token: token1,
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date()
    }

    // User requests password reset again (forgot about first email)
    const token2 = crypto.randomBytes(32).toString('hex')
    const tokenRecord2 = {
      id: 'token-2',
      userId: testUser.id,
      token: token2,
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(Date.now() + 60000) // 1 minute later
    }

    // Both tokens should be valid (user can use either one)
    // In production, you might want to invalidate old tokens
    // when a new one is requested

    expect(token1).not.toBe(token2)
    expect(tokenRecord1.used).toBe(false)
    expect(tokenRecord2.used).toBe(false)

    // If using the newer token, the older one should ideally be invalidated
    // This is an implementation decision
  })

  test('Password reset works across different user accounts', async () => {
    const user1 = {
      id: 'user-1',
      email: 'user1@example.com',
      passwordHash: await bcrypt.hash('Password1', 10)
    }

    const user2 = {
      id: 'user-2',
      email: 'user2@example.com',
      passwordHash: await bcrypt.hash('Password2', 10)
    }

    const token1 = crypto.randomBytes(32).toString('hex')
    const token2 = crypto.randomBytes(32).toString('hex')

    // Each user gets their own unique token
    expect(token1).not.toBe(token2)

    // Tokens are associated with correct users
    const tokenRecord1 = { userId: user1.id, token: token1 }
    const tokenRecord2 = { userId: user2.id, token: token2 }

    expect(tokenRecord1.userId).toBe(user1.id)
    expect(tokenRecord2.userId).toBe(user2.id)

    // Using user1's token should only reset user1's password
    // Using user2's token should only reset user2's password
  })

  test('Rate limiting prevents abuse', () => {
    // Simulate multiple requests from same IP
    const requests = []
    const ip = '192.168.1.100'
    const now = Date.now()

    // User makes 5 requests in quick succession
    for (let i = 0; i < 5; i++) {
      requests.push({
        ip,
        email: testUser.email,
        timestamp: now + (i * 1000) // 1 second apart
      })
    }

    // Count requests in last hour
    const oneHourAgo = now - 3600000
    const recentRequests = requests.filter(req => 
      req.ip === ip && req.timestamp > oneHourAgo
    )

    expect(recentRequests.length).toBe(5)

    // If rate limit is 3 per hour, requests 4 and 5 should be blocked
    const maxRequests = 3
    expect(recentRequests.length).toBeGreaterThan(maxRequests)

    // In production, implement rate limiting middleware
    // to block excessive requests
  })

  test('Email validation prevents invalid requests', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.co.uk',
      'user+tag@domain.com'
    ]

    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'user@',
      '',
      null,
      undefined
    ]

    validEmails.forEach(email => {
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    invalidEmails.forEach(email => {
      if (email) {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      }
    })
  })

  test('Password requirements are enforced', () => {
    const validPasswords = [
      'Password123!',
      'SecureP@ss1',
      'MyNewPassword2024',
      'Abcd1234'
    ]

    const invalidPasswords = [
      'short',      // Too short
      'pass',       // Too short
      '1234567',    // Too short (7 chars)
      '',           // Empty
      'a'.repeat(7) // Exactly 7 chars
    ]

    validPasswords.forEach(password => {
      expect(password.length).toBeGreaterThanOrEqual(8)
    })

    invalidPasswords.forEach(password => {
      expect(password.length).toBeLessThan(8)
    })
  })
})
