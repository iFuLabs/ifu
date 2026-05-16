/**
 * Additional security checks — VPC Flow Logs, KMS key rotation,
 * and overly permissive IAM roles. These extend the base SOC 2/PCI/ISO
 * coverage with controls commonly flagged in real audits.
 */
import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeFlowLogsCommand
} from '@aws-sdk/client-ec2'
import {
  KMSClient,
  ListKeysCommand,
  DescribeKeyCommand,
  GetKeyRotationStatusCommand
} from '@aws-sdk/client-kms'
import {
  IAMClient,
  ListRolesCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  GetRolePolicyCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand
} from '@aws-sdk/client-iam'

/**
 * VPC Flow Logs check — every VPC should have flow logging enabled
 * for network traffic auditing (SOC 2 CC7, PCI 10).
 */
export async function vpcFlowLogsCheck(clientConfig) {
  const ec2 = new EC2Client(clientConfig)
  const results = []

  try {
    const vpcResp = await ec2.send(new DescribeVpcsCommand({}))
    const vpcs = vpcResp.Vpcs || []

    if (vpcs.length === 0) {
      results.push({
        controlId: 'CC7.2-VPC-FLOW-LOGS',
        status: 'pass',
        detail: 'No VPCs found in this account/region',
        resources: []
      })
      return results
    }

    const flowLogsResp = await ec2.send(new DescribeFlowLogsCommand({}))
    const activeFlowLogs = (flowLogsResp.FlowLogs || []).filter(f => f.FlowLogStatus === 'ACTIVE')
    const vpcsWithFlowLogs = new Set(activeFlowLogs.map(f => f.ResourceId))

    const vpcsWithout = vpcs.filter(v => !vpcsWithFlowLogs.has(v.VpcId))

    results.push({
      controlId: 'CC7.2-VPC-FLOW-LOGS',
      status: vpcsWithout.length === 0 ? 'pass' : 'fail',
      detail: vpcsWithout.length === 0
        ? `All ${vpcs.length} VPC(s) have flow logs enabled`
        : `${vpcsWithout.length} of ${vpcs.length} VPC(s) missing flow logs`,
      resources: vpcsWithout.map(v => ({
        type: 'EC2::VPC',
        id: v.VpcId,
        compliant: false,
        metadata: { isDefault: v.IsDefault }
      }))
    })
  } catch (err) {
    results.push({
      controlId: 'CC7.2-VPC-FLOW-LOGS',
      status: 'review',
      detail: `Could not check VPC flow logs: ${err.message}`,
      resources: []
    })
  }

  return results
}

/**
 * KMS key rotation check — customer-managed KMS keys should have
 * automatic annual rotation enabled (SOC 2 CC9, PCI 3.6).
 */
export async function kmsKeyRotationCheck(clientConfig) {
  const kms = new KMSClient(clientConfig)
  const results = []

  try {
    const keysResp = await kms.send(new ListKeysCommand({ Limit: 100 }))
    const keys = keysResp.Keys || []

    const customerKeysWithoutRotation = []
    let customerKeyCount = 0

    for (const key of keys) {
      try {
        const desc = await kms.send(new DescribeKeyCommand({ KeyId: key.KeyId }))
        const meta = desc.KeyMetadata

        // Only check customer-managed, symmetric, enabled keys
        if (meta.KeyManager !== 'CUSTOMER') continue
        if (meta.KeySpec && meta.KeySpec !== 'SYMMETRIC_DEFAULT') continue
        if (meta.KeyState !== 'Enabled') continue

        customerKeyCount++

        const rotationResp = await kms.send(new GetKeyRotationStatusCommand({ KeyId: key.KeyId }))
        if (!rotationResp.KeyRotationEnabled) {
          customerKeysWithoutRotation.push({
            id: key.KeyId,
            arn: meta.Arn,
            description: meta.Description || ''
          })
        }
      } catch {
        // Permission or key-state issues — skip
      }
    }

    if (customerKeyCount === 0) {
      results.push({
        controlId: 'CC9.1-KMS-ROTATION',
        status: 'pass',
        detail: 'No customer-managed KMS keys found',
        resources: []
      })
    } else {
      results.push({
        controlId: 'CC9.1-KMS-ROTATION',
        status: customerKeysWithoutRotation.length === 0 ? 'pass' : 'fail',
        detail: customerKeysWithoutRotation.length === 0
          ? `All ${customerKeyCount} customer-managed KMS key(s) have rotation enabled`
          : `${customerKeysWithoutRotation.length} of ${customerKeyCount} customer-managed KMS key(s) missing automatic rotation`,
        resources: customerKeysWithoutRotation.map(k => ({
          type: 'KMS::Key',
          id: k.id,
          compliant: false,
          metadata: { description: k.description }
        }))
      })
    }
  } catch (err) {
    results.push({
      controlId: 'CC9.1-KMS-ROTATION',
      status: 'review',
      detail: `Could not check KMS rotation: ${err.message}`,
      resources: []
    })
  }

  return results
}

/**
 * Overly permissive IAM roles check — flags roles with wildcard
 * (Action: *, Resource: *) policies that grant excessive access
 * (SOC 2 CC6.3, PCI 7.2.2).
 *
 * Skips AWS service-linked roles (path /aws-service-role/).
 */
export async function overpermissiveRolesCheck(clientConfig) {
  const iam = new IAMClient(clientConfig)
  const results = []

  try {
    const rolesResp = await iam.send(new ListRolesCommand({ MaxItems: 1000 }))
    const customerRoles = (rolesResp.Roles || []).filter(r =>
      !r.Path?.startsWith('/aws-service-role/') &&
      !r.Path?.startsWith('/service-role/')
    )

    const overpermissive = []

    for (const role of customerRoles) {
      const rolePerms = await checkRolePermissions(iam, role.RoleName)
      if (rolePerms.hasWildcard) {
        overpermissive.push({
          name: role.RoleName,
          arn: role.Arn,
          reason: rolePerms.reason
        })
      }
    }

    results.push({
      controlId: 'CC6.3-IAM-WILDCARD',
      status: overpermissive.length === 0 ? 'pass' : 'fail',
      detail: overpermissive.length === 0
        ? `No customer-managed IAM roles grant wildcard access (${customerRoles.length} reviewed)`
        : `${overpermissive.length} of ${customerRoles.length} customer-managed IAM role(s) grant wildcard access (Action: *, Resource: *)`,
      resources: overpermissive.map(r => ({
        type: 'IAM::Role',
        id: r.name,
        compliant: false,
        metadata: { reason: r.reason }
      }))
    })
  } catch (err) {
    results.push({
      controlId: 'CC6.3-IAM-WILDCARD',
      status: 'review',
      detail: `Could not check IAM role permissions: ${err.message}`,
      resources: []
    })
  }

  return results
}

/**
 * Examine inline + attached managed policies on a role for wildcard grants.
 * Returns { hasWildcard, reason }.
 */
async function checkRolePermissions(iam, roleName) {
  // 1. Inline policies
  try {
    const inlineResp = await iam.send(new ListRolePoliciesCommand({ RoleName: roleName }))
    for (const policyName of inlineResp.PolicyNames || []) {
      try {
        const polResp = await iam.send(new GetRolePolicyCommand({ RoleName: roleName, PolicyName: policyName }))
        const doc = JSON.parse(decodeURIComponent(polResp.PolicyDocument))
        if (hasWildcardStatement(doc)) {
          return { hasWildcard: true, reason: `Inline policy "${policyName}" has Action:* Resource:*` }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // 2. Attached managed policies — only check customer-managed ones
  try {
    const attachedResp = await iam.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }))
    for (const attached of attachedResp.AttachedPolicies || []) {
      // AWS-managed policies (e.g. AdministratorAccess) are also a finding
      if (attached.PolicyArn?.endsWith(':policy/AdministratorAccess')) {
        return { hasWildcard: true, reason: 'AdministratorAccess policy attached' }
      }

      // Skip other AWS-managed policies — too noisy and out of customer control
      if (attached.PolicyArn?.startsWith('arn:aws:iam::aws:')) continue

      try {
        const polResp = await iam.send(new GetPolicyCommand({ PolicyArn: attached.PolicyArn }))
        const versionResp = await iam.send(new GetPolicyVersionCommand({
          PolicyArn: attached.PolicyArn,
          VersionId: polResp.Policy.DefaultVersionId
        }))
        const doc = JSON.parse(decodeURIComponent(versionResp.PolicyVersion.Document))
        if (hasWildcardStatement(doc)) {
          return { hasWildcard: true, reason: `Customer policy "${attached.PolicyName}" has Action:* Resource:*` }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return { hasWildcard: false }
}

function hasWildcardStatement(policyDoc) {
  const statements = Array.isArray(policyDoc.Statement) ? policyDoc.Statement : [policyDoc.Statement]
  for (const stmt of statements) {
    if (stmt.Effect !== 'Allow') continue
    const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action]
    const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]
    if (actions.includes('*') && resources.includes('*')) return true
  }
  return false
}

/**
 * Combined entrypoint — runs all extra security checks.
 */
export async function securityChecks(clientConfig) {
  const [vpc, kms, roles] = await Promise.all([
    vpcFlowLogsCheck(clientConfig).catch(() => []),
    kmsKeyRotationCheck(clientConfig).catch(() => []),
    overpermissiveRolesCheck(clientConfig).catch(() => [])
  ])
  return [...vpc, ...kms, ...roles]
}
