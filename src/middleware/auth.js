import { createRemoteJWKSet, jwtVerify } from 'jose'
import jwt from 'jsonwebtoken'
import { db } from '../db/client.js'
import { users, organizations } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import fp from 'fastify-plugin'

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required')
}
const JWT_SECRET = process.env.JWT_SECRET

const JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
)

// Verify JWT token (our own or Auth0) and attach user + org to request
async function verifyToken(request, reply) {
  // Accept token from Authorization header or httpOnly cookie
  const authHeader = request.headers.authorization
  const cookieToken = request.cookies?.auth_token
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing Bearer token or auth cookie' })
  }

  // Try to verify as our own JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Load user from DB
    let user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      with: { org: true }
    })

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' })
    }

    request.user = user
    request.orgId = user.orgId
    request.auth = decoded
    return
  } catch (err) {
    // Not our JWT, try Auth0
  }

  // Try Auth0 JWT
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_AUDIENCE
    })

    // Attach decoded token
    request.auth = payload

    // Load user from DB (or create on first login)
    let user = await db.query.users.findFirst({
      where: eq(users.auth0Id, payload.sub),
      with: { org: true }
    })

    if (!user) {
      // First time this user has hit the API — they need to complete onboarding
      request.user = null
      request.auth0Sub = payload.sub
      request.auth0Email = payload.email
      return
    }

    request.user = user
    request.orgId = user.orgId

  } catch (err) {
    request.log.warn({ err }, 'JWT verification failed')
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }
}

// Require user to have a fully onboarded account + org
async function requireUser(request, reply) {
  if (!request.user) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Complete onboarding first',
      code: 'ONBOARDING_REQUIRED'
    })
  }
}

// Require user to be org owner or admin
async function requireAdmin(request, reply) {
  if (!request.user) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Authentication required' })
  }
  if (!['owner', 'admin'].includes(request.user.role)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Admin access required' })
  }
}

// Require user to be org owner
async function requireOwner(request, reply) {
  if (!request.user || request.user.role !== 'owner') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Owner access required' })
  }
}

// Plugin that decorates fastify with auth hooks
async function authPlugin(fastify) {
  // Decorate request with auth properties
  fastify.decorateRequest('user', null)
  fastify.decorateRequest('orgId', null)
  fastify.decorateRequest('auth', null)
  fastify.decorateRequest('auth0Sub', null)
  fastify.decorateRequest('auth0Email', null)

  // Make hooks available globally
  fastify.decorate('verifyToken', verifyToken)
  fastify.decorate('requireUser', requireUser)
  fastify.decorate('requireAdmin', requireAdmin)
  fastify.decorate('requireOwner', requireOwner)
}

export { authPlugin, verifyToken, requireUser, requireAdmin, requireOwner }
