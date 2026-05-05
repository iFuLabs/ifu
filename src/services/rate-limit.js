// Per-org rate limiting backed by Redis. Used to throttle expensive endpoints
// that fan out to AWS APIs and Bedrock — uncapped, a logged-in user can spend
// real money for us by hammering /finops?refresh=true or /ai/explain.
//
// Pattern: `acquire(key, ttl)` returns true if the lock was taken (request
// allowed), false if a previous lock is still live (request must be rejected).
// Internally it's a single Redis SET with NX+EX flags — atomic, no race.

import { redis } from './redis.js'

/**
 * Try to acquire a rate-limit lock.
 *
 * @param {string} key     Unique key (e.g. `ratelimit:finops-scan:<orgId>`).
 * @param {number} ttlSec  Lock duration in seconds. Subsequent calls within
 *                         this window will return false.
 * @returns {Promise<{ ok: true } | { ok: false, retryAfter: number }>}
 */
export async function acquire(key, ttlSec) {
  const result = await redis.set(key, '1', 'EX', ttlSec, 'NX')
  if (result === 'OK') return { ok: true }
  const retryAfter = await redis.ttl(key).catch(() => ttlSec)
  return { ok: false, retryAfter: Math.max(retryAfter, 1) }
}

/**
 * Fastify preHandler factory. Rejects with 429 if the key is locked.
 *
 * @param {string} name      Short label for the limit, used in the Redis key
 *                           and in error messages (e.g. 'finops-scan').
 * @param {number} ttlSec    Cooldown window in seconds.
 * @param {object} [opts]
 * @param {(req) => string} [opts.scope] Custom scope function — defaults to
 *   `req.orgId`. Use to limit per user, per integration, etc.
 */
export function rateLimit(name, ttlSec, opts = {}) {
  const scopeFn = opts.scope || ((req) => req.orgId || 'anon')
  return async function rateLimitPreHandler(req, reply) {
    const scope = scopeFn(req)
    const key = `ratelimit:${name}:${scope}`
    const result = await acquire(key, ttlSec)
    if (!result.ok) {
      reply.header('Retry-After', String(result.retryAfter))
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: `This action is rate-limited. Try again in ${result.retryAfter}s.`,
        code: 'RATE_LIMITED',
        retryAfter: result.retryAfter
      })
    }
  }
}
