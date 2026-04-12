import {
  IAMClient,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  ListMFADevicesCommand,
  GetCredentialReportCommand,
  GenerateCredentialReportCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand
} from '@aws-sdk/client-iam'

/**
 * IAM checks map to SOC 2 CC6.1, CC6.2, CC6.3
 */
export async function iamChecks(clientConfig) {
  const iam = new IAMClient(clientConfig)
  const results = []

  // ── CC6.1: MFA enabled for all IAM users ──────────────────────────────
  try {
    const usersResp = await iam.send(new ListUsersCommand({ MaxItems: 1000 }))
    const allUsers = usersResp.Users || []

    const usersWithoutMfa = []
    for (const user of allUsers) {
      const mfaResp = await iam.send(new ListMFADevicesCommand({ UserName: user.UserName }))
      if (!mfaResp.MFADevices || mfaResp.MFADevices.length === 0) {
        usersWithoutMfa.push(user.UserName)
      }
    }

    results.push({
      controlId: 'CC6.1-MFA',
      status: usersWithoutMfa.length === 0 ? 'pass' : 'fail',
      detail: usersWithoutMfa.length === 0
        ? `All ${allUsers.length} IAM users have MFA enabled`
        : `${usersWithoutMfa.length} user(s) missing MFA: ${usersWithoutMfa.slice(0, 5).join(', ')}`,
      resources: usersWithoutMfa.map(u => ({ type: 'IAM::User', id: u, compliant: false }))
    })
  } catch (err) {
    results.push({ controlId: 'CC6.1-MFA', status: 'review', detail: `Could not check MFA: ${err.message}` })
  }

  // ── CC6.2: Strong password policy ────────────────────────────────────
  try {
    const policy = await iam.send(new GetAccountPasswordPolicyCommand({}))
    const pp = policy.PasswordPolicy

    const issues = []
    if (!pp.RequireUppercaseCharacters) issues.push('uppercase required')
    if (!pp.RequireLowercaseCharacters) issues.push('lowercase required')
    if (!pp.RequireNumbers) issues.push('numbers required')
    if (!pp.RequireSymbols) issues.push('symbols required')
    if ((pp.MinimumPasswordLength || 0) < 14) issues.push('minimum 14 characters')
    if (!pp.ExpirePasswords) issues.push('password expiry')

    results.push({
      controlId: 'CC6.2-PASSWORD',
      status: issues.length === 0 ? 'pass' : 'fail',
      detail: issues.length === 0
        ? 'Password policy meets all requirements'
        : `Password policy missing: ${issues.join(', ')}`,
      resources: [{ type: 'IAM::PasswordPolicy', id: 'account', compliant: issues.length === 0 }]
    })
  } catch (err) {
    // No password policy set at all
    results.push({
      controlId: 'CC6.2-PASSWORD',
      status: 'fail',
      detail: 'No IAM password policy configured',
      resources: []
    })
  }

  // ── CC6.3: No unused access keys (>90 days) ──────────────────────────
  try {
    // Generate credential report if it doesn't exist
    try {
      await iam.send(new GenerateCredentialReportCommand({}))
      await new Promise(r => setTimeout(r, 3000)) // Wait for report generation
    } catch { /* Report may already exist */ }

    const reportResp = await iam.send(new GetCredentialReportCommand({}))
    const report = Buffer.from(reportResp.Content).toString('utf-8')
    const lines = report.split('\n').slice(1) // Skip header

    const staleKeys = []
    const now = new Date()

    for (const line of lines) {
      const cols = line.split(',')
      const username = cols[0]
      const key1LastUsed = cols[10]
      const key2LastUsed = cols[15]

      for (const lastUsed of [key1LastUsed, key2LastUsed]) {
        if (lastUsed && lastUsed !== 'N/A' && lastUsed !== 'no_information') {
          const daysSinceUse = (now - new Date(lastUsed)) / (1000 * 60 * 60 * 24)
          if (daysSinceUse > 90) {
            staleKeys.push({ username, daysSinceUse: Math.round(daysSinceUse) })
          }
        }
      }
    }

    results.push({
      controlId: 'CC6.3-ACCESS-KEYS',
      status: staleKeys.length === 0 ? 'pass' : 'fail',
      detail: staleKeys.length === 0
        ? 'No access keys unused for more than 90 days'
        : `${staleKeys.length} access key(s) unused for 90+ days`,
      resources: staleKeys.map(k => ({
        type: 'IAM::AccessKey',
        id: k.username,
        compliant: false,
        metadata: { daysSinceUse: k.daysSinceUse }
      }))
    })
  } catch (err) {
    results.push({ controlId: 'CC6.3-ACCESS-KEYS', status: 'review', detail: `Could not check access keys: ${err.message}` })
  }

  // ── CC6.1: Root account MFA ───────────────────────────────────────────
  try {
    const reportResp = await iam.send(new GetCredentialReportCommand({}))
    const report = Buffer.from(reportResp.Content).toString('utf-8')
    const rootLine = report.split('\n').find(l => l.startsWith('<root-account>'))

    if (rootLine) {
      const cols = rootLine.split(',')
      const rootMfaActive = cols[7] === 'true'

      results.push({
        controlId: 'CC6.1-ROOT-MFA',
        status: rootMfaActive ? 'pass' : 'fail',
        detail: rootMfaActive
          ? 'Root account has MFA enabled'
          : '⚠️ Root account does NOT have MFA — critical risk',
        resources: [{ type: 'IAM::RootAccount', id: 'root', compliant: rootMfaActive }]
      })
    }
  } catch (err) {
    results.push({ controlId: 'CC6.1-ROOT-MFA', status: 'review', detail: `Could not check root MFA: ${err.message}` })
  }

  return results
}
