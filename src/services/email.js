import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'info@ifulabs.com'
const COMPANY_NAME = 'iFu Labs'
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3003'

// Helper to create from address with reply-to
function getEmailConfig(emailPrefix) {
  return {
    from: `${COMPANY_NAME} <${emailPrefix}@${DOMAIN}>`,
    replyTo: REPLY_TO_EMAIL
  }
}

/**
 * Send welcome email to new user after signup
 */
export async function sendWelcomeEmail({ to, name, orgName }) {
  try {
    const emailConfig = getEmailConfig('welcome')
    const { data, error } = await resend.emails.send({
      ...emailConfig,
      to,
      subject: `Welcome to ${COMPANY_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1A4D3C; color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .logo { margin-bottom: 10px; }
              .logo img { height: 40px; width: auto; display: inline-block; }
              .tagline { font-size: 14px; color: #E8F2EE; opacity: 0.9; margin: 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #1A4D3C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .button:hover { background: #15402F; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              ul { padding-left: 20px; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo"><img src="https://www.ifulabs.com/logos/white.svg" alt="iFu Labs" style="height: 40px; width: auto;" /></div>
                <p class="tagline">Compliance Automation & Cloud Cost Optimization</p>
              </div>
              <div class="content">
                <p>Hi ${name || 'there'},</p>
                
                <p>Thanks for signing up! Your organization <strong>${orgName}</strong> is now set up and ready to go.</p>
                
                <p><strong>What's next?</strong></p>
                <ul>
                  <li>Connect your AWS account to start automated compliance scanning</li>
                  <li>Invite your team members to collaborate</li>
                  <li>Explore your compliance dashboard</li>
                </ul>
                
                <p>You're on a 3-day free trial with full access to all features. No credit card required.</p>
                
                <a href="${PORTAL_URL}" class="button">Go to Dashboard</a>
                
                <p>If you have any questions, just reply to this email. We're here to help!</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p><strong>iFu Labs</strong></p>
                <p style="margin: 5px 0;">Compliance Automation & Cloud Cost Optimization</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">This email was sent to ${to}</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error }
    }

    console.log('Welcome email sent:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Welcome email error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail({ to, inviterName, orgName, role, product = 'comply', inviteUrl, expiresAt }) {
  try {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    const productName = product === 'finops' ? 'iFu Labs FinOps' : 'iFu Labs Comply'
    const productTagline = product === 'finops' ? 'Cloud Cost Optimization' : 'Compliance Automation'

    const emailConfig = getEmailConfig('team')
    const { data, error } = await resend.emails.send({
      ...emailConfig,
      to,
      subject: `${inviterName} invited you to join ${orgName} on ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1A4D3C; color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .logo { margin-bottom: 10px; }
              .logo img { height: 40px; width: auto; display: inline-block; }
              .tagline { font-size: 14px; color: #E8F2EE; opacity: 0.9; margin: 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #1A4D3C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .button:hover { background: #15402F; }
              .info-box { background: #E8F2EE; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1A4D3C; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .warning { color: #dc2626; font-size: 14px; margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo"><img src="https://www.ifulabs.com/logos/white.svg" alt="iFu Labs" style="height: 40px; width: auto;" /></div>
                <p class="tagline">${productTagline}</p>
              </div>
              <div class="content">
                <p>Hi there,</p>
                
                <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on <strong>${productName}</strong>.</p>
                
                <div class="info-box">
                  <p style="margin: 0;"><strong>Product:</strong> ${productName}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Expires:</strong> ${expiryDate}</p>
                </div>
                
                <p>Click the button below to accept the invitation and create your account:</p>
                
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
                
                <div class="warning">
                  ⚠️ This invitation link will expire on ${expiryDate}.
                </div>
                
                <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p><strong>${productName}</strong></p>
                <p style="margin: 5px 0;">${productTagline}</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">This invitation was sent to ${to}</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send invitation email:', error)
      return { success: false, error }
    }

    console.log('Invitation email sent:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Invitation email error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Send password reset email (for future implementation)
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  try {
    const emailConfig = getEmailConfig('security')
    const { data, error } = await resend.emails.send({
      ...emailConfig,
      to,
      subject: `Reset your ${COMPANY_NAME} password`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1A4D3C; color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .logo { margin-bottom: 10px; }
              .logo img { height: 40px; width: auto; display: inline-block; }
              .tagline { font-size: 14px; color: #E8F2EE; opacity: 0.9; margin: 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #1A4D3C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .button:hover { background: #15402F; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .warning { color: #dc2626; font-size: 14px; margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo"><img src="https://www.ifulabs.com/logos/white.svg" alt="iFu Labs" style="height: 40px; width: auto;" /></div>
                <p class="tagline">Compliance Automation & Cloud Cost Optimization</p>
              </div>
              <div class="content">
                <p>Hi ${name || 'there'},</p>
                
                <p>We received a request to reset your password for your ${COMPANY_NAME} account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <div class="warning">
                  ⚠️ This link will expire in 1 hour for security reasons.
                </div>
                
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p><strong>iFu Labs</strong></p>
                <p style="margin: 5px 0;">Compliance Automation & Cloud Cost Optimization</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">This email was sent to ${to}</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error }
    }

    console.log('Password reset email sent:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Password reset email error:', err)
    return { success: false, error: err.message }
  }
}


/**
 * Send control drift alert email (controls that flipped pass → fail)
 */
export async function sendControlDriftEmail({ to, orgName, drifted, scanId }) {
  try {
    const emailConfig = getEmailConfig('alerts')
    const controlList = drifted.slice(0, 10).map(c =>
      `<li><strong>${c.controlId}</strong> — ${c.title} <span style="color: #B42318;">(${c.framework})</span></li>`
    ).join('')
    const moreText = drifted.length > 10 ? `<p style="color: #6b7280; font-size: 13px;">+${drifted.length - 10} more controls affected</p>` : ''

    const recipients = Array.isArray(to) ? to : [to]

    const { data, error } = await resend.emails.send({
      ...emailConfig,
      to: recipients,
      subject: `⚠️ ${drifted.length} control(s) drifted — ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #33063D; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <img src="https://www.ifulabs.com/logos/white.svg" alt="iFu Labs" style="height: 36px; width: auto;" />
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <div style="background: #FEF3F2; border-left: 4px solid #B42318; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #B42318; font-weight: 600;">${drifted.length} control(s) flipped from pass to fail</p>
                </div>
                <p>Hi team,</p>
                <p>A compliance scan for <strong>${orgName}</strong> detected controls that were previously passing but are now failing:</p>
                <ul style="padding-left: 20px;">${controlList}</ul>
                ${moreText}
                <a href="${PORTAL_URL}" style="display: inline-block; background: #33063D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500;">View in Dashboard</a>
                <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Scan ID: ${scanId}</p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send drift email:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('Drift email error:', err)
    return { success: false, error: err.message }
  }
}
