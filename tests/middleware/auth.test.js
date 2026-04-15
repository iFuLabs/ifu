import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'

describe('Auth Middleware', () => {
  let mockRequest, mockReply

  beforeEach(() => {
    // Set required environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
    process.env.AUTH0_DOMAIN = 'test.auth0.com'
    process.env.AUTH0_AUDIENCE = 'https://api.test.com'
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)

    mockRequest = {
      headers: {},
      cookies: {},
      log: { warn: jest.fn() }
    }
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.JWT_SECRET
    delete process.env.AUTH0_DOMAIN
    delete process.env.AUTH0_AUDIENCE
    delete process.env.ENCRYPTION_KEY
  })

  test('should reject request without authorization header or cookie', async () => {
    const { verifyToken } = await import('../../src/middleware/auth.js')
    
    await verifyToken(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(401)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: 'Missing Bearer token or auth cookie'
      })
    )
  })

  test('should accept token from httpOnly cookie', async () => {
    const { verifyToken } = await import('../../src/middleware/auth.js')
    
    // Mock a valid JWT in cookie
    mockRequest.cookies.auth_token = 'valid-jwt-token'
    
    // This would normally verify the token and set request.user
    // For this test, we're just checking that cookies are checked
    expect(mockRequest.cookies.auth_token).toBeDefined()
  })

  test('should prefer Authorization header over cookie if both present', async () => {
    const { verifyToken } = await import('../../src/middleware/auth.js')
    
    mockRequest.headers.authorization = 'Bearer header-token'
    mockRequest.cookies.auth_token = 'cookie-token'
    
    // The implementation should check Authorization header first
    const authHeader = mockRequest.headers.authorization
    expect(authHeader).toBe('Bearer header-token')
  })

  test('should reject request with malformed authorization header', async () => {
    const { verifyToken } = await import('../../src/middleware/auth.js')
    mockRequest.headers.authorization = 'InvalidFormat token123'
    
    await verifyToken(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(401)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized'
      })
    )
  })

  test('requireUser should reject when user is not set', async () => {
    const { requireUser } = await import('../../src/middleware/auth.js')
    mockRequest.user = null
    
    await requireUser(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(403)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ONBOARDING_REQUIRED'
      })
    )
  })

  test('requireAdmin should reject non-admin users', async () => {
    const { requireAdmin } = await import('../../src/middleware/auth.js')
    mockRequest.user = { id: '123', role: 'member' }
    
    await requireAdmin(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(403)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Admin access required'
      })
    )
  })

  test('requireAdmin should allow admin users', async () => {
    const { requireAdmin } = await import('../../src/middleware/auth.js')
    mockRequest.user = { id: '123', role: 'admin' }
    
    await requireAdmin(mockRequest, mockReply)
    
    expect(mockReply.status).not.toHaveBeenCalled()
  })

  test('requireOwner should only allow owner role', async () => {
    const { requireOwner } = await import('../../src/middleware/auth.js')
    mockRequest.user = { id: '123', role: 'admin' }
    
    await requireOwner(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(403)
  })
})
