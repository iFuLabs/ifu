/**
 * Cloud Health Score — composite 0–100 score for the Ghara dashboard.
 *
 * Weighting:
 *   40% Compliance posture (% of controls passing, weighted by severity)
 *   30% Cost efficiency (1 - waste/total spend, capped at 100)
 *   30% Security posture (high/critical findings count, inverted)
 *
 * The score is designed to be defensible and actionable:
 * - A perfect score means all controls pass, no waste, no critical findings.
 * - Each failing critical control drops the score more than a low-severity one.
 * - Cost waste is measured as a ratio, so it scales with spend.
 */

import { db } from '../db/client.js'
import { controlResults, controlDefinitions } from '../db/schema.js'
import { eq, and, sql } from 'drizzle-orm'
import { redis } from './redis.js'
import { logger } from './logger.js'

const CACHE_TTL = 300 // 5 minutes

/**
 * Compute the Cloud Health Score for an organization.
 * @param {string} orgId
 * @returns {Promise<{ score: number, compliance: number, cost: number, security: number, trend: number|null }>}
 */
export async function computeHealthScore(orgId) {
  // Check cache first
  const cacheKey = `health-score:${orgId}`
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  } catch {}

  // 1. Compliance posture (40%)
  const complianceScore = await _computeComplianceScore(orgId)

  // 2. Cost efficiency (30%)
  const costScore = await _computeCostScore(orgId)

  // 3. Security posture (30%)
  const securityScore = await _computeSecurityScore(orgId)

  // Composite
  const score = Math.round(complianceScore * 0.4 + costScore * 0.3 + securityScore * 0.3)

  // Trend: compare to last week's cached score
  let trend = null
  try {
    const lastWeekKey = `health-score:${orgId}:last-week`
    const lastWeek = await redis.get(lastWeekKey)
    if (lastWeek) {
      const prev = JSON.parse(lastWeek)
      trend = score - prev.score
    }
  } catch {}

  const result = { score, compliance: complianceScore, cost: costScore, security: securityScore, trend }

  // Cache
  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
  } catch {}

  return result
}

async function _computeComplianceScore(orgId) {
  const results = await db
    .select({
      status: controlResults.status,
      severity: controlDefinitions.severity,
    })
    .from(controlResults)
    .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
    .where(eq(controlResults.orgId, orgId))

  if (results.length === 0) return 0

  // Weight by severity: critical=4, high=3, medium=2, low=1
  const weights = { critical: 4, high: 3, medium: 2, low: 1 }
  let totalWeight = 0
  let passingWeight = 0

  for (const r of results) {
    const w = weights[r.severity] || 1
    totalWeight += w
    if (r.status === 'pass') passingWeight += w
  }

  return totalWeight > 0 ? Math.round((passingWeight / totalWeight) * 100) : 0
}

async function _computeCostScore(orgId) {
  // Read from cached FinOps findings
  try {
    const cacheKey = `finops:findings:${orgId}:current-month`
    const cached = await redis.get(cacheKey)
    if (!cached) return 100 // No data = no waste detected

    const findings = JSON.parse(cached)
    const totalSpend = findings.monthlyCost || 0
    const totalWaste = findings.summary?.totalMonthlySavings || 0

    if (totalSpend <= 0) return 100
    const efficiency = 1 - (totalWaste / totalSpend)
    return Math.round(Math.max(0, Math.min(100, efficiency * 100)))
  } catch {
    return 100
  }
}

async function _computeSecurityScore(orgId) {
  // Count critical + high severity failing controls
  const results = await db
    .select({ severity: controlDefinitions.severity })
    .from(controlResults)
    .innerJoin(controlDefinitions, eq(controlResults.controlDefId, controlDefinitions.id))
    .where(and(
      eq(controlResults.orgId, orgId),
      eq(controlResults.status, 'fail')
    ))

  const criticalCount = results.filter(r => r.severity === 'critical').length
  const highCount = results.filter(r => r.severity === 'high').length

  // Each critical finding = -12 points, each high = -6 points
  const deduction = criticalCount * 12 + highCount * 6
  return Math.max(0, 100 - deduction)
}

/**
 * Snapshot the current score for weekly trend comparison.
 * Called by the scheduler once per week.
 */
export async function snapshotWeeklyScore(orgId) {
  const current = await computeHealthScore(orgId)
  const key = `health-score:${orgId}:last-week`
  try {
    await redis.setex(key, 60 * 60 * 24 * 8, JSON.stringify(current)) // 8 days TTL
  } catch {}
}
