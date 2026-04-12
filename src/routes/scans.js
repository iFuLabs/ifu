import { db } from '../db/client.js'
import { scans } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { verifyToken, requireUser } from '../middleware/auth.js'
import { scanQueue } from '../jobs/queues.js'

export default async function scanRoutes(fastify) {

  // GET /api/v1/scans
  // List recent scans for this org
  fastify.get('/', {
    preHandler: [verifyToken, requireUser],
    schema: { tags: ['Scans'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    const results = await db.query.scans.findMany({
      where: eq(scans.orgId, request.orgId),
      orderBy: [desc(scans.createdAt)],
      limit: 20
    })
    return reply.send(results)
  })

  // GET /api/v1/scans/:id
  fastify.get('/:id', {
    preHandler: [verifyToken, requireUser],
    schema: {
      tags: ['Scans'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const scan = await db.query.scans.findFirst({
      where: and(
        eq(scans.id, request.params.id),
        eq(scans.orgId, request.orgId)
      )
    })

    if (!scan) {
      return reply.status(404).send({ error: 'Not Found', message: 'Scan not found' })
    }

    // If the scan is still running, get live job status from BullMQ
    if (scan.status === 'pending' || scan.status === 'running') {
      const jobs = await scanQueue.getJobs(['active', 'waiting'])
      const job = jobs.find(j => j.data.orgId === request.orgId && j.data.scanId === scan.id)
      if (job) {
        return reply.send({ ...scan, progress: await job.progress })
      }
    }

    return reply.send(scan)
  })
}
