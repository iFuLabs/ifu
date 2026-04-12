import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam'

/**
 * Validates that iFu Labs Comply can assume the customer's IAM role.
 * Returns the AWS account ID and alias if successful.
 */
export async function validateAwsRole(roleArn, externalId) {
  try {
    const sts = new STSClient({ region: process.env.AWS_REGION })

    // Try assuming the role
    const assumed = await sts.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'iFu Labs ComplyValidation',
      ExternalId: externalId,
      DurationSeconds: 900 // 15 min — minimum
    }))

    const { Credentials } = assumed

    // Use the assumed role credentials to get the account ID
    const assumedSts = new STSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken
      }
    })

    const identity = await assumedSts.send(new GetCallerIdentityCommand({}))

    // Try to get account alias (non-critical — may not have IAM:ListAccountAliases)
    let accountAlias = null
    try {
      const iam = new IAMClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken
        }
      })
      const aliases = await iam.send(new ListAccountAliasesCommand({}))
      accountAlias = aliases.AccountAliases?.[0] || null
    } catch {
      // No alias permission — that's fine
    }

    return {
      success: true,
      accountId: identity.Account,
      accountAlias
    }
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AccessDenied'
        ? 'iFu Labs Comply cannot assume this role. Check the trust policy allows assumption from account ' + process.env.IFU_LABS_AWS_ACCOUNT_ID
        : err.message
    }
  }
}
