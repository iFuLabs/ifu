// Webhook dispatch service — sends events to registered webhook URLs
import crypto from 'crypto'
import { db } from '../db/client.js'
import { webhooks, webhookDeliveries } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

/**
 * Dispatch a webhook event to all active webhooks subscribed to that event type
 * @param {string} orgId - Organization ID
 * @param {string} event - Event name (e.g. 'scan.complete', 'control.drift', 'finops.anomaly')
 * @param {object} payload - Event payload
 * @returns {Promise<void>}
 */
export async function dispatchWebhook(orgId, event, payload) {
  // Find all active webhooks for this org that are subscribed to this event
  const activeWebhooks = await db.query.webhooks.findMany({
    where: and(
      eq(webhooks.orgId, orgId),
      eq(webhooks.active, true)
    )
  })

  const matchingWebhooks = activeWebhooks.filter(wh => {
    const events = Array.isArray(wh.events) ? wh.events : []
    return events.includes(event) || events.includes('*')
  })

  if (matchingWebhooks.length === 0) {
    return // No webhooks to dispatch
  }

  // Dispatch to each webhook (fire and forget — actual delivery happens in worker)
  const { webhookQueue } = await import('../jobs/queues.js')
  
  for (const webhook of matchingWebhooks) {
    await webhookQueue.add('webhook-delivery', {
      webhookId: webhook.id,
      event,
      payload,
      attempt: 1
    })
  }
}

/**
 * Deliver a webhook (called by worker)
 * @param {string} webhookId - Webhook ID
 * @param {string} event - Event name
 * @param {object} payload - Event payload
 * @param {number} attempt - Attempt number (1-3)
 * @returns {Promise<{success: boolean, statusCode?: number, error?: string}>}
 */
export async function deliverWebhook(webhookId, event, payload, attempt = 1) {
  const webhook = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, webhookId)
  })

  if (!webhook) {
    return { success: false, error: 'Webhook not found' }
  }

  const body = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
    attempt
  })

  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(body)
    .digest('hex')

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-iFU-Signature': signature,
        'X-iFU-Event': event,
        'User-Agent': 'iFU-Labs-Webhooks/1.0'
      },
      body,
      signal: AbortSignal.timeout(10000) // 10s timeout
    })

    const responseBody = await response.text().catch(() => '')

    // Log delivery
    await db.insert(webhookDeliveries).values({
      webhookId,
      event,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Truncate to 1KB
      attempt
    })

    // Update webhook last delivery status
    await db.update(webhooks)
      .set({
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: response.ok ? 'success' : 'failed',
        updatedAt: new Date()
      })
      .where(eq(webhooks.id, webhookId))

    return {
      success: response.ok,
      statusCode: response.status
    }

  } catch (err) {
    // Log failed delivery
    await db.insert(webhookDeliveries).values({
      webhookId,
      event,
      error: err.message,
      attempt
    })

    // Update webhook last delivery status
    await db.update(webhooks)
      .set({
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'error',
        updatedAt: new Date()
      })
      .where(eq(webhooks.id, webhookId))

    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Verify webhook signature (for incoming webhook verification endpoints)
 * @param {string} body - Request body
 * @param {string} signature - Signature from X-iFU-Signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function verifySignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
