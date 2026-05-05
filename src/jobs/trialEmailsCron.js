// Trial-lifecycle email tick. Runs hourly. Sends the T-24h "your card will
// be charged tomorrow" reminder once per org per trial.
//
// Card-on-file is mandatory at signup (onboarding step 3 gates progression),
// so every trial has paystackAuthCode set and converts via Paystack auto-
// charge. There is no "no card" branch.
//
// First-charge receipt + payment-failed emails are NOT sent from here —
// they're driven by Paystack webhooks in src/routes/billing.js so they fire
// at the moment of truth instead of on a clock.

import { db } from '../db/client.js'
import { organizations, users, subscriptions } from '../db/schema.js'
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm'
import { logger } from '../services/logger.js'
import { sendTrialChargeReminderEmail } from '../services/email.js'
import { getSubscription } from '../services/paystack.js'

// We send the reminder when trialEndsAt is between 22h and 26h from now.
// The 4h window absorbs cron jitter and lets a missed run catch up on the
// next hour without skipping any org.
const REMINDER_LEAD_HOURS_MIN = 22
const REMINDER_LEAD_HOURS_MAX = 26

async function ownerForOrg(orgId) {
  const owner = await db.query.users.findFirst({
    where: and(eq(users.orgId, orgId), eq(users.role, 'owner'))
  })
  if (owner) return owner
  // Fallback to first admin if there's no owner record (shouldn't normally happen).
  return db.query.users.findFirst({
    where: and(eq(users.orgId, orgId), eq(users.role, 'admin'))
  })
}

async function liveSubscriptionForOrg(orgId) {
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.orgId, orgId),
      eq(subscriptions.status, 'trialing')
    )
  })
  if (!sub?.paystackSubscriptionCode) return null
  try {
    return await getSubscription(sub.paystackSubscriptionCode)
  } catch (err) {
    logger.warn({ err: err.message, orgId }, 'Could not fetch live Paystack sub for trial reminder')
    return null
  }
}

export async function runTrialEmailsTick() {
  const now = new Date()
  const reminderWindowStart = new Date(now.getTime() + REMINDER_LEAD_HOURS_MIN * 3600 * 1000)
  const reminderWindowEnd   = new Date(now.getTime() + REMINDER_LEAD_HOURS_MAX * 3600 * 1000)

  const candidates = await db.query.organizations.findMany({
    where: and(
      isNotNull(organizations.trialEndsAt),
      gte(organizations.trialEndsAt, reminderWindowStart),
      lte(organizations.trialEndsAt, reminderWindowEnd)
    )
  })
  logger.info({ count: candidates.length }, 'Trial-reminder candidates this tick')

  for (const org of candidates) {
    if (org.trialEmailsSent?.ending_tomorrow) continue
    if (!org.paystackAuthCode) {
      // Defensive log only — card is required at signup, so this should never fire.
      logger.warn({ orgId: org.id }, 'Org has no paystackAuthCode but is trialing; skipping reminder')
      continue
    }

    const owner = await ownerForOrg(org.id)
    if (!owner?.email) continue

    const live = await liveSubscriptionForOrg(org.id)
    const amount     = live?.amount ?? live?.plan?.amount ?? 0
    const currency   = live?.plan?.currency ?? 'ZAR'
    const planName   = live?.plan?.name ?? org.plan ?? 'Subscription'
    const chargeDate = live?.next_payment_date ?? org.trialEndsAt
    const last4      = live?.authorization?.last4 || null

    const result = await sendTrialChargeReminderEmail({
      to: owner.email,
      name: owner.name,
      orgName: org.name,
      planName, amount, currency, chargeDate, last4
    })

    if (result?.success !== false) {
      const updated = { ...(org.trialEmailsSent || {}), ending_tomorrow: new Date().toISOString() }
      await db.update(organizations)
        .set({ trialEmailsSent: updated, updatedAt: new Date() })
        .where(eq(organizations.id, org.id))
      logger.info({ orgId: org.id }, 'Trial-ending-tomorrow email sent')
    } else {
      logger.warn({ orgId: org.id, error: result.error }, 'Trial reminder failed; will retry next tick')
    }
  }
}
