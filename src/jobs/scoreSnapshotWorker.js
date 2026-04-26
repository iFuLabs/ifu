import { db } from '../db/client.js'
import { organizations, controlResults, controlDefinitions, complianceScoreSnapshots } from '../db/schema.js'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '../services/logger.js'

/**
 * C-A2: Capture daily compliance score snapshots per org per framework.
 * Called by the scheduler at 04:00 UTC.
 */
export async function captureScoreSnapshots() {
  logger.info('Starting daily score snapshot capture')

  const orgs = await db.query.organizations.findMany()

  for (const org of orgs) {
    try {
      // Get all control results with their definitions
      const results = await db
        .select({
          framework: controlDefinitions.framework,
          status: controlResults.status
        })
        .from(controlResults)
        .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
        .where(eq(controlResults.orgId, org.id))

      // Group by framework
      const byFramework = new Map()
      for (const r of results) {
        if (!byFramework.has(r.framework)) {
          byFramework.set(r.framework, { pass: 0, fail: 0, review: 0, total: 0 })
        }
        const fw = byFramework.get(r.framework)
        fw.total++
        if (r.status === 'pass') fw.pass++
        else if (r.status === 'fail') fw.fail++
        else if (r.status === 'review') fw.review++
      }

      // Also compute an "overall" snapshot
      let totalPass = 0, totalFail = 0, totalReview = 0, totalAll = 0
      for (const [framework, counts] of byFramework) {
        const score = counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : 0

        await db.insert(complianceScoreSnapshots).values({
          orgId: org.id,
          framework,
          scoreOverall: score,
          scorePass: counts.pass,
          scoreFail: counts.fail,
          scoreReview: counts.review,
          scoreTotal: counts.total
        })

        totalPass += counts.pass
        totalFail += counts.fail
        totalReview += counts.review
        totalAll += counts.total
      }

      // Overall snapshot
      if (totalAll > 0) {
        await db.insert(complianceScoreSnapshots).values({
          orgId: org.id,
          framework: 'overall',
          scoreOverall: Math.round((totalPass / totalAll) * 100),
          scorePass: totalPass,
          scoreFail: totalFail,
          scoreReview: totalReview,
          scoreTotal: totalAll
        })
      }

      logger.info({ orgId: org.id, frameworks: byFramework.size }, 'Score snapshot captured')
    } catch (err) {
      logger.error({ orgId: org.id, err: err.message }, 'Score snapshot failed for org')
    }
  }

  logger.info('Score snapshot capture complete')
}
