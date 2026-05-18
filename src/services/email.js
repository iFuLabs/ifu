import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'info@ifulabs.com'
const COMPANY_NAME = 'Ghara by iFU Labs'
const PORTAL_URL = process.env.GHARA_URL || process.env.PORTAL_URL || 'http://localhost:3005'

// Helper to create from address with reply-to
function getEmailConfig(emailPrefix) {
  return {
    from: `${COMPANY_NAME} <${emailPrefix}@${DOMAIN}>`,
    replyTo: REPLY_TO_EMAIL
  }
}

// ── Shared email primitives ────────────────────────────────────────────────
// All emails use the same header/footer so branding is consistent.

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #33063D; margin: 0; padding: 0; background-color: #F4F4F4; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #33063D; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .header-subject { font-size: 16px; color: #DAC0FD; margin: 14px 0 0 0; font-weight: 500; }
  .content { background: #ffffff; padding: 40px 30px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; background: #33063D; color: #FFFFFF !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
  .highlight { background: #DAC0FD; padding: 16px; border-radius: 6px; margin: 20px 0; }
  .summary { background: #DAC0FD; padding: 16px; border-radius: 6px; margin: 20px 0; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .warning { color: #B42318; font-size: 14px; margin-top: 20px; padding: 15px; background: #FEF3F2; border-radius: 6px; border-left: 4px solid #B42318; }
  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 13px; }
  .meta { color: #6b7280; font-size: 13px; }
  ul { padding-left: 20px; }
  li { margin: 8px 0; color: #33063D; }
`

export function emailHeader(subjectLine = '', bgColor = '#33063D') {
  return `
    <div class="header" style="background: ${bgColor};">
      <span style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin-right: 6px;">Ghara</span>
      <span style="font-size: 11px; color: rgba(255,255,255,0.7);">by</span>
      <img src="https://www.ifulabs.com/logos/white.svg" alt="iFU Labs" style="height: 20px; width: auto; vertical-align: middle; margin-left: 5px;" />
      ${subjectLine ? `<p class="header-subject">${subjectLine}</p>` : ''}
    </div>
  `
}

export function emailFooter(to) {
  return `
    <div class="footer">
      <p><strong>Ghara</strong> by iFU Labs</p>
      <p style="font-size: 12px; color: #9ca3af;">${to}</p>
    </div>
  `
}

export function emailWrap(header, content, footer) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head><body>
    <div class="container">
      ${header}
      <div class="content">${content}</div>
      ${footer}
    </div>
  </body></html>`
}

// ── Emails ─────────────────────────────────────────────────────────────────

/**
 * Send welcome email to new user after signup
 */
export async function sendWelcomeEmail({ to, name, orgName }) {
  try {
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('welcome'),
      to,
      subject: `Welcome to ${COMPANY_NAME}!`,
      html: emailWrap(
        emailHeader(),
        `
        <p>Hi ${name || 'there'},</p>
        <p>Thanks for signing up! Your organization <strong>${orgName}</strong> is now set up and ready to go.</p>
        <div class="highlight">
          <p style="margin: 0; font-weight: 500;">What's next?</p>
          <ul style="margin: 10px 0 0 0;">
            <li>Connect your AWS account to start automated compliance scanning</li>
            <li>Invite your team members to collaborate</li>
            <li>Explore your compliance and cost dashboards</li>
          </ul>
        </div>
        <p>You're on a <strong>7-day free trial</strong> with full access to all Growth features. Your card on file will be charged automatically when the trial ends — we'll email you a reminder the day before.</p>
        <a href="${PORTAL_URL}/dashboard" class="button">Go to Dashboard →</a>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, just reply to this email. We're here to help.</p>
        <p>Regards,<br>The Ghara Team</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('Failed to send welcome email:', error); return { success: false, error } }
    console.log('Welcome email sent:', data)
    return { success: true, data }
  } catch (err) { console.error('Welcome email error:', err); return { success: false, error: err.message } }
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail({ to, inviterName, orgName, role, inviteUrl, expiresAt }) {
  try {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('team'),
      to,
      subject: `${inviterName} invited you to join ${orgName} on Ghara`,
      html: emailWrap(
        emailHeader(),
        `
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Ghara.</p>
        <div class="highlight">
          <p style="margin: 0;"><strong>Organization:</strong> ${orgName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Expires:</strong> ${expiryDate}</p>
        </div>
        <p>Click the button below to accept the invitation and create your account:</p>
        <a href="${inviteUrl}" class="button">Accept Invitation →</a>
        <div class="warning">⚠️ This invitation link will expire on ${expiryDate}.</div>
        <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
        <p>Regards,<br>The Ghara Team</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('Failed to send invitation email:', error); return { success: false, error } }
    console.log('Invitation email sent:', data)
    return { success: true, data }
  } catch (err) { console.error('Invitation email error:', err); return { success: false, error: err.message } }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  try {
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('security'),
      to,
      subject: `Reset your ${COMPANY_NAME} password`,
      html: emailWrap(
        emailHeader(),
        `
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password for your ${COMPANY_NAME} account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password →</a>
        <div class="warning">⚠️ This link will expire in 1 hour for security reasons.</div>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p>Regards,<br>The Ghara Team</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('Failed to send password reset email:', error); return { success: false, error } }
    console.log('Password reset email sent:', data)
    return { success: true, data }
  } catch (err) { console.error('Password reset email error:', err); return { success: false, error: err.message } }
}

/**
 * Send control drift alert email (controls that flipped pass → fail)
 */
export async function sendControlDriftEmail({ to, orgName, drifted, scanId }) {
  try {
    const controlList = drifted.slice(0, 10).map(c =>
      `<li><strong>${c.controlId}</strong> — ${c.title} <span style="color: #B42318;">(${c.framework})</span></li>`
    ).join('')
    const moreText = drifted.length > 10 ? `<p style="color: #6b7280; font-size: 13px;">+${drifted.length - 10} more controls affected</p>` : ''
    const recipients = Array.isArray(to) ? to : [to]

    const { data, error } = await resend.emails.send({
      ...getEmailConfig('alerts'),
      to: recipients,
      subject: `⚠️ ${drifted.length} control(s) drifted — ${orgName}`,
      html: emailWrap(
        emailHeader(),
        `
        <div style="background: #FEF3F2; border-left: 4px solid #B42318; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #B42318; font-weight: 600;">${drifted.length} control(s) flipped from pass to fail</p>
        </div>
        <p>Hi team,</p>
        <p>A compliance scan for <strong>${orgName}</strong> detected controls that were previously passing but are now failing:</p>
        <ul style="padding-left: 20px;">${controlList}</ul>
        ${moreText}
        <a href="${PORTAL_URL}" class="button">View in Dashboard →</a>
        <p style="margin-top: 20px;">Regards,<br>The Ghara Team</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">Scan ID: ${scanId}</p>
        `,
        `<div class="footer"><p><strong>Ghara</strong> by iFU Labs</p></div>`
      )
    })
    if (error) { console.error('Failed to send drift email:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('Drift email error:', err); return { success: false, error: err.message } }
}

// ── Trial-lifecycle emails ────────────────────────────────────────────────

function formatCurrency(amount, currency = 'ZAR') {
  const major = (amount || 0) / 100
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(major)
  } catch {
    return `${currency} ${major.toFixed(2)}`
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * T-24h reminder before auto-charge
 */
export async function sendTrialChargeReminderEmail({ to, name, orgName, planName, amount, currency, chargeDate, last4 }) {
  try {
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('billing'),
      to,
      subject: `Heads-up: your Ghara trial ends tomorrow`,
      html: emailWrap(
        emailHeader('Your trial ends tomorrow'),
        `
        <p>Hi ${name || 'there'},</p>
        <p>This is a friendly reminder that <strong>${orgName}</strong>'s free trial of ${planName} ends tomorrow. Your payment method on file will be charged automatically — no action needed if you'd like to continue.</p>
        <div class="summary">
          <div class="summary-row"><span>Plan</span><strong>${planName}</strong></div>
          <div class="summary-row"><span>Amount</span><strong>${formatCurrency(amount, currency)}</strong></div>
          <div class="summary-row"><span>Charge date</span><strong>${formatDate(chargeDate)}</strong></div>
          ${last4 ? `<div class="summary-row"><span>Card</span><strong>•••• ${last4}</strong></div>` : ''}
        </div>
        <p>If you'd like to cancel before the charge, you can do so from the billing dashboard.</p>
        <a href="${PORTAL_URL}/billing" class="button">Manage subscription</a>
        <p>Regards,<br>The Ghara Team</p>
        <p class="meta">This is a billing notification you cannot opt out of while you have an active subscription. Reply to this email if you need help.</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('trial reminder email failed:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('trial reminder error:', err); return { success: false, error: err.message } }
}

/**
 * Payment receipt
 */
export async function sendChargeReceiptEmail({ to, name, orgName, planName, amount, currency, reference, nextPaymentDate, last4 }) {
  try {
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('billing'),
      to,
      subject: `Receipt — ${formatCurrency(amount, currency)} for ${planName}`,
      html: emailWrap(
        emailHeader('Payment received — thank you'),
        `
        <p>Hi ${name || 'there'},</p>
        <p>We've received payment for <strong>${orgName}</strong>'s ${planName} subscription.</p>
        <div class="summary">
          <div class="summary-row"><span>Plan</span><strong>${planName}</strong></div>
          <div class="summary-row"><span>Amount</span><strong>${formatCurrency(amount, currency)}</strong></div>
          ${reference ? `<div class="summary-row"><span>Reference</span><strong>${reference}</strong></div>` : ''}
          ${last4 ? `<div class="summary-row"><span>Card</span><strong>•••• ${last4}</strong></div>` : ''}
          ${nextPaymentDate ? `<div class="summary-row"><span>Next payment</span><strong>${formatDate(nextPaymentDate)}</strong></div>` : ''}
        </div>
        <a href="${PORTAL_URL}/billing" class="button">View billing</a>
        <p>Regards,<br>The Ghara Team</p>
        <p class="meta">Need a tax invoice? Reply and we'll send one over.</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('charge receipt email failed:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('charge receipt error:', err); return { success: false, error: err.message } }
}

/**
 * Payment failed
 */
export async function sendPaymentFailedEmail({ to, name, orgName, planName, amount, currency, last4 }) {
  try {
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('billing'),
      to,
      subject: `Action needed — payment for ${orgName} failed`,
      html: emailWrap(
        emailHeader('Payment failed', '#B42318'),
        `
        <p>Hi ${name || 'there'},</p>
        <p>We weren't able to process the latest payment of <strong>${formatCurrency(amount, currency)}</strong> for <strong>${orgName}</strong>'s ${planName} subscription${last4 ? ` on card •••• ${last4}` : ''}.</p>
        <p>Paystack will automatically retry the charge over the next few days. To avoid interruption to your scans and dashboards, please update your payment method now.</p>
        <a href="${PORTAL_URL}/billing" class="button">Update payment method</a>
        <p>Regards,<br>The Ghara Team</p>
        <p class="meta">If your card is fine and this looks like a mistake, reply to this email and we'll investigate.</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('payment failed email failed:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('payment failed email error:', err); return { success: false, error: err.message } }
}

/**
 * Integration failure alert
 */
export async function sendIntegrationFailureEmail({ to, name, orgName, integrationType, errorMessage, dashboardUrl }) {
  try {
    const url = dashboardUrl || `${PORTAL_URL}/integrations`
    const typeLabel = integrationType === 'aws' ? 'AWS' : (integrationType || 'integration').toUpperCase()
    const { data, error } = await resend.emails.send({
      ...getEmailConfig('alerts'),
      to,
      subject: `Action needed — ${orgName}'s ${typeLabel} integration is failing`,
      html: emailWrap(
        emailHeader(`Your ${typeLabel} scan is failing`, '#B42318'),
        `
        <p>Hi ${name || 'there'},</p>
        <p>Our latest scheduled scan against <strong>${orgName}</strong>'s ${typeLabel} account couldn't complete. The most common causes are an IAM role being modified, removed, or having its trust policy changed.</p>
        <div class="summary">
          <div style="font-family: monospace; font-size: 12px; color: #B42318; word-break: break-word;">${(errorMessage || 'Unknown error').replace(/</g, '&lt;')}</div>
        </div>
        <p>Until this is resolved, your dashboards will show stale data and scheduled scans will keep failing.</p>
        <a href="${url}" class="button">Reconnect ${typeLabel}</a>
        <p>Regards,<br>The Ghara Team</p>
        <p class="meta">You'll receive at most one of these per day. If the next scan succeeds, you won't hear from us again.</p>
        `,
        emailFooter(to)
      )
    })
    if (error) { console.error('integration failure email failed:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('integration failure email error:', err); return { success: false, error: err.message } }
}

/**
 * K8s cost alert email — sent when new high-severity findings, cost spikes,
 * or connection failures are detected during a scheduled K8s scan.
 */
export async function sendK8sAlertEmail({ to, orgName, clusterName, alerts }) {
  try {
    const alertList = alerts.map(a => {
      if (a.type === 'connection_failure') {
        return `<li style="margin:8px 0;color:#B42318;"><strong>Connection failure</strong> — ${a.detail}</li>`
      }
      if (a.type === 'cost_spike') {
        return `<li style="margin:8px 0;"><strong>Cost spike</strong> — ${a.detail}</li>`
      }
      return `<li style="margin:8px 0;"><strong>${a.severity?.toUpperCase() || 'HIGH'}</strong> — ${a.detail}</li>`
    }).join('')

    const { data, error } = await resend.emails.send({
      ...getEmailConfig('alerts'),
      to: Array.isArray(to) ? to : [to],
      subject: `⚠️ Kubernetes alert — ${clusterName} (${orgName})`,
      html: emailWrap(
        emailHeader(),
        `
        <div style="background:#FEF3F2;border-left:4px solid #B42318;padding:16px;border-radius:6px;margin-bottom:20px;">
          <p style="margin:0;color:#B42318;font-weight:600;">${alerts.length} alert${alerts.length > 1 ? 's' : ''} detected on cluster "${clusterName}"</p>
        </div>
        <p>Hi team,</p>
        <p>Ghara detected the following issues on the <strong>${clusterName}</strong> cluster for <strong>${orgName}</strong>:</p>
        <ul style="padding-left:20px;">${alertList}</ul>
        <a href="${PORTAL_URL}/cost" class="button">View in Dashboard →</a>
        <p style="margin-top:20px;">Regards,<br>The Ghara Team</p>
        `,
        `<div class="footer"><p><strong>Ghara</strong> by iFU Labs</p></div>`
      )
    })
    if (error) { console.error('K8s alert email failed:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) { console.error('K8s alert email error:', err); return { success: false, error: err.message } }
}
