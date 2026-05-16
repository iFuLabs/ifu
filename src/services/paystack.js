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

// Charge an existing authorization (used for "Pay now" to end trial early)
export async function chargeAuthorization({ email, amount, authorizationCode, metadata, currency = 'ZAR' }) {
  return paystackFetch('POST', '/transaction/charge_authorization', {
    email,
    amount, // in cents
    currency,
    authorization_code: authorizationCode,
    ...(metadata && { metadata })
  })
}

// List plans
export async function listPlans() {
  return paystackFetch('GET', '/plan')
}

// Get a single plan by ID or code
export async function getPlan(idOrCode) {
  return paystackFetch('GET', `/plan/${encodeURIComponent(idOrCode)}`)
}

// Verify webhook signature (HMAC SHA-512)
import crypto from 'crypto'

// Refund a transaction by reference
export async function refundTransaction(reference) {
  return paystackFetch('POST', '/refund', {
    transaction: reference
  })
}

// Create a trial subscription with delayed start_date
export async function createTrialSubscription({ email, planCode, authorizationCode, trialEndsAt }) {
  // Get or create customer
  let customerCode
  try {
    const customer = await paystackFetch('GET', `/customer/${encodeURIComponent(email)}`)
    customerCode = customer.customer_code
  } catch {
    const newCustomer = await paystackFetch('POST', '/customer', { email })
    customerCode = newCustomer.customer_code
  }

  // Create subscription with start_date = trialEndsAt (first charge delayed)
  const subscription = await createSubscription({
    customer: customerCode,
    plan: planCode,
    authorization: authorizationCode,
    startDate: trialEndsAt.toISOString()
  })

  return {
    subscriptionCode: subscription.subscription_code,
    customerCode,
    status: subscription.status
  }
}

export function verifyWebhookSignature(body, signature) {
  if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
    throw new Error('PAYSTACK_WEBHOOK_SECRET is not configured — refusing to verify webhook')
  }

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  // Use timing-safe comparison to prevent signature timing attacks
  const hashBuf = Buffer.from(hash, 'hex')
  const sigBuf = Buffer.from(signature, 'hex')
  if (hashBuf.length !== sigBuf.length) return false
  return crypto.timingSafeEqual(hashBuf, sigBuf)
}
