// Centralised config — fail fast if required env vars are missing

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required`)
  }
  return value
}

export const JWT_SECRET = requireEnv('JWT_SECRET')
export const JWT_EXPIRES_IN = '7d'

export const ENCRYPTION_KEY = Buffer.from(requireEnv('ENCRYPTION_KEY'), 'hex')

export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// Determine cookie domain based on environment
// Always use .ifulabs.com for production domains
const getCookieDomain = () => {
  if (process.env.NODE_ENV === 'production') {
    return '.ifulabs.com'
  }
  // Check if running on ifulabs.com domain (even if NODE_ENV isn't set correctly)
  if (process.env.API_URL?.includes('ifulabs.com')) {
    return '.ifulabs.com'
  }
  return undefined // localhost
}

// SameSite=none is required when the API is on a different subdomain than the
// frontend (api.ifulabs.com ↔ app.ghara.ifulabs.com) — browsers block cookies
// on cross-site state-changing requests with sameSite=lax. Production uses
// 'none' + secure: true; dev keeps 'lax' so cookies still work on localhost.
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.API_URL?.includes('https://'),
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  domain: getCookieDomain()
}

// Free trial length, in days. Used for both the org trialEndsAt timestamp
// and the Paystack subscription start_date so the first real charge happens
// after the trial.
export const TRIAL_DURATION_DAYS = 7
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
