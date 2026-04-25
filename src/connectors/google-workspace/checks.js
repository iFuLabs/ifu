/**
 * Google Workspace compliance checks.
 * Maps to SOC 2 controls: CC6.1, CC6.2, CC6.3
 *
 * Auth: Service account JSON with domain-wide delegation, impersonating
 * a Workspace super-admin. Required scopes:
 *   https://www.googleapis.com/auth/admin.directory.user.readonly
 *   https://www.googleapis.com/auth/admin.directory.domain.readonly
 *   https://www.googleapis.com/auth/admin.reports.audit.readonly
 */
import crypto from 'crypto'

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.domain.readonly'
].join(' ')

async function getAccessToken(serviceAccount, subject) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: serviceAccount.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    sub: subject
  }

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(claim)}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key)
  const jwt = `${unsigned}.${signature.toString('base64url')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.access_token
}

async function gFetch(token, path, params = {}) {
  const url = new URL(path, 'https://admin.googleapis.com')
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Google API ${res.status}: ${body.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function listAllUsers(token, customer = 'my_customer', cap = 2000) {
  const all = []
  let pageToken
  do {
    const data = await gFetch(token, '/admin/directory/v1/users', {
      customer,
      maxResults: 500,
      pageToken,
      projection: 'full'
    })
    all.push(...(data.users || []))
    pageToken = data.nextPageToken
  } while (pageToken && all.length < cap)
  return all
}

export async function runGoogleWorkspaceChecks({ credentials, controls, onProgress }) {
  const { serviceAccount, adminEmail } = credentials
  const sa = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount

  const results = []
  const controlMap = {}
  for (const c of controls) controlMap[c.controlId] = c.id

  let token
  try {
    token = await getAccessToken(sa, adminEmail)
  } catch (err) {
    return [{
      controlDefId: controlMap['CC6.1-GWS-MFA'],
      status: 'review',
      evidence: { source: 'google_workspace', detail: `Auth failed: ${err.message}`, checkedAt: new Date().toISOString() }
    }].filter(r => r.controlDefId)
  }

  await onProgress(10)

  let users = []
  try {
    users = await listAllUsers(token)
  } catch (err) {
    return [{
      controlDefId: controlMap['CC6.1-GWS-MFA'],
      status: 'review',
      evidence: { source: 'google_workspace', detail: `Could not list users: ${err.message}`, checkedAt: new Date().toISOString() }
    }].filter(r => r.controlDefId)
  }

  await onProgress(40)

  check2sv(users, results, controlMap)
  await onProgress(60)

  checkInactiveUsers(users, results, controlMap)
  await onProgress(80)

  checkAdminCount(users, results, controlMap)
  await onProgress(100)

  return results.filter(r => r.controlDefId)
}

function check2sv(users, results, controlMap) {
  const active = users.filter(u => !u.suspended && !u.archived)
  const without2sv = active.filter(u => u.isEnrolledIn2Sv !== true)

  results.push({
    controlDefId: controlMap['CC6.1-GWS-MFA'],
    status: without2sv.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'google_workspace',
      checkGroup: 'Authentication',
      controlId: 'CC6.1-GWS-MFA',
      detail: without2sv.length === 0
        ? `All ${active.length} active users have 2-Step Verification enrolled`
        : `${without2sv.length} of ${active.length} active users do not have 2-Step Verification enrolled`,
      resources: without2sv.slice(0, 20).map(u => ({
        type: 'GoogleWorkspace::User',
        id: u.primaryEmail,
        compliant: false
      })),
      checkedAt: new Date().toISOString()
    }
  })
}

function checkInactiveUsers(users, results, controlMap) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const active = users.filter(u => !u.suspended && !u.archived)
  const inactive = active.filter(u => {
    const last = u.lastLoginTime && u.lastLoginTime !== '1970-01-01T00:00:00.000Z' ? new Date(u.lastLoginTime) : null
    return last && last < ninetyDaysAgo
  })

  results.push({
    controlDefId: controlMap['CC6.2-GWS-INACTIVE'],
    status: inactive.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'google_workspace',
      checkGroup: 'Access Review',
      controlId: 'CC6.2-GWS-INACTIVE',
      detail: inactive.length === 0
        ? `No active users dormant for 90+ days (${active.length} checked)`
        : `${inactive.length} active user(s) have not signed in for 90+ days`,
      resources: inactive.slice(0, 20).map(u => ({
        type: 'GoogleWorkspace::User',
        id: u.primaryEmail,
        compliant: false,
        metadata: { lastLoginTime: u.lastLoginTime }
      })),
      checkedAt: new Date().toISOString()
    }
  })
}

function checkAdminCount(users, results, controlMap) {
  const admins = users.filter(u => (u.isAdmin || u.isDelegatedAdmin) && !u.suspended && !u.archived)
  const count = admins.length
  const tooMany = count > 5
  const tooFew = count < 2

  results.push({
    controlDefId: controlMap['CC6.3-GWS-ADMIN'],
    status: !tooMany && !tooFew ? 'pass' : 'fail',
    evidence: {
      source: 'google_workspace',
      checkGroup: 'Access Control',
      controlId: 'CC6.3-GWS-ADMIN',
      detail: tooFew
        ? `Only ${count} admin(s) — at least 2 are recommended for redundancy`
        : tooMany
          ? `${count} admin(s) — consider reducing to ≤5 to limit privileged access`
          : `${count} admin(s) — within recommended range (2-5)`,
      resources: admins.slice(0, 20).map(a => ({
        type: 'GoogleWorkspace::Admin',
        id: a.primaryEmail,
        compliant: !tooMany && !tooFew,
        metadata: { isSuperAdmin: a.isAdmin === true }
      })),
      checkedAt: new Date().toISOString()
    }
  })
}

export async function validateGoogleWorkspaceCredentials(serviceAccount, adminEmail) {
  try {
    const sa = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount
    if (!sa.client_email || !sa.private_key) {
      return { success: false, error: 'Service account JSON missing client_email or private_key' }
    }
    const token = await getAccessToken(sa, adminEmail)
    const data = await gFetch(token, '/admin/directory/v1/users', { customer: 'my_customer', maxResults: 1 })
    return { success: true, domain: data.users?.[0]?.primaryEmail?.split('@')[1] || adminEmail.split('@')[1] }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
