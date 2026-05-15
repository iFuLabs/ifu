// Record token usage + estimated cost for every Bedrock/Claude call.
// Called from src/services/ai.js and src/services/finops-ai.js after each
// successful InvokeModelCommand. Failures don't cost real tokens, so we
// only record completed calls.

import { db } from '../db/client.js'
import { aiUsageLog } from '../db/schema.js'
import { logger } from './logger.js'
import { eq, and, gte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// Per-million-token rates in USD. Source: AWS Bedrock pricing, May 2026.
// Update these when AWS changes prices — historical rows keep the rate that
// was in effect when they were written.
const RATES = {
  // Current generation (active on Bedrock)
  'anthropic.claude-sonnet-4-5-20250929-v1:0': { input: 3.00,  output: 15.00 },
  'anthropic.claude-haiku-4-5-20251001-v1:0':  { input: 1.00,  output: 5.00  },
  'anthropic.claude-opus-4-1-20250805-v1:0':   { input: 15.00, output: 75.00 },
  // Legacy entries kept so historical aiUsageLog rows still cost-out correctly.
  'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 3.00,  output: 15.00 },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': { input: 3.00,  output: 15.00 },
  'anthropic.claude-3-haiku-20240307-v1:0':    { input: 0.25,  output: 1.25  },
  'anthropic.claude-3-opus-20240229-v1:0':     { input: 15.00, output: 75.00 }
}

function estimateCostUsd(model, inputTokens, outputTokens) {
  // Cross-region inference profile ids are prefixed with the region (us./eu./apac.).
  // Same underlying foundation model, same price — strip the prefix for lookup.
  const baseModel = model?.replace(/^(us|eu|apac|global)\./, '') || ''
  const rate = RATES[model] || RATES[baseModel]
  if (!rate) return 0
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output
}

/**
 * Record one AI call.
 *
 * @param {object} args
 * @param {string} args.orgId        Tenant performing the call. May be null
 *                                   for system-level calls.
 * @param {string} [args.userId]     User who triggered it, if request-scoped.
 * @param {string} args.service      'comply' | 'finops'.
 * @param {string} args.operation    Short operation name (e.g. 'control.explain').
 * @param {string} args.model        Model identifier returned by Bedrock.
 * @param {number} args.inputTokens
 * @param {number} args.outputTokens
 */
export async function recordUsage({ orgId, userId, service, operation, model, inputTokens, outputTokens }) {
  try {
    const cost = estimateCostUsd(model, inputTokens || 0, outputTokens || 0)
    await db.insert(aiUsageLog).values({
      orgId,
      userId,
      service,
      operation,
      model,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      estimatedCostUsd: cost.toFixed(6)
    })
  } catch (err) {
    // Usage logging must never break the main AI flow.
    logger.warn({ err, model, operation }, 'Failed to record AI usage')
  }
}

/**
 * Sum cost + token usage for an org in a rolling window.
 * @param {string} orgId
 * @param {number} windowDays  Default 30.
 */
export async function getUsageForOrg(orgId, windowDays = 30) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      service:      aiUsageLog.service,
      operation:    aiUsageLog.operation,
      model:        aiUsageLog.model,
      calls:        sql`count(*)::int`,
      inputTokens:  sql`coalesce(sum(${aiUsageLog.inputTokens}), 0)::bigint`,
      outputTokens: sql`coalesce(sum(${aiUsageLog.outputTokens}), 0)::bigint`,
      costUsd:      sql`coalesce(sum(${aiUsageLog.estimatedCostUsd}), 0)::numeric`
    })
    .from(aiUsageLog)
    .where(and(
      eq(aiUsageLog.orgId, orgId),
      gte(aiUsageLog.createdAt, since)
    ))
    .groupBy(aiUsageLog.service, aiUsageLog.operation, aiUsageLog.model)

  const totals = rows.reduce((acc, r) => ({
    calls:        acc.calls + Number(r.calls),
    inputTokens:  acc.inputTokens + Number(r.inputTokens),
    outputTokens: acc.outputTokens + Number(r.outputTokens),
    costUsd:      acc.costUsd + Number(r.costUsd)
  }), { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 })

  return { windowDays, since: since.toISOString(), totals, breakdown: rows }
}

/**
 * Soft cap. Returns true if the org has spent less than `maxUsd` in the last
 * `windowDays`. Callers can decide whether to block, warn, or just log.
 */
export async function withinBudget(orgId, maxUsd, windowDays = 30) {
  const usage = await getUsageForOrg(orgId, windowDays)
  return usage.totals.costUsd < maxUsd
}
