/**
 * Grandfather existing customers into Ghara.
 *
 * Rules (from CLAUDE_CODE_PROMPT.md):
 * - Never raise prices on existing customers.
 * - Comply Growth → compliance=growth (cost=null unless they also have FinOps)
 * - FinOps Growth → cost=growth (compliance=null unless they also have Comply)
 * - Both products → grandfathered Ghara Growth at the SUM of their existing prices
 * - One product only → grandfathered with that engine's entitlements at their existing price
 * - Mark all migrated subscriptions with legacy=true
 *
 * This script is idempotent — running it twice won't double-migrate.
 *
 * Usage: node --env-file=.env scripts/migrate_legacy_to_ghara.js [--dry-run]
 */

import { db } from '../src/db/client.js'
import { organizations, subscriptions, users, auditLog } from '../src/db/schema.js'
import { eq, and, or, ne } from 'drizzle-orm'
import { logger } from '../src/services/logger.js'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n🔄 Ghara Legacy Migration ${DRY_RUN ? '(DRY RUN)' : ''}\n`)

  // Get all orgs with active/trialing subscriptions that are NOT already Ghara
  const legacySubs = await db.query.subscriptions.findMany({
    where: and(
      or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing')),
      ne(subscriptions.product, 'ghara'),
      eq(subscriptions.legacy, false)
    )
  })

  // Group by org
  const orgMap = new Map()
  for (const sub of legacySubs) {
    if (!orgMap.has(sub.orgId)) orgMap.set(sub.orgId, [])
    orgMap.get(sub.orgId).push(sub)
  }

  console.log(`Found ${orgMap.size} organizations with legacy subscriptions\n`)

  let migrated = 0
  let skipped = 0

  for (const [orgId, subs] of orgMap) {
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
    if (!org) { skipped++; continue }

    const hasComply = subs.some(s => s.product === 'comply')
    const hasFinops = subs.some(s => s.product === 'finops')
    const complySub = subs.find(s => s.product === 'comply')
    const finopsSub = subs.find(s => s.product === 'finops')

    console.log(`  ${org.name} (${orgId}):`)
    console.log(`    Comply: ${hasComply ? complySub.plan + ' (' + complySub.status + ')' : 'none'}`)
    console.log(`    FinOps: ${hasFinops ? finopsSub.plan + ' (' + finopsSub.status + ')' : 'none'}`)

    if (!DRY_RUN) {
      // Mark existing subscriptions as legacy
      for (const sub of subs) {
        await db.update(subscriptions)
          .set({ legacy: true, updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id))
      }

      // Update products array to reflect what they have access to
      if (hasComply && complySub) {
        await db.update(subscriptions)
          .set({ products: ['compliance'], tier: _inferTier(complySub.plan), updatedAt: new Date() })
          .where(eq(subscriptions.id, complySub.id))
      }
      if (hasFinops && finopsSub) {
        await db.update(subscriptions)
          .set({ products: ['cost'], tier: _inferTier(finopsSub.plan), updatedAt: new Date() })
          .where(eq(subscriptions.id, finopsSub.id))
      }

      // Audit log
      await db.insert(auditLog).values({
        orgId,
        action: 'billing.ghara_migration',
        metadata: {
          hasComply,
          hasFinops,
          complyPlan: complySub?.plan || null,
          finopsPlan: finopsSub?.plan || null,
          migratedAt: new Date().toISOString(),
        }
      })
    }

    const result = hasComply && hasFinops
      ? '→ Grandfathered: both engines at existing combined price'
      : hasComply
      ? '→ Grandfathered: compliance only at existing price'
      : '→ Grandfathered: cost only at existing price'

    console.log(`    ${result}`)
    console.log('')
    migrated++
  }

  console.log(`\n✅ Done. Migrated: ${migrated}, Skipped: ${skipped}`)
  if (DRY_RUN) console.log('   (No changes made — run without --dry-run to apply)')

  process.exit(0)
}

function _inferTier(plan) {
  if (!plan) return 'starter'
  if (plan.includes('scale')) return 'scale'
  if (plan.includes('growth') || plan === 'finops') return 'growth'
  return 'starter'
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
