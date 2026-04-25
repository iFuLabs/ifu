/**
 * Okta compliance checks.
 * Maps to SOC 2 controls: CC6.1, CC6.2, CC6.3
 *
 * Auth: API token (SSWS scheme). The token must have read access to
 * users, groups, and policies in the customer's Okta org.
 */

async function oktaFetch(domain, token, path, params = {}) {
  const url = new URL(path, `https://${domain}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `SSWS ${token}`,
      Accept: 'application/json'
    }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Okta API ${res.status}: ${body.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function oktaPaginate(domain, token, path, params = {}, cap = 1000) {
  const all = []
  let url = new URL(path, `https://${domain}`)
  for (const [k, v] of Object.entries({ limit: 200, ...params })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }
  while (url && all.length < cap) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `SSWS ${token}`, Accept: 'application/json' }
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const err = new Error(`Okta API ${res.status}: ${body.slice(0, 200)}`)
      err.status = res.status
      throw err
    }
    const data = await res.json()
    all.push(...data)

    const link = res.headers.get('link') || ''
    const next = link.split(',').find(p => p.includes('rel="next"'))
    url = next ? new URL(next.match(/<([^>]+)>/)[1]) : null
  }
  return all
}

export async function runOktaChecks({ credentials, controls, onProgress }) {
  const { domain, apiToken } = credentials
  const results = []

  const controlMap = {}
  for (const c of controls) controlMap[c.controlId] = c.id

  await onProgress(5)

  await checkMfaEnforcement(domain, apiToken, results, controlMap)
  await onProgress(30)

  await checkPasswordPolicy(domain, apiToken, results, controlMap)
  await onProgress(50)

  await checkInactiveUsers(domain, apiToken, results, controlMap)
  await onProgress(75)

  await checkAdminCount(domain, apiToken, results, controlMap)
  await onProgress(100)

  return results.filter(r => r.controlDefId)
}

async function checkMfaEnforcement(domain, token, results, controlMap) {
  try {
    const policies = await oktaFetch(domain, token, '/api/v1/policies', { type: 'MFA_ENROLL' })
    const active = policies.filter(p => p.status === 'ACTIVE')
    const hasRequired = active.some(p =>
      p.settings?.factors && Object.values(p.settings.factors).some(f => f.enroll?.self === 'REQUIRED')
    )

    results.push({
      controlDefId: controlMap['CC6.1-OKTA-MFA'],
      status: hasRequired ? 'pass' : 'fail',
      evidence: {
        source: 'okta',
        checkGroup: 'Authentication',
        controlId: 'CC6.1-OKTA-MFA',
        detail: hasRequired
          ? `MFA enrollment is required by an active policy (${active.length} active MFA enroll policies)`
          : `No active MFA enrollment policy requires enrollment. Found ${active.length} active policies but none enforce REQUIRED enrollment.`,
        resources: active.map(p => ({ type: 'Okta::Policy', id: p.id, compliant: hasRequired, metadata: { name: p.name } })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({
      controlDefId: controlMap['CC6.1-OKTA-MFA'],
      status: 'review',
      evidence: { source: 'okta', detail: `Could not fetch MFA policies: ${err.message}`, checkedAt: new Date().toISOString() }
    })
  }
}

async function checkPasswordPolicy(domain, token, results, controlMap) {
  try {
    const policies = await oktaFetch(domain, token, '/api/v1/policies', { type: 'PASSWORD' })
    const active = policies.filter(p => p.status === 'ACTIVE')

    const issues = []
    for (const p of active) {
      const c = p.settings?.password?.complexity || {}
      if ((c.minLength ?? 0) < 12) issues.push(`${p.name}: minLength ${c.minLength ?? 'unset'} < 12`)
      if (!c.minNumber || c.minNumber < 1) issues.push(`${p.name}: numbers not required`)
      if (!c.minSymbol || c.minSymbol < 1) issues.push(`${p.name}: symbols not required`)
    }

    results.push({
      controlDefId: controlMap['CC6.1-OKTA-PASSWORD'],
      status: active.length > 0 && issues.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'okta',
        checkGroup: 'Authentication',
        controlId: 'CC6.1-OKTA-PASSWORD',
        detail: issues.length === 0
          ? `${active.length} active password polic(ies) meet baseline (≥12 chars, numbers, symbols)`
          : `Password policy weaknesses: ${issues.slice(0, 5).join('; ')}`,
        resources: active.map(p => ({ type: 'Okta::Policy', id: p.id, compliant: issues.length === 0, metadata: { name: p.name } })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({
      controlDefId: controlMap['CC6.1-OKTA-PASSWORD'],
      status: 'review',
      evidence: { source: 'okta', detail: `Could not fetch password policies: ${err.message}`, checkedAt: new Date().toISOString() }
    })
  }
}

async function checkInactiveUsers(domain, token, results, controlMap) {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const users = await oktaPaginate(domain, token, '/api/v1/users', { filter: 'status eq "ACTIVE"' }, 2000)

    const inactive = users.filter(u => {
      const last = u.lastLogin ? new Date(u.lastLogin) : null
      return last && last < ninetyDaysAgo
    })

    results.push({
      controlDefId: controlMap['CC6.2-OKTA-INACTIVE'],
      status: inactive.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'okta',
        checkGroup: 'Access Review',
        controlId: 'CC6.2-OKTA-INACTIVE',
        detail: inactive.length === 0
          ? `No active users have been dormant for 90+ days (${users.length} active users checked)`
          : `${inactive.length} active user(s) have not signed in for 90+ days and should be deactivated`,
        resources: inactive.slice(0, 20).map(u => ({
          type: 'Okta::User',
          id: u.id,
          compliant: false,
          metadata: { login: u.profile?.login, lastLogin: u.lastLogin }
        })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({
      controlDefId: controlMap['CC6.2-OKTA-INACTIVE'],
      status: 'review',
      evidence: { source: 'okta', detail: `Could not list users: ${err.message}`, checkedAt: new Date().toISOString() }
    })
  }
}

async function checkAdminCount(domain, token, results, controlMap) {
  try {
    const admins = await oktaPaginate(domain, token, '/api/v1/iam/assignees/users', {}, 500)
      .catch(async () => {
        const users = await oktaPaginate(domain, token, '/api/v1/users', { filter: 'status eq "ACTIVE"' }, 500)
        const adminUsers = []
        for (const u of users.slice(0, 100)) {
          try {
            const roles = await oktaFetch(domain, token, `/api/v1/users/${u.id}/roles`)
            if (roles.length > 0) adminUsers.push({ id: u.id, profile: u.profile, roles })
          } catch { /* skip */ }
        }
        return adminUsers
      })

    const count = admins.length
    const tooMany = count > 5
    const tooFew = count < 2

    results.push({
      controlDefId: controlMap['CC6.3-OKTA-ADMIN'],
      status: !tooMany && !tooFew ? 'pass' : 'fail',
      evidence: {
        source: 'okta',
        checkGroup: 'Access Control',
        controlId: 'CC6.3-OKTA-ADMIN',
        detail: tooFew
          ? `Only ${count} admin(s) found — at least 2 are recommended for redundancy`
          : tooMany
            ? `${count} admin(s) found — consider reducing to ≤5 to limit privileged access`
            : `${count} admin(s) — within recommended range (2-5)`,
        resources: admins.slice(0, 20).map(a => ({
          type: 'Okta::Admin',
          id: a.id,
          compliant: !tooMany && !tooFew,
          metadata: { login: a.profile?.login }
        })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({
      controlDefId: controlMap['CC6.3-OKTA-ADMIN'],
      status: 'review',
      evidence: { source: 'okta', detail: `Could not enumerate admins: ${err.message}`, checkedAt: new Date().toISOString() }
    })
  }
}

export async function validateOktaCredentials(domain, apiToken) {
  try {
    const me = await oktaFetch(domain, apiToken, '/api/v1/users/me').catch(async () => {
      const policies = await oktaFetch(domain, apiToken, '/api/v1/policies', { type: 'PASSWORD' })
      return { ok: policies.length >= 0 }
    })
    return { success: true, domain, identity: me?.profile?.login || 'service-token' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
