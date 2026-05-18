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
import { emailHeader, emailFooter, emailWrap } from '../services/email.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'info@ifulabs.com'

const DRIP_SCHEDULE = [
  { key: 'ghara_day1_tips', dayAfterStart: 1, subject: 'Quick tips to get the most from Ghara' },
  { key: 'ghara_day3_drift', dayAfterStart: 3, subject: 'What changed in your AWS since day 1' },
  { key: 'ghara_day5_summary', dayAfterStart: 5, subject: 'Your mid-trial progress report' },
  { key: 'ghara_day6_ending', dayAfterStart: 6, subject: 'Heads up — your card will be charged tomorrow' },
  { key: 'ghara_day7_ended', dayAfterStart: 7, subject: 'Your trial has ended — your subscription is now active' },
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
          html: buildDripEmail(drip.key, { name: owner.name, orgName: org.name, trialEndsAt: sub.trialEndsAt, to: owner.email }),
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

function buildDripEmail(key, { name, orgName, trialEndsAt, to = '' }) {
  const firstName = name?.split(' ')[0] || 'there'
  const endDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'soon'
  const PORTAL_URL = process.env.PORTAL_URL || process.env.GHARA_URL || 'http://localhost:3005'

  const bodies = {
    ghara_day1_tips: `
      <p>Hey ${firstName},</p>
      <p>Welcome to Ghara! Here are a few tips to get the most from your trial:</p>
      <ul>
        <li><strong>Check your dashboard daily</strong> — new findings appear as your infrastructure changes.</li>
        <li><strong>Invite your team</strong> — compliance is a team sport. Add teammates from Settings → Team.</li>
        <li><strong>Connect GitHub</strong> — we'll check branch protection, secret scanning, and CODEOWNERS.</li>
      </ul>
      <a href="${PORTAL_URL}/dashboard" class="button">Open your dashboard →</a>
      <p>Regards,<br>The Ghara Team</p>
    `,
    ghara_day3_drift: `
      <p>Hey ${firstName},</p>
      <p>It's been 3 days since your first scan. Here's a quick check-in on <strong>${orgName}</strong>'s cloud health.</p>
      <p>Log in to see if any controls have drifted since your initial scan — we track changes automatically.</p>
      <a href="${PORTAL_URL}/dashboard" class="button">Check for drift →</a>
      <p>Regards,<br>The Ghara Team</p>
    `,
    ghara_day5_summary: `
      <p>Hey ${firstName},</p>
      <p>You're halfway through your Ghara trial. Log in to see your full compliance score, cost savings opportunities, and security findings for <strong>${orgName}</strong>.</p>
      <a href="${PORTAL_URL}/dashboard" class="button">View your progress →</a>
      <p>Your trial ends on <strong>${endDate}</strong>. <a href="${PORTAL_URL}/billing">Upgrade now</a> to keep full access.</p>
      <p>Regards,<br>The Ghara Team</p>
    `,
    ghara_day6_ending: `
      <p>Hey ${firstName},</p>
      <p>Your Ghara trial for <strong>${orgName}</strong> ends tomorrow (<strong>${endDate}</strong>).</p>
      <p>Your card on file will be charged automatically. If you'd like to cancel before then, you can do so with one click from your billing page — no charge.</p>
      <a href="${PORTAL_URL}/billing" class="button">Manage billing →</a>
      <p>Regards,<br>The Ghara Team</p>
    `,
    ghara_day7_ended: `
      <p>Hey ${firstName},</p>
      <p>Your Ghara trial for <strong>${orgName}</strong> has ended and your subscription is now active.</p>
      <p>Your card has been charged. You'll continue to have full access to all features on your plan.</p>
      <a href="${PORTAL_URL}/dashboard" class="button">Go to dashboard →</a>
      <p>Questions? Reply to this email — we're happy to help.</p>
      <p>Regards,<br>The Ghara Team</p>
    `,
  }

  const body = bodies[key]
  if (!body) return ''

  const subjectMap = {
    ghara_day1_tips: 'Quick tips to get the most from Ghara',
    ghara_day3_drift: "What changed in your AWS since day 1",
    ghara_day5_summary: 'Your mid-trial progress report',
    ghara_day6_ending: 'Heads up — your card will be charged tomorrow',
    ghara_day7_ended: 'Your subscription is now active',
  }

  return emailWrap(
    emailHeader(subjectMap[key] || ''),
    body,
    emailFooter(to)
  )
}
