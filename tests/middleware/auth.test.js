import { describe, test, expect, jest, beforeEach } from '@jest/globals'

describe('Auth Middleware', () => {
  let mockRequest, mockReply

  beforeEach(() => {
    mockRequest = {
      headers: {},
      log: { warn: jest.fn() }
    }
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    }
  })

  test('should reject request without authorization header', async () => {
    const { verifyToken } = await import('../../src/middleware/auth.js')
    
    await verifyToken(mockRequest, mockReply)
    
    expect(mockReply.status).toHaveBeenCalledWith(401)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: 'Missing Bearer token'
      })
    )
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
