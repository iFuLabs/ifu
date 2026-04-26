import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { db } from '../db/client.js'
import { anomalies, budgets, organizations } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { logger } from './logger.js'
import { dispatchWebhook } from './webhooks.js'

/**
 * Detect cost anomalies by comparing yesterday's spend per service
 * against the trailing 14-day median. Flags if delta > 25% AND absolute > $25.
 */
export async function detectAnomalies(orgId, awsCredentials, region) {
  const ce = new CostExplorerClient({ region, credentials: awsCredentials })

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const baselineStart = new Date(today)
  baselineStart.setDate(baselineStart.getDate() - 15) // 14 days before yesterday

  // Get yesterday's spend by service
  const [yesterdayData, baselineData] = await Promise.all([
    ce.send(new GetCostAndUsageCommand({
      TimePeriod: {
        Start: yesterday.toISOString().slice(0, 10),
        End: today.toISOString().slice(0, 10)
      },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
    })),
    ce.send(new GetCostAndUsageCommand({
      TimePeriod: {
        Start: baselineStart.toISOString().slice(0, 10),
        End: yesterday.toISOString().slice(0, 10)
      },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
    }))
  ])

  // Build baseline medians per service
  const serviceDaily = new Map() // service -> [daily costs]
  for (const period of baselineData.ResultsByTime || []) {
    for (const g of period.Groups || []) {
      const svc = g.Keys[0]
      const amt = parseFloat(g.Metrics.UnblendedCost.Amount || '0')
      if (!serviceDaily.has(svc)) serviceDaily.set(svc, [])
      serviceDaily.get(svc).push(amt)
    }
  }

  const medians = new Map()
  for (const [svc, costs] of serviceDaily) {
    const sorted = costs.sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    medians.set(svc, sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
  }

  // Compare yesterday vs baseline
  const detected = []
  for (const period of yesterdayData.ResultsByTime || []) {
    for (const g of period.Groups || []) {
      const svc = g.Keys[0]
      const observed = parseFloat(g.Metrics.UnblendedCost.Amount || '0')
      const baseline = medians.get(svc) || 0

      if (baseline === 0 && observed < 25) continue // new service, small spend
      const delta = baseline > 0 ? ((observed - baseline) / baseline) * 100 : 100
      const absoluteDelta = observed - baseline

      if (delta > 25 && absoluteDelta > 25) {
        const severity = delta > 100 ? 'critical' : delta > 50 ? 'high' : 'medium'

        // Check for existing anomaly today to avoid duplicates
        const existing = await db.query.anomalies.findFirst({
          where: and(
            eq(anomalies.orgId, orgId),
            eq(anomalies.scopeValue, svc),
            eq(anomalies.status, 'open')
          )
        })

        if (!existing) {
          const [anomaly] = await db.insert(anomalies).values({
            orgId,
            scope: 'service',
            scopeValue: svc,
            baselineCost: baseline.toFixed(2),
            observedCost: observed.toFixed(2),
            deltaPct: delta.toFixed(2),
            severity,
            status: 'open'
          }).returning()

          detected.push(anomaly)
        }
      }
    }
  }

  return detected
}

/**
 * Evaluate budgets: compare month-to-date spend vs prorated budget.
 * Alert when crossing each notifyAt threshold (idempotent).
 */
export async function evaluateBudgets(orgId, awsCredentials, region) {
  const ce = new CostExplorerClient({ region, credentials: awsCredentials })

  const orgBudgets = await db.query.budgets.findMany({
    where: eq(budgets.orgId, orgId)
  })

  if (orgBudgets.length === 0) return []

  // Get month-to-date spend
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()

  const { ResultsByTime } = await ce.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: monthStart.toISOString().slice(0, 10),
      End: now.toISOString().slice(0, 10)
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
  }))

  // Build spend map
  const serviceSpend = new Map()
  let totalSpend = 0
  for (const period of ResultsByTime || []) {
    for (const g of period.Groups || []) {
      const amt = parseFloat(g.Metrics.UnblendedCost.Amount || '0')
      serviceSpend.set(g.Keys[0], amt)
      totalSpend += amt
    }
  }

  const alerts = []

  for (const budget of orgBudgets) {
    const monthlyAmount = parseFloat(budget.monthlyAmount)
    let currentSpend = 0

    if (budget.scope === 'org') {
      currentSpend = totalSpend
    } else if (budget.scope === 'service') {
      currentSpend = serviceSpend.get(budget.scopeValue) || 0
    }

    const pctUsed = (currentSpend / monthlyAmount) * 100
    const thresholds = (budget.notifyAt || [50, 80, 100]).sort((a, b) => a - b)
    const lastNotified = budget.lastNotifiedThreshold || 0

    // Find the highest threshold we've crossed that we haven't notified about
    const crossedThreshold = thresholds.filter(t => pctUsed >= t && t > lastNotified).pop()

    if (crossedThreshold) {
      // Update last notified threshold
      await db.update(budgets)
        .set({ lastNotifiedThreshold: crossedThreshold, updatedAt: new Date() })
        .where(eq(budgets.id, budget.id))

      alerts.push({
        budget,
        currentSpend: Math.round(currentSpend * 100) / 100,
        pctUsed: Math.round(pctUsed),
        threshold: crossedThreshold
      })

      // Dispatch webhook
      await dispatchWebhook(orgId, 'finops.budget_breach', {
        budgetName: budget.name,
        threshold: crossedThreshold,
        currentSpend: Math.round(currentSpend * 100) / 100,
        monthlyAmount,
        pctUsed: Math.round(pctUsed)
      }).catch(err => logger.warn({ err: err.message }, 'Budget webhook failed'))
    }
  }

  // Reset thresholds at month start (day 1)
  if (dayOfMonth === 1) {
    for (const budget of orgBudgets) {
      await db.update(budgets)
        .set({ lastNotifiedThreshold: null, updatedAt: new Date() })
        .where(eq(budgets.id, budget.id))
    }
  }

  return alerts
}
