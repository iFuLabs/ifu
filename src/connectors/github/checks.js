/**
 * GitHub compliance checks.
 * Maps to SOC 2 controls: CC6.1, CC6.2, CC6.7, CC7.2, CC8.1
 *
 * All checks use the installation-scoped Octokit client,
 * so we only see repos the customer granted us access to.
 */
export async function runGithubChecks({ client, controls, onProgress }) {
  const results = []

  // Build controlId → controlDefId map
  const controlMap = {}
  for (const c of controls) {
    controlMap[c.controlId] = c.id
  }

  // ── Fetch org & repos ──────────────────────────────────────────
  let org = null
  let repos = []

  try {
    // Get authenticated installation details to find the org
    const { data: appInstall } = await client.apps.getAuthenticated().catch(() => ({ data: null }))

    // List accessible repos
    const repoPages = client.paginate.iterator(
      client.apps.listReposAccessibleToInstallation,
      { per_page: 100 }
    )

    for await (const { data } of repoPages) {
      repos.push(...data.repositories)
      if (repos.length >= 200) break // cap at 200 repos
    }

    if (repos.length > 0) {
      org = repos[0].owner.login
    }
  } catch (err) {
    console.error('GitHub: failed to list repos:', err.message)
  }

  await onProgress(10)

  if (repos.length === 0) {
    return [{
      controlDefId: controlMap['CC6.1-GH-2FA'],
      status: 'review',
      evidence: { source: 'github', detail: 'No repositories accessible. Check GitHub App permissions.', checkedAt: new Date().toISOString() }
    }].filter(r => r.controlDefId)
  }

  // ── CC6.1: 2FA required for org members ───────────────────────
  await check2FA(client, org, results, controlMap)
  await onProgress(25)

  // ── CC6.2: Branch protection on default branches ──────────────
  await checkBranchProtection(client, repos, results, controlMap)
  await onProgress(50)

  // ── CC6.7: Secret scanning enabled ───────────────────────────
  await checkSecretScanning(client, repos, results, controlMap)
  await onProgress(65)

  // ── CC7.2: Dependabot / vulnerability alerts ──────────────────
  await checkDependabot(client, repos, results, controlMap)
  await onProgress(80)

  // ── CC8.1: Required reviews on PRs ───────────────────────────
  await checkRequiredReviews(client, repos, results, controlMap)
  await onProgress(90)

  // ── CC6.1: Stale deploy keys ──────────────────────────────────
  await checkDeployKeys(client, repos, results, controlMap)
  await onProgress(100)

  return results.filter(r => r.controlDefId) // Drop any unmapped controls
}

// ── Individual check functions ─────────────────────────────────

async function check2FA(client, org, results, controlMap) {
  if (!org) return

  try {
    // List members without 2FA (requires org:read permission)
    const members = await client.paginate(
      client.orgs.listMembers,
      { org, filter: '2fa_disabled', per_page: 100 }
    ).catch(() => [])

    results.push({
      controlDefId: controlMap['CC6.1-GH-2FA'],
      status: members.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'github',
        checkGroup: 'Organization',
        controlId: 'CC6.1-GH-2FA',
        detail: members.length === 0
          ? `All members in ${org} have 2FA enabled`
          : `${members.length} member(s) in ${org} do not have 2FA enabled: ${members.slice(0, 5).map(m => m.login).join(', ')}`,
        resources: members.map(m => ({ type: 'GitHub::Member', id: m.login, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({
      controlDefId: controlMap['CC6.1-GH-2FA'],
      status: 'review',
      evidence: { source: 'github', detail: `Could not check 2FA: ${err.message}. Ensure the app has 'members' read permission.`, checkedAt: new Date().toISOString() }
    })
  }
}

async function checkBranchProtection(client, repos, results, controlMap) {
  const unprotected = []
  const weakProtection = []

  // Only check non-archived repos with a default branch
  const activeRepos = repos.filter(r => !r.archived && r.default_branch)

  for (const repo of activeRepos.slice(0, 50)) { // cap at 50 repos
    try {
      const { data: protection } = await client.repos.getBranchProtection({
        owner: repo.owner.login,
        repo: repo.name,
        branch: repo.default_branch
      })

      // Check for weak protection — no required reviews
      const requiredReviews = protection.required_pull_request_reviews
      if (!requiredReviews || requiredReviews.required_approving_review_count < 1) {
        weakProtection.push({ repo: repo.full_name, branch: repo.default_branch })
      }
    } catch (err) {
      if (err.status === 404) {
        // Branch protection not configured at all
        unprotected.push({ repo: repo.full_name, branch: repo.default_branch })
      }
      // 403 means we don't have permission — skip silently
    }
  }

  const totalIssues = unprotected.length + weakProtection.length

  results.push({
    controlDefId: controlMap['CC6.2-GH-BRANCH'],
    status: totalIssues === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'github',
      checkGroup: 'Repositories',
      controlId: 'CC6.2-GH-BRANCH',
      detail: totalIssues === 0
        ? `All ${activeRepos.length} active repos have branch protection on their default branch`
        : [
            unprotected.length > 0 ? `${unprotected.length} repo(s) have NO branch protection` : '',
            weakProtection.length > 0 ? `${weakProtection.length} repo(s) have weak protection (no required reviews)` : ''
          ].filter(Boolean).join('. '),
      resources: [
        ...unprotected.map(r => ({ type: 'GitHub::Branch', id: `${r.repo}:${r.branch}`, compliant: false, metadata: { issue: 'no_protection' } })),
        ...weakProtection.map(r => ({ type: 'GitHub::Branch', id: `${r.repo}:${r.branch}`, compliant: false, metadata: { issue: 'weak_protection' } }))
      ],
      checkedAt: new Date().toISOString()
    }
  })
}

async function checkSecretScanning(client, repos, results, controlMap) {
  const noSecretScanning = []

  // Secret scanning only available on GitHub Advanced Security or public repos
  for (const repo of repos.slice(0, 50)) {
    try {
      const { data } = await client.repos.get({
        owner: repo.owner.login,
        repo: repo.name
      })

      // Check if secret scanning is enabled (only visible if you have admin access)
      if (data.security_and_analysis?.secret_scanning?.status === 'disabled') {
        noSecretScanning.push(repo.full_name)
      }
    } catch { /* skip if no access */ }
  }

  results.push({
    controlDefId: controlMap['CC6.7-GH-SECRETS'],
    status: noSecretScanning.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'github',
      checkGroup: 'Security',
      controlId: 'CC6.7-GH-SECRETS',
      detail: noSecretScanning.length === 0
        ? `Secret scanning is enabled across accessible repositories`
        : `${noSecretScanning.length} repo(s) have secret scanning disabled: ${noSecretScanning.slice(0, 3).join(', ')}`,
      resources: noSecretScanning.map(r => ({ type: 'GitHub::Repository', id: r, compliant: false })),
      checkedAt: new Date().toISOString()
    }
  })
}

async function checkDependabot(client, repos, results, controlMap) {
  const noDependabot = []

  for (const repo of repos.filter(r => !r.archived).slice(0, 50)) {
    try {
      await client.repos.checkVulnerabilityAlerts({
        owner: repo.owner.login,
        repo: repo.name
      })
      // 204 = enabled, 404 = disabled
    } catch (err) {
      if (err.status === 404) {
        noDependabot.push(repo.full_name)
      }
    }
  }

  results.push({
    controlDefId: controlMap['CC7.2-GH-DEPENDABOT'],
    status: noDependabot.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'github',
      checkGroup: 'Security',
      controlId: 'CC7.2-GH-DEPENDABOT',
      detail: noDependabot.length === 0
        ? `Dependabot vulnerability alerts enabled across all checked repositories`
        : `${noDependabot.length} repo(s) have Dependabot alerts disabled: ${noDependabot.slice(0, 3).join(', ')}`,
      resources: noDependabot.map(r => ({ type: 'GitHub::Repository', id: r, compliant: false })),
      checkedAt: new Date().toISOString()
    }
  })
}

async function checkRequiredReviews(client, repos, results, controlMap) {
  const noReviews = []

  for (const repo of repos.filter(r => !r.archived && r.default_branch).slice(0, 50)) {
    try {
      const { data } = await client.repos.getPullRequestReviewProtection({
        owner: repo.owner.login,
        repo: repo.name,
        branch: repo.default_branch
      })

      if (!data.required_approving_review_count || data.required_approving_review_count < 1) {
        noReviews.push(repo.full_name)
      }
    } catch (err) {
      if (err.status === 404) noReviews.push(repo.full_name)
    }
  }

  results.push({
    controlDefId: controlMap['CC8.1-GH-REVIEWS'],
    status: noReviews.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'github',
      checkGroup: 'Change Management',
      controlId: 'CC8.1-GH-REVIEWS',
      detail: noReviews.length === 0
        ? `All active repos require at least one PR review before merging`
        : `${noReviews.length} repo(s) do not require PR reviews: ${noReviews.slice(0, 3).join(', ')}`,
      resources: noReviews.map(r => ({ type: 'GitHub::Repository', id: r, compliant: false })),
      checkedAt: new Date().toISOString()
    }
  })
}

async function checkDeployKeys(client, repos, results, controlMap) {
  const staleKeys = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  for (const repo of repos.filter(r => !r.archived).slice(0, 30)) {
    try {
      const keys = await client.paginate(client.repos.listDeployKeys, {
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 100
      })

      for (const key of keys) {
        if (new Date(key.created_at) < ninetyDaysAgo) {
          staleKeys.push({
            repo: repo.full_name,
            keyTitle: key.title,
            createdAt: key.created_at,
            readOnly: key.read_only
          })
        }
      }
    } catch { /* skip */ }
  }

  results.push({
    controlDefId: controlMap['CC6.1-GH-DEPLOY-KEYS'],
    status: staleKeys.length === 0 ? 'pass' : 'fail',
    evidence: {
      source: 'github',
      checkGroup: 'Access Control',
      controlId: 'CC6.1-GH-DEPLOY-KEYS',
      detail: staleKeys.length === 0
        ? 'No deploy keys older than 90 days found'
        : `${staleKeys.length} deploy key(s) older than 90 days found`,
      resources: staleKeys.map(k => ({
        type: 'GitHub::DeployKey',
        id: `${k.repo}:${k.keyTitle}`,
        compliant: false,
        metadata: { createdAt: k.createdAt, readOnly: k.readOnly }
      })),
      checkedAt: new Date().toISOString()
    }
  })
}
