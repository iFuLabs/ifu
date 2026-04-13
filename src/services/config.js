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
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE
}
