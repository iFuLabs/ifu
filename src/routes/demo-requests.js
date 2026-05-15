/**
 * Demo request route — receives form submissions from the marketing site
 * and sends a notification email to the sales team.
 */
import { Resend } from 'resend'
import { logger } from '../services/logger.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEMO_NOTIFY_EMAIL = process.env.DEMO_NOTIFY_EMAIL || 'caleb.ackom@ifulabs.com'
const DOMAIN = process.env.EMAIL_DOMAIN || 'resend.dev'

export default async function demoRequestRoutes(fastify) {

  // POST /api/v1/demo-requests
  // Public endpoint — no auth required (marketing site form)
  fastify.post('/', {
    schema: {
      tags: ['Demo'],
      body: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          company: { type: 'string' },
          role: { type: 'string' },
          awsSpend: { type: 'string' },
          message: { type: 'string' },
        }
      }
    }
  }, async (request, reply) => {
    const { name, email, company, role, awsSpend, message } = request.body

    try {
      await resend.emails.send({
        from: `Ghara Demos <demos@${DOMAIN}>`,
        to: DEMO_NOTIFY_EMAIL,
        replyTo: email,
        subject: `🎯 Demo request — ${company || name}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #33063D; color: #fff; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 18px;">New Demo Request</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                ${company ? `<tr><td style="padding: 8px 0; color: #6b7280;">Company</td><td style="padding: 8px 0;">${company}</td></tr>` : ''}
                ${role ? `<tr><td style="padding: 8px 0; color: #6b7280;">Role</td><td style="padding: 8px 0;">${role}</td></tr>` : ''}
                ${awsSpend ? `<tr><td style="padding: 8px 0; color: #6b7280;">AWS Spend</td><td style="padding: 8px 0;">${awsSpend}</td></tr>` : ''}
                ${message ? `<tr><td style="padding: 8px 0; color: #6b7280;">Message</td><td style="padding: 8px 0;">${message}</td></tr>` : ''}
              </table>
              <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Reply directly to this email to respond to ${name}.</p>
            </div>
          </div>
        `
      })

      logger.info({ email, company, role }, 'Demo request received')
    } catch (err) {
      logger.warn({ err: err.message, email }, 'Failed to send demo notification email')
      // Don't fail the request — the form should still show success
    }

    return reply.send({ success: true, message: 'Demo request received' })
  })
}
