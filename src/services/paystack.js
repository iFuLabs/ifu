import { logger } from './logger.js'

const PAYSTACK_BASE = 'https://api.paystack.co'
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

async function paystackFetch(method, path, body) {
  if (!SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured')

  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    ...(body && { body: JSON.stringify(body) })
  })

  const data = await res.json()

  if (!data.status) {
    logger.error({ path, message: data.message }, 'Paystack API error')
    throw new Error(data.message || 'Paystack request failed')
  }

  return data.data
}

// Initialize a transaction (for card tokenization)
export async function initializeTransaction({ email, amount, callbackUrl, metadata }) {
  return paystackFetch('POST', '/transaction/initialize', {
    email,
    amount, // in cents
    currency: 'ZAR',
    callback_url: callbackUrl,
    metadata
  })
}

// Verify a transaction by reference
export async function verifyTransaction(reference) {
  return paystackFetch('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
}

// Create a subscription with optional start_date for trial
export async function createSubscription({ customer, plan, authorization, startDate }) {
  return paystackFetch('POST', '/subscription', {
    customer,
    plan,
    authorization,
    ...(startDate && { start_date: startDate })
  })
}

// Fetch a subscription by code or ID
export async function getSubscription(idOrCode) {
  return paystackFetch('GET', `/subscription/${encodeURIComponent(idOrCode)}`)
}

// Disable (cancel) a subscription
export async function disableSubscription({ code, token }) {
  return paystackFetch('POST', '/subscription/disable', { code, token })
}

// List plans
export async function listPlans() {
  return paystackFetch('GET', '/plan')
}

// Verify webhook signature (HMAC SHA-512)
import crypto from 'crypto'

export function verifyWebhookSignature(body, signature) {
  if (!process.env.PAYSTACK_WEBHOOK_SECRET) return false

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return hash === signature
}
