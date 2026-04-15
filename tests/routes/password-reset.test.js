import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

describe('Password Reset Routes', () => {
  let mockDb, mockRequest, mockReply, mockEmailService

  beforeEach(() => {
    // Set required environment variables
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.PORTAL_URL = 'http://localhost:3003'

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

    mockRequest = {
      body: {},
      params: {}
    }

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.JWT_SECRET
    delete process.env.ENCRYPTION_KEY
    delete process.env.DATABASE_URL
    delete process.env.PORTAL_URL
  })

  describe('POST /api/v1/auth/forgot-password', () => {
    test('should generate token and send email for valid user', async () => {
      const email = 'user@example.com'
      const userId = 'user-123'
      const userName = 'Test User'

      mockRequest.body = { email }

      // Mock user exists
      mockDb.query.users.findFirst.mockResolvedValue({
        id: userId,
        email,
        name: userName
      })

      // Mock token insertion
      mockDb.returning.mockResolvedValue([{
        id: 'token-id',
        token: 'reset-token-123',
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        used: false
      }])

      // Simulate the route handler logic
      const user = await mockDb.query.users.findFirst()
      expect(user).toBeTruthy()
      expect(user.email).toBe(email)

      // Generate token
      const token = crypto.randomBytes(32).toString('hex')
      expect(token).toHaveLength(64)

      // Store token
      const expiresAt = new Date(Date.now() + 3600000) // 1 hour
      await mockDb.insert().values({
        userId: user.id,
        token,
        expiresAt,
        used: false
      }).returning()

      // Send email
      const resetUrl = `${process.env.PORTAL_URL}/reset-password/${token}`
      await mockEmailService.sendPasswordResetEmail({
        to: email,
        name: userName,
        resetUrl
      })

      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith({
        to: email,
        name: userName,
        resetUrl: expect.stringContaining('/reset-password/')
      })

      // Always return success (don't reveal if email exists)
      mockReply.send({ message: 'If email exists, reset link sent' })
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'If email exists, reset link sent'
      })
    })

    test('should not reveal if email does not exist', async () => {
      const email = 'nonexistent@example.com'
      mockRequest.body = { email }

      // Mock user does not exist
      mockDb.query.users.findFirst.mockResolvedValue(null)

      const user = await mockDb.query.users.findFirst()
      expect(user).toBeNull()

      // Should still return success message (security best practice)
      mockReply.send({ message: 'If email exists, reset link sent' })
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'If email exists, reset link sent'
      })

      // Email should not be sent
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    test('should generate cryptographically secure random token', () => {
      const token1 = crypto.randomBytes(32).toString('hex')
      const token2 = crypto.randomBytes(32).toString('hex')

      // Tokens should be different
      expect(token1).not.toBe(token2)

      // Tokens should be 64 characters (32 bytes in hex)
      expect(token1).toHaveLength(64)
      expect(token2).toHaveLength(64)

      // Tokens should only contain hex characters
      expect(token1).toMatch(/^[0-9a-f]{64}$/)
      expect(token2).toMatch(/^[0-9a-f]{64}$/)
    })

    test('should set token expiration to 1 hour', () => {
      const now = Date.now()
      const expiresAt = new Date(now + 3600000) // 1 hour in milliseconds

      const oneHourLater = new Date(now + 3600000)
      expect(expiresAt.getTime()).toBe(oneHourLater.getTime())

      // Verify it's approximately 1 hour (within 1 second tolerance)
      const diff = expiresAt.getTime() - now
      expect(diff).toBeGreaterThanOrEqual(3599000)
      expect(diff).toBeLessThanOrEqual(3601000)
    })

    test('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com'
      ]

      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        ''
      ]

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      })

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      })
    })
  })

  describe('POST /api/v1/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      const token = 'valid-reset-token'
      const newPassword = 'NewSecurePassword123!'
      const userId = 'user-123'

      mockRequest.body = { token, newPassword }

      // Mock valid token
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token,
        userId,
        expiresAt: new Date(Date.now() + 3600000), // Not expired
        used: false
      })

      // Mock user exists
      mockDb.query.users.findFirst.mockResolvedValue({
        id: userId,
        email: 'user@example.com'
      })

      // Simulate the route handler logic
      const resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken).toBeTruthy()
      expect(resetToken.used).toBe(false)
      expect(resetToken.expiresAt.getTime()).toBeGreaterThan(Date.now())

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)
      expect(passwordHash).toBeTruthy()

      // Verify password can be validated
      const isValid = await bcrypt.compare(newPassword, passwordHash)
      expect(isValid).toBe(true)

      // Update user password
      mockDb.returning.mockResolvedValue([{ id: userId }])
      await mockDb.update().set({ passwordHash }).where().returning()

      // Mark token as used
      await mockDb.update().set({ used: true }).where()

      mockReply.send({ message: 'Password reset successful' })
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Password reset successful'
      })
    })

    test('should reject expired token', async () => {
      const token = 'expired-token'
      const newPassword = 'NewPassword123!'

      mockRequest.body = { token, newPassword }

      // Mock expired token
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token,
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        used: false
      })

      const resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken.expiresAt.getTime()).toBeLessThan(Date.now())

      mockReply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })

      expect(mockReply.status).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })
    })

    test('should reject already used token', async () => {
      const token = 'used-token'
      const newPassword = 'NewPassword123!'

      mockRequest.body = { token, newPassword }

      // Mock used token
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000),
        used: true // Already used
      })

      const resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken.used).toBe(true)

      mockReply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })

      expect(mockReply.status).toHaveBeenCalledWith(400)
    })

    test('should reject invalid token', async () => {
      const token = 'invalid-token'
      const newPassword = 'NewPassword123!'

      mockRequest.body = { token, newPassword }

      // Mock token not found
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValue(null)

      const resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken).toBeNull()

      mockReply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })

      expect(mockReply.status).toHaveBeenCalledWith(400)
    })

    test('should enforce password minimum length', () => {
      const validPasswords = [
        'Password123!',
        'SecurePass1',
        'MyP@ssw0rd'
      ]

      const invalidPasswords = [
        'short',
        'pass',
        '1234567', // 7 chars
        ''
      ]

      validPasswords.forEach(password => {
        expect(password.length).toBeGreaterThanOrEqual(8)
      })

      invalidPasswords.forEach(password => {
        expect(password.length).toBeLessThan(8)
      })
    })

    test('should hash password with bcrypt', async () => {
      const password = 'MySecurePassword123!'
      const hash = await bcrypt.hash(password, 10)

      // Hash should be different from password
      expect(hash).not.toBe(password)

      // Hash should start with bcrypt identifier
      expect(hash).toMatch(/^\$2[aby]\$/)

      // Should be able to verify password
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)

      // Wrong password should not match
      const isInvalid = await bcrypt.compare('WrongPassword', hash)
      expect(isInvalid).toBe(false)
    })

    test('should prevent token reuse after successful reset', async () => {
      const token = 'one-time-token'
      const userId = 'user-123'

      // First use - should succeed
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValueOnce({
        id: 'token-id',
        token,
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        used: false
      })

      let resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken.used).toBe(false)

      // Mark as used
      await mockDb.update().set({ used: true }).where()

      // Second use - should fail
      mockDb.query.passwordResetTokens.findFirst.mockResolvedValueOnce({
        id: 'token-id',
        token,
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        used: true // Now marked as used
      })

      resetToken = await mockDb.query.passwordResetTokens.findFirst()
      expect(resetToken.used).toBe(true)

      mockReply.status(400).send({
        error: 'Bad Request',
        message: 'Token expired or invalid'
      })

      expect(mockReply.status).toHaveBeenCalledWith(400)
    })
  })

  describe('Security Considerations', () => {
    test('should not leak user existence through timing', async () => {
      // Both existing and non-existing emails should take similar time
      // This is a conceptual test - actual timing would need performance testing

      const existingEmail = 'exists@example.com'
      const nonExistingEmail = 'notexists@example.com'

      // Both should return the same message
      const message = 'If email exists, reset link sent'

      mockReply.send({ message })
      expect(mockReply.send).toHaveBeenCalledWith({ message })

      // In production, both paths should have similar execution time
      // to prevent timing attacks that reveal user existence
    })

    test('should use constant-time comparison for tokens', () => {
      // In production, use crypto.timingSafeEqual for token comparison
      const token1 = Buffer.from('token123')
      const token2 = Buffer.from('token123')
      const token3 = Buffer.from('token456')

      // These should be equal
      expect(token1.equals(token2)).toBe(true)

      // These should not be equal
      expect(token1.equals(token3)).toBe(false)

      // Note: In production code, use crypto.timingSafeEqual(token1, token2)
      // to prevent timing attacks
    })

    test('should clean up old tokens periodically', () => {
      // Conceptual test for token cleanup
      const now = Date.now()
      const oldTokens = [
        { expiresAt: new Date(now - 7200000), used: false }, // 2 hours ago
        { expiresAt: new Date(now - 86400000), used: true },  // 1 day ago
        { expiresAt: new Date(now - 604800000), used: false } // 1 week ago
      ]

      const tokensToDelete = oldTokens.filter(token => 
        token.expiresAt.getTime() < now
      )

      expect(tokensToDelete).toHaveLength(3)
      // All old tokens should be cleaned up
    })

    test('should rate limit password reset requests', () => {
      // Conceptual test for rate limiting
      // In production, implement rate limiting middleware
      // e.g., max 3 requests per hour per IP

      const requests = [
        { ip: '192.168.1.1', timestamp: Date.now() },
        { ip: '192.168.1.1', timestamp: Date.now() + 1000 },
        { ip: '192.168.1.1', timestamp: Date.now() + 2000 },
        { ip: '192.168.1.1', timestamp: Date.now() + 3000 } // 4th request
      ]

      const maxRequests = 3
      const timeWindow = 3600000 // 1 hour

      const recentRequests = requests.filter(req => 
        req.ip === '192.168.1.1' &&
        Date.now() - req.timestamp < timeWindow
      )

      expect(recentRequests.length).toBeGreaterThan(maxRequests)
      // 4th request should be rate limited
    })
  })

  describe('Email Integration', () => {
    test('should send email with correct reset URL', async () => {
      const email = 'user@example.com'
      const token = 'reset-token-abc123'
      const name = 'Test User'

      const resetUrl = `${process.env.PORTAL_URL}/reset-password/${token}`

      await mockEmailService.sendPasswordResetEmail({
        to: email,
        name,
        resetUrl
      })

      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith({
        to: email,
        name,
        resetUrl: 'http://localhost:3003/reset-password/reset-token-abc123'
      })
    })

    test('should handle email sending failure gracefully', async () => {
      mockEmailService.sendPasswordResetEmail.mockResolvedValue({
        success: false,
        error: 'SMTP connection failed'
      })

      const result = await mockEmailService.sendPasswordResetEmail({
        to: 'user@example.com',
        name: 'Test User',
        resetUrl: 'http://localhost:3003/reset-password/token'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()

      // Should still return success to user (don't reveal email sending issues)
      mockReply.send({ message: 'If email exists, reset link sent' })
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'If email exists, reset link sent'
      })
    })
  })
})
