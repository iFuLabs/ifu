import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const COMPANY_NAME = 'iFu Labs'
const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3003'

/**
 * Send welcome email to new user after signup
 */
export async function sendWelcomeEmail({ to, name, orgName }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to ${COMPANY_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Welcome to ${COMPANY_NAME}!</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                
                <p>Thanks for signing up! Your organization <strong>${orgName}</strong> is now set up and ready to go.</p>
                
                <p><strong>What's next?</strong></p>
                <ul>
                  <li>Connect your AWS account to start automated compliance scanning</li>
                  <li>Invite your team members to collaborate</li>
                  <li>Explore your compliance dashboard</li>
                </ul>
                
                <p>You're on a 14-day free trial with full access to all features. No credit card required.</p>
                
                <a href="${PORTAL_URL}/dashboard" class="button">Go to Dashboard</a>
                
                <p>If you have any questions, just reply to this email. We're here to help!</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p>${COMPANY_NAME} - Compliance Automation & Cloud Cost Optimization</p>
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
export async function sendTeamInvitationEmail({ to, inviterName, orgName, role, inviteUrl, expiresAt }) {
  try {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${inviterName} invited you to join ${orgName} on ${COMPANY_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                
                <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on ${COMPANY_NAME}.</p>
                
                <div class="info-box">
                  <p style="margin: 0;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Expires:</strong> ${expiryDate}</p>
                </div>
                
                <p>Click the button below to accept the invitation and create your account:</p>
                
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
                
                <p class="warning">⚠️ This invitation link will expire on ${expiryDate}.</p>
                
                <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p>${COMPANY_NAME} - Compliance Automation & Cloud Cost Optimization</p>
                <p style="font-size: 12px; color: #9ca3af;">This invitation was sent to ${to}</p>
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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reset your ${COMPANY_NAME} password`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Password Reset</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                
                <p>We received a request to reset your password for your ${COMPANY_NAME} account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <p class="warning">⚠️ This link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
              </div>
              <div class="footer">
                <p>${COMPANY_NAME} - Compliance Automation & Cloud Cost Optimization</p>
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
