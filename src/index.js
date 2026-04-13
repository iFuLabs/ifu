import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import 'dotenv/config'

import { db } from './db/client.js'
import { redis } from './services/redis.js'
import { authPlugin } from './middleware/auth.js'

// Background jobs
import { startScheduler } from './jobs/scheduler.js'
import './jobs/scanWorker.js'

// Routes
import authRoutes from './routes/auth.js'
import organizationRoutes from './routes/organizations.js'
import integrationRoutes from './routes/integrations.js'
import controlRoutes from './routes/controls.js'
import evidenceRoutes from './routes/evidence.js'
import vendorRoutes from './routes/vendors.js'
import billingRoutes from './routes/billing.js'
import scanRoutes from './routes/scans.js'
import aiRoutes from './routes/ai.js'
import finopsRoutes from './routes/finops.js'
import teamRoutes from './routes/team.js'

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  }
})

// ── Plugins ────────────────────────────────────────────────────────────────
await app.register(cookie)
await app.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        }
      }
    : false // Disabled in development for Swagger UI
})
await app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.ifu-labs.io']
    : true,
  credentials: true
})
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
})

// API Docs (development only)
if (process.env.NODE_ENV === 'development') {
  await app.register(swagger, {
    openapi: {
      info: { title: 'iFu Labs — Comply API', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
      }
    }
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })
}

// Auth middleware (validates Auth0 JWT on all protected routes)
await app.register(authPlugin)

// ── Routes ─────────────────────────────────────────────────────────────────
await app.register(authRoutes,         { prefix: '/api/v1/auth' })
await app.register(organizationRoutes, { prefix: '/api/v1/organizations' })
await app.register(integrationRoutes,  { prefix: '/api/v1/integrations' })
await app.register(controlRoutes,      { prefix: '/api/v1/controls' })
await app.register(evidenceRoutes,     { prefix: '/api/v1/evidence' })
await app.register(vendorRoutes,       { prefix: '/api/v1/vendors' })
await app.register(billingRoutes,      { prefix: '/api/v1/billing' })
await app.register(scanRoutes,         { prefix: '/api/v1/scans' })
await app.register(aiRoutes,           { prefix: '/api/v1/ai' })
await app.register(finopsRoutes,       { prefix: '/api/v1/finops' })
await app.register(teamRoutes,         { prefix: '/api/v1/team' })

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0'
}))

// ── Error handler ──────────────────────────────────────────────────────────
app.setErrorHandler((error, request, reply) => {
  app.log.error(error)

  // Zod validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    })
  }

  // Known app errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message
    })
  }

  // Unknown errors - don't leak internals in production
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// ── Start ──────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Test DB connection
    await db.execute('SELECT 1')
    app.log.info('✅ Database connected')

    // Test Redis connection
    await redis.ping()
    app.log.info('✅ Redis connected')

    await app.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
    app.log.info(`🚀 iFu Labs — Comply API running on port ${process.env.PORT || 3000}`)

    // Start background job scheduler (daily compliance scans)
    startScheduler()

    if (process.env.NODE_ENV === 'development') {
      app.log.info(`📚 API docs: http://localhost:${process.env.PORT || 3000}/docs`)
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

export default app
