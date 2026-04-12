import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { decrypt } from '../../services/encryption.js'

/**
 * Creates an authenticated Octokit client for a specific installation.
 * Each customer installs the iFu Labs GitHub App in their org —
 * we get an installation ID which we use to authenticate as them.
 */
export async function getInstallationClient(encryptedCredentials) {
  const creds = JSON.parse(decrypt(encryptedCredentials))

  const auth = createAppAuth({
    appId:          process.env.GITHUB_APP_ID,
    privateKey:     process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    installationId: creds.installationId
  })

  const { token } = await auth({ type: 'installation' })

  return new Octokit({ auth: token })
}

/**
 * Validates a GitHub App installation by fetching the installation details.
 * Called when a customer first connects their GitHub org.
 */
export async function validateInstallation(installationId) {
  try {
    const auth = createAppAuth({
      appId:      process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
    })

    // Auth as the app itself (not an installation)
    const { token } = await auth({ type: 'app' })
    const appClient = new Octokit({ auth: `Bearer ${token}` })

    const { data: installation } = await appClient.apps.getInstallation({
      installation_id: installationId
    })

    return {
      success:      true,
      installationId,
      orgLogin:     installation.account?.login,
      orgType:      installation.account?.type,   // 'Organization' or 'User'
      appSlug:      installation.app_slug,
      repoSelection: installation.repository_selection, // 'all' or 'selected'
      permissions:  installation.permissions
    }
  } catch (err) {
    return {
      success: false,
      error: err.status === 404
        ? 'Installation not found. Make sure you installed the iFu Labs GitHub App in your organisation.'
        : err.message
    }
  }
}
