/**
 * ISO 27001 and GDPR control checks.
 * These reuse the same AWS SDK clients as SOC 2 checks
 * but map results to ISO 27001 / GDPR control IDs.
 *
 * Many controls overlap with SOC 2 (encryption, logging, access) —
 * this means one AWS scan populates all three frameworks.
 */

import { IAMClient, GetAccountPasswordPolicyCommand, ListUsersCommand, ListMFADevicesCommand, GetCredentialReportCommand, GenerateCredentialReportCommand } from '@aws-sdk/client-iam'
import { S3Client, ListBucketsCommand, GetBucketEncryptionCommand, GetBucketVersioningCommand, GetPublicAccessBlockCommand, GetBucketLoggingCommand } from '@aws-sdk/client-s3'
import { CloudTrailClient, DescribeTrailsCommand, GetTrailStatusCommand } from '@aws-sdk/client-cloudtrail'
import { EC2Client, DescribeSecurityGroupsCommand, DescribeVolumesCommand, DescribeRegionsCommand } from '@aws-sdk/client-ec2'
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds'
import { CloudWatchLogsClient, DescribeLogGroupsCommand, DescribeMetricFiltersCommand } from '@aws-sdk/client-cloudwatch-logs'
import { ConfigServiceClient, DescribeConfigurationRecordersCommand, DescribeConfigurationRecorderStatusCommand } from '@aws-sdk/client-config-service'

// ── ISO 27001 Checks ───────────────────────────────────────────────────────

export async function runIso27001Checks({ credentials, region, controls, onProgress }) {
  const cfg = { region, credentials }
  const results = []

  const controlMap = {}
  for (const c of controls) controlMap[c.controlId] = c.id

  // A.9 — Access Control
  await checkIsoAccessControl(cfg, results, controlMap)
  await onProgress(20)

  // A.10 — Cryptography
  await checkIsoCryptography(cfg, results, controlMap)
  await onProgress(40)

  // A.12 — Operations Security (logging, monitoring)
  await checkIsoOperations(cfg, results, controlMap)
  await onProgress(65)

  // A.13 — Communications Security (network)
  await checkIsoCommunications(cfg, results, controlMap)
  await onProgress(80)

  // A.18 — Compliance
  await checkIsoCompliance(cfg, results, controlMap)
  await onProgress(100)

  return results.filter(r => r.controlDefId)
}

async function checkIsoAccessControl(cfg, results, controlMap) {
  const iam = new IAMClient(cfg)

  // A.9.4.2 — Secure log-on (MFA)
  try {
    const { Users = [] } = await iam.send(new ListUsersCommand({ MaxItems: 1000 }))
    const noMfa = []
    for (const u of Users) {
      const { MFADevices = [] } = await iam.send(new ListMFADevicesCommand({ UserName: u.UserName }))
      if (!MFADevices.length) noMfa.push(u.UserName)
    }
    results.push({
      controlDefId: controlMap['ISO-A.9.4.2-MFA'],
      status: noMfa.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'IAM', controlId: 'ISO-A.9.4.2-MFA',
        detail: noMfa.length === 0
          ? `All ${Users.length} IAM users have MFA enabled`
          : `${noMfa.length} user(s) missing MFA: ${noMfa.slice(0, 5).join(', ')}`,
        resources: noMfa.map(u => ({ type: 'IAM::User', id: u, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.9.4.2-MFA'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // A.9.4.3 — Password management (password policy)
  try {
    const policy = await iam.send(new GetAccountPasswordPolicyCommand({})).catch(() => null)
    const pp = policy?.PasswordPolicy
    const issues = []
    if (!pp) { issues.push('No password policy configured') }
    else {
      if (!pp.RequireUppercaseCharacters) issues.push('uppercase required')
      if (!pp.RequireLowercaseCharacters) issues.push('lowercase required')
      if (!pp.RequireNumbers) issues.push('numbers required')
      if ((pp.MinimumPasswordLength || 0) < 12) issues.push('min 12 chars')
      if (!pp.ExpirePasswords) issues.push('password expiry')
    }
    results.push({
      controlDefId: controlMap['ISO-A.9.4.3-PASSWORD'],
      status: issues.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'IAM', controlId: 'ISO-A.9.4.3-PASSWORD',
        detail: issues.length === 0 ? 'Password policy meets ISO requirements' : `Issues: ${issues.join(', ')}`,
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.9.4.3-PASSWORD'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkIsoCryptography(cfg, results, controlMap) {
  const s3  = new S3Client(cfg)
  const ec2 = new EC2Client(cfg)
  const rds = new RDSClient(cfg)

  // A.10.1.1 — Encryption of data at rest (S3)
  try {
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}))
    const unencrypted = []
    for (const b of Buckets) {
      try { await s3.send(new GetBucketEncryptionCommand({ Bucket: b.Name })) }
      catch (e) { if (e.name === 'ServerSideEncryptionConfigurationNotFoundError') unencrypted.push(b.Name) }
    }
    results.push({
      controlDefId: controlMap['ISO-A.10.1.1-S3'],
      status: unencrypted.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'S3', controlId: 'ISO-A.10.1.1-S3',
        detail: unencrypted.length === 0
          ? `All ${Buckets.length} S3 buckets encrypted at rest`
          : `${unencrypted.length} bucket(s) not encrypted: ${unencrypted.slice(0, 3).join(', ')}`,
        resources: unencrypted.map(b => ({ type: 'S3::Bucket', id: b, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.10.1.1-S3'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // A.10.1.1 — Encryption at rest (EBS)
  try {
    const { Volumes = [] } = await ec2.send(new DescribeVolumesCommand({}))
    const unenc = Volumes.filter(v => !v.Encrypted)
    results.push({
      controlDefId: controlMap['ISO-A.10.1.1-EBS'],
      status: unenc.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'EC2', controlId: 'ISO-A.10.1.1-EBS',
        detail: unenc.length === 0
          ? `All ${Volumes.length} EBS volumes encrypted`
          : `${unenc.length} EBS volume(s) not encrypted`,
        resources: unenc.map(v => ({ type: 'EC2::Volume', id: v.VolumeId, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.10.1.1-EBS'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // A.10.1.1 — RDS encryption
  try {
    const { DBInstances = [] } = await rds.send(new DescribeDBInstancesCommand({}))
    const unenc = DBInstances.filter(d => !d.StorageEncrypted)
    results.push({
      controlDefId: controlMap['ISO-A.10.1.1-RDS'],
      status: unenc.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'RDS', controlId: 'ISO-A.10.1.1-RDS',
        detail: unenc.length === 0
          ? `All ${DBInstances.length} RDS instances encrypted`
          : `${unenc.length} RDS instance(s) not encrypted`,
        resources: unenc.map(d => ({ type: 'RDS::DBInstance', id: d.DBInstanceIdentifier, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.10.1.1-RDS'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkIsoOperations(cfg, results, controlMap) {
  const ct  = new CloudTrailClient(cfg)
  const cwl = new CloudWatchLogsClient(cfg)
  const cfg2 = new ConfigServiceClient(cfg)

  // A.12.4.1 — Event logging (CloudTrail)
  try {
    const { trailList = [] } = await ct.send(new DescribeTrailsCommand({ includeShadowTrails: false }))
    const activeMulti = []
    for (const t of trailList.filter(t => t.IsMultiRegionTrail)) {
      const status = await ct.send(new GetTrailStatusCommand({ Name: t.TrailARN })).catch(() => null)
      if (status?.IsLogging) activeMulti.push(t.Name)
    }
    results.push({
      controlDefId: controlMap['ISO-A.12.4.1-CLOUDTRAIL'],
      status: activeMulti.length > 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'CloudTrail', controlId: 'ISO-A.12.4.1-CLOUDTRAIL',
        detail: activeMulti.length > 0
          ? `Active multi-region CloudTrail: ${activeMulti.join(', ')}`
          : 'No active multi-region CloudTrail found',
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.12.4.1-CLOUDTRAIL'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // A.12.1.2 — Change management (AWS Config enabled)
  try {
    const { ConfigurationRecorders = [] } = await cfg2.send(new DescribeConfigurationRecordersCommand({}))
    const statuses = ConfigurationRecorders.length > 0
      ? await cfg2.send(new DescribeConfigurationRecorderStatusCommand({}))
      : { ConfigurationRecordersStatus: [] }

    const recording = statuses.ConfigurationRecordersStatus?.some(s => s.recording)

    results.push({
      controlDefId: controlMap['ISO-A.12.1.2-CONFIG'],
      status: recording ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'Config', controlId: 'ISO-A.12.1.2-CONFIG',
        detail: recording
          ? 'AWS Config is recording in this region'
          : 'AWS Config is not enabled — configuration changes are not tracked',
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.12.1.2-CONFIG'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkIsoCommunications(cfg, results, controlMap) {
  const ec2 = new EC2Client(cfg)

  // A.13.1.1 — Network controls (no open sensitive ports)
  try {
    const { SecurityGroups = [] } = await ec2.send(new DescribeSecurityGroupsCommand({}))
    const sensitivePorts = [22, 3306, 5432, 1433, 6379, 27017]
    const openGroups = []
    for (const sg of SecurityGroups) {
      for (const rule of sg.IpPermissions || []) {
        const openToWorld = rule.IpRanges?.some(r => r.CidrIp === '0.0.0.0/0') || rule.Ipv6Ranges?.some(r => r.CidrIpv6 === '::/0')
        if (openToWorld && sensitivePorts.includes(rule.FromPort)) {
          openGroups.push({ id: sg.GroupId, name: sg.GroupName, port: rule.FromPort })
        }
      }
    }
    results.push({
      controlDefId: controlMap['ISO-A.13.1.1-SG'],
      status: openGroups.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'EC2', controlId: 'ISO-A.13.1.1-SG',
        detail: openGroups.length === 0
          ? 'No security groups expose sensitive ports to the internet'
          : `${openGroups.length} security group(s) expose sensitive ports to 0.0.0.0/0`,
        resources: openGroups.map(g => ({ type: 'EC2::SecurityGroup', id: g.id, compliant: false, metadata: { port: g.port } })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.13.1.1-SG'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // A.13.2.3 — Electronic messaging (S3 public access)
  try {
    const s3 = new S3Client(cfg)
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}))
    const publicBuckets = []
    for (const b of Buckets) {
      try {
        const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: b.Name }))
        const c = pab.PublicAccessBlockConfiguration
        if (!c.BlockPublicAcls || !c.BlockPublicPolicy || !c.IgnorePublicAcls || !c.RestrictPublicBuckets) {
          publicBuckets.push(b.Name)
        }
      } catch { publicBuckets.push(b.Name) }
    }
    results.push({
      controlDefId: controlMap['ISO-A.13.2.3-S3-PUBLIC'],
      status: publicBuckets.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'S3', controlId: 'ISO-A.13.2.3-S3-PUBLIC',
        detail: publicBuckets.length === 0
          ? `All ${Buckets.length} S3 buckets block public access`
          : `${publicBuckets.length} bucket(s) allow public access`,
        resources: publicBuckets.map(b => ({ type: 'S3::Bucket', id: b, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.13.2.3-S3-PUBLIC'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkIsoCompliance(cfg, results, controlMap) {
  const s3 = new S3Client(cfg)

  // A.18.1.3 — Protection of records (S3 versioning)
  try {
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}))
    const noVersioning = []
    for (const b of Buckets) {
      try {
        const v = await s3.send(new GetBucketVersioningCommand({ Bucket: b.Name }))
        if (v.Status !== 'Enabled') noVersioning.push(b.Name)
      } catch { noVersioning.push(b.Name) }
    }
    results.push({
      controlDefId: controlMap['ISO-A.18.1.3-VERSIONING'],
      status: noVersioning.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'S3', controlId: 'ISO-A.18.1.3-VERSIONING',
        detail: noVersioning.length === 0
          ? `All ${Buckets.length} S3 buckets have versioning enabled`
          : `${noVersioning.length} bucket(s) without versioning: ${noVersioning.slice(0, 3).join(', ')}`,
        resources: noVersioning.map(b => ({ type: 'S3::Bucket', id: b, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['ISO-A.18.1.3-VERSIONING'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

// ── GDPR Checks ────────────────────────────────────────────────────────────

export async function runGdprChecks({ credentials, region, controls, onProgress }) {
  const cfg = { region, credentials }
  const results = []

  const controlMap = {}
  for (const c of controls) controlMap[c.controlId] = c.id

  // Article 5 — Data minimisation & integrity (encryption)
  await checkGdprEncryption(cfg, results, controlMap)
  await onProgress(25)

  // Article 25 — Data protection by design (access controls)
  await checkGdprAccessControl(cfg, results, controlMap)
  await onProgress(50)

  // Article 30 — Records of processing (logging)
  await checkGdprLogging(cfg, results, controlMap)
  await onProgress(75)

  // Article 32 — Security of processing (network)
  await checkGdprSecurity(cfg, results, controlMap)
  await onProgress(100)

  return results.filter(r => r.controlDefId)
}

async function checkGdprEncryption(cfg, results, controlMap) {
  const s3 = new S3Client(cfg)
  const rds = new RDSClient(cfg)

  // Article 5(1)(f) — integrity and confidentiality (encryption at rest)
  try {
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}))
    const unenc = []
    for (const b of Buckets) {
      try { await s3.send(new GetBucketEncryptionCommand({ Bucket: b.Name })) }
      catch (e) { if (e.name === 'ServerSideEncryptionConfigurationNotFoundError') unenc.push(b.Name) }
    }
    results.push({
      controlDefId: controlMap['GDPR-ART5-ENCRYPTION'],
      status: unenc.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'S3', controlId: 'GDPR-ART5-ENCRYPTION',
        detail: unenc.length === 0
          ? `All S3 buckets storing personal data are encrypted at rest`
          : `${unenc.length} S3 bucket(s) without encryption — may store personal data unprotected`,
        resources: unenc.map(b => ({ type: 'S3::Bucket', id: b, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART5-ENCRYPTION'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // Article 32 — RDS encryption
  try {
    const { DBInstances = [] } = await rds.send(new DescribeDBInstancesCommand({}))
    const unenc = DBInstances.filter(d => !d.StorageEncrypted)
    results.push({
      controlDefId: controlMap['GDPR-ART32-RDS'],
      status: unenc.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'RDS', controlId: 'GDPR-ART32-RDS',
        detail: unenc.length === 0
          ? 'All RDS databases are encrypted — personal data protected at rest'
          : `${unenc.length} database(s) without encryption may expose personal data`,
        resources: unenc.map(d => ({ type: 'RDS::DBInstance', id: d.DBInstanceIdentifier, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART32-RDS'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkGdprAccessControl(cfg, results, controlMap) {
  const iam = new IAMClient(cfg)

  // Article 25 — Data protection by design (MFA, least privilege)
  try {
    const { Users = [] } = await iam.send(new ListUsersCommand({ MaxItems: 1000 }))
    const noMfa = []
    for (const u of Users) {
      const { MFADevices = [] } = await iam.send(new ListMFADevicesCommand({ UserName: u.UserName }))
      if (!MFADevices.length) noMfa.push(u.UserName)
    }
    results.push({
      controlDefId: controlMap['GDPR-ART25-MFA'],
      status: noMfa.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'IAM', controlId: 'GDPR-ART25-MFA',
        detail: noMfa.length === 0
          ? 'All IAM users have MFA — access to personal data requires strong authentication'
          : `${noMfa.length} user(s) can access systems without MFA: ${noMfa.slice(0, 5).join(', ')}`,
        resources: noMfa.map(u => ({ type: 'IAM::User', id: u, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART25-MFA'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }

  // Article 25 — Public access to personal data (S3)
  try {
    const s3 = new S3Client(cfg)
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}))
    const publicBuckets = []
    for (const b of Buckets) {
      try {
        const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: b.Name }))
        const c = pab.PublicAccessBlockConfiguration
        if (!c.BlockPublicAcls || !c.BlockPublicPolicy || !c.IgnorePublicAcls || !c.RestrictPublicBuckets) {
          publicBuckets.push(b.Name)
        }
      } catch { publicBuckets.push(b.Name) }
    }
    results.push({
      controlDefId: controlMap['GDPR-ART25-S3-PUBLIC'],
      status: publicBuckets.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'S3', controlId: 'GDPR-ART25-S3-PUBLIC',
        detail: publicBuckets.length === 0
          ? 'No S3 buckets publicly accessible — personal data not exposed'
          : `${publicBuckets.length} publicly accessible bucket(s) may expose personal data`,
        resources: publicBuckets.map(b => ({ type: 'S3::Bucket', id: b, compliant: false })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART25-S3-PUBLIC'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkGdprLogging(cfg, results, controlMap) {
  const ct = new CloudTrailClient(cfg)

  // Article 30 — Records of processing activities (audit logging)
  try {
    const { trailList = [] } = await ct.send(new DescribeTrailsCommand({ includeShadowTrails: false }))
    const validationTrails = trailList.filter(t => t.LogFileValidationEnabled)
    results.push({
      controlDefId: controlMap['GDPR-ART30-LOGGING'],
      status: validationTrails.length > 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'CloudTrail', controlId: 'GDPR-ART30-LOGGING',
        detail: validationTrails.length > 0
          ? `Tamper-proof audit logging active with log file validation on ${validationTrails.length} trail(s)`
          : 'No CloudTrail with log file validation — cannot demonstrate integrity of processing records',
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART30-LOGGING'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}

async function checkGdprSecurity(cfg, results, controlMap) {
  const ec2 = new EC2Client(cfg)

  // Article 32 — Security of processing (network controls)
  try {
    const { SecurityGroups = [] } = await ec2.send(new DescribeSecurityGroupsCommand({}))
    const dbPorts = [3306, 5432, 1433, 27017]
    const exposedDbs = []
    for (const sg of SecurityGroups) {
      for (const rule of sg.IpPermissions || []) {
        const open = rule.IpRanges?.some(r => r.CidrIp === '0.0.0.0/0')
        if (open && dbPorts.includes(rule.FromPort)) {
          exposedDbs.push({ id: sg.GroupId, port: rule.FromPort })
        }
      }
    }
    results.push({
      controlDefId: controlMap['GDPR-ART32-NETWORK'],
      status: exposedDbs.length === 0 ? 'pass' : 'fail',
      evidence: {
        source: 'aws', checkGroup: 'EC2', controlId: 'GDPR-ART32-NETWORK',
        detail: exposedDbs.length === 0
          ? 'No databases exposed to the public internet'
          : `${exposedDbs.length} security group(s) expose database ports to the internet — personal data at risk`,
        resources: exposedDbs.map(g => ({ type: 'EC2::SecurityGroup', id: g.id, compliant: false, metadata: { port: g.port } })),
        checkedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    results.push({ controlDefId: controlMap['GDPR-ART32-NETWORK'], status: 'review', evidence: { source: 'aws', detail: err.message, checkedAt: new Date().toISOString() } })
  }
}
