/**
 * Ghara trial email drip — runs hourly alongside the existing trialEmailsCron.
 *
 * Ghara trials are 7 days, no credit card required. The drip sequence:
 *   Day 0: Welcome + scan results summary (sent at signup, not from this cron)
 *   Day 1: Quick tips email
 *   Day 3: Drift check — "here's what changed since your first scan"
 *   Day 5: Mid-trial summary with savings + compliance progress
 *   Day 6: Trial ending tomorrow + upgrade CTA
 *   Day 7: Trial ended, account read-only, upgrade CTA
 *
 * Idempotency: each email is tracked in organizations.trialEmailsSent JSONB.
 */

import { db } from '../db/client.js'
import { organizations, users, subscriptions } from '../db/schema.js'
import { eq, and, isNotNull } from 'drizzle-orm'
import { logger } from '../services/logger.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'info@ifulabs.com'

const DRIP_SCHEDULE = [
  { key: 'ghara_day1_tips', dayAfterStart: 1, subject: 'Quick tips to get the most from Ghara' },
  { key: 'ghara_day3_drift', dayAfterStart: 3, subject: 'What changed in your AWS since day 1' },
  { key: 'ghara_day5_summary', dayAfterStart: 5, subject: 'Your mid-trial progress report' },
  { key: 'ghara_day6_ending', dayAfterStart: 6, subject: 'Your Ghara trial ends tomorrow' },
  { key: 'ghara_day7_ended', dayAfterStart: 7, subject: 'Your trial has ended — upgrade to keep going' },
]

export async function runGharaTrialDrip() {
  // Find all orgs with a Ghara trial subscription
  const trialSubs = await db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.status, 'trialing'),
      eq(subscriptions.product, 'ghara'),
      isNotNull(subscriptions.trialEndsAt)
    )
  })

  logger.info({ count: trialSubs.length }, 'Ghara trial drip: checking subscriptions')

  for (const sub of trialSubs) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, sub.orgId)
    })
    if (!org) continue

    const owner = await db.query.users.findFirst({
      where: and(eq(users.orgId, org.id), eq(users.role, 'owner'))
    })
    if (!owner?.email) continue

    const trialStartedAt = sub.createdAt
    const daysSinceStart = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / (1000 * 60 * 60 * 24))
    const emailsSent = org.trialEmailsSent || {}

    for (const drip of DRIP_SCHEDULE) {
      // Skip if already sent
      if (emailsSent[drip.key]) continue

      // Skip if not time yet (allow 2h window for cron jitter)
      if (daysSinceStart < drip.dayAfterStart) continue
      if (daysSinceStart > drip.dayAfterStart + 1) continue // Don't send stale emails

      try {
        await resend.emails.send({
          from: `Ghara <product@${DOMAIN}>`,
          to: owner.email,
          replyTo: REPLY_TO,
          subject: drip.subject,
          html: buildDripEmail(drip.key, { name: owner.name, orgName: org.name, trialEndsAt: sub.trialEndsAt }),
        })

        // Mark as sent
        const updated = { ...emailsSent, [drip.key]: new Date().toISOString() }
        await db.update(organizations)
          .set({ trialEmailsSent: updated, updatedAt: new Date() })
          .where(eq(organizations.id, org.id))

        logger.info({ orgId: org.id, email: drip.key }, 'Ghara trial drip email sent')
      } catch (err) {
        logger.warn({ orgId: org.id, email: drip.key, err: err.message }, 'Ghara trial drip email failed')
      }
    }
  }
}

function buildDripEmail(key, { name, orgName, trialEndsAt }) {
  const firstName = name?.split(' ')[0] || 'there'
  const endDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'soon'

  const templates = {
    ghara_day1_tips: `
      <h2>Hey ${firstName},</h2>
      <p>Welcome to Ghara! Here are a few tips to get the most from your trial:</p>
      <ul>
        <li><strong>Check your dashboard daily</strong> — new findings appear as your infrastructure changes.</li>
        <li><strong>Invite your team</strong> — compliance is a team sport. Add teammates from Settings → Team.</li>
        <li><strong>Connect GitHub</strong> — we'll check branch protection, secret scanning, and CODEOWNERS.</li>
      </ul>
      <p><a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/dashboard">Open your dashboard →</a></p>
    `,
    ghara_day3_drift: `
      <h2>Hey ${firstName},</h2>
      <p>It's been 3 days since your first scan. Here's a quick check-in on ${orgName}'s cloud health.</p>
      <p>Log in to see if any controls have drifted since your initial scan — we track changes automatically.</p>
      <p><a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/dashboard">Check for drift →</a></p>
    `,
    ghara_day5_summary: `
      <h2>Mid-trial check-in</h2>
      <p>Hey ${firstName}, you're halfway through your Ghara trial. Here's what we've found so far for ${orgName}:</p>
      <p>Log in to see your full compliance score, cost savings opportunities, and security findings.</p>
      <p><a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/dashboard">View your progress →</a></p>
      <p>Your trial ends on ${endDate}. <a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/billing">Upgrade now</a> to keep full access.</p>
    `,
    ghara_day6_ending: `
      <h2>Your trial ends tomorrow</h2>
      <p>Hey ${firstName}, your Ghara trial for ${orgName} ends tomorrow (${endDate}).</p>
      <p>After that, your account moves to read-only mode — you can still view your data, but scans and alerts will pause.</p>
      <p><strong><a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/billing">Upgrade now to keep full access →</a></strong></p>
    `,
    ghara_day7_ended: `
      <h2>Your trial has ended</h2>
      <p>Hey ${firstName}, your Ghara trial for ${orgName} has ended.</p>
      <p>Your account is now in read-only mode. Your data is safe — scans and alerts are paused until you upgrade.</p>
      <p><strong><a href="${process.env.PORTAL_URL || 'http://localhost:3005'}/billing">Upgrade to reactivate →</a></strong></p>
      <p>Questions? Reply to this email — we're happy to help.</p>
    `,
  }

  return templates[key] || ''
}
