import { CloudTrailClient, DescribeTrailsCommand, GetTrailStatusCommand } from '@aws-sdk/client-cloudtrail'
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds'
import { GuardDutyClient, ListDetectorsCommand, GetDetectorCommand } from '@aws-sdk/client-guardduty'
import { EC2Client, DescribeSecurityGroupsCommand, DescribeVolumesCommand } from '@aws-sdk/client-ec2'

// ── CloudTrail ─────────────────────────────────────────────────────────────
export async function cloudtrailChecks(clientConfig) {
  const ct = new CloudTrailClient(clientConfig)
  const results = []

  try {
    const trails = await ct.send(new DescribeTrailsCommand({ includeShadowTrails: false }))
    const allTrails = trails.trailList || []

    const multiRegionTrails = allTrails.filter(t => t.IsMultiRegionTrail)
    const logFileValidationTrails = allTrails.filter(t => t.LogFileValidationEnabled)

    // Check at least one multi-region trail exists and is logging
    let activeMultiRegionTrail = null
    for (const trail of multiRegionTrails) {
      try {
        const status = await ct.send(new GetTrailStatusCommand({ Name: trail.TrailARN }))
        if (status.IsLogging) {
          activeMultiRegionTrail = trail
          break
        }
      } catch { /* continue */ }
    }

    results.push({
      controlId: 'CC7.2-CLOUDTRAIL',
      status: activeMultiRegionTrail ? 'pass' : 'fail',
      detail: activeMultiRegionTrail
        ? `Active multi-region CloudTrail found: ${activeMultiRegionTrail.Name}`
        : allTrails.length === 0
          ? 'No CloudTrail trails configured'
          : 'No active multi-region CloudTrail found',
      resources: allTrails.map(t => ({
        type: 'CloudTrail::Trail',
        id: t.Name,
        compliant: t.IsMultiRegionTrail
      }))
    })

    results.push({
      controlId: 'CC7.2-CLOUDTRAIL-VALIDATION',
      status: logFileValidationTrails.length > 0 ? 'pass' : 'fail',
      detail: logFileValidationTrails.length > 0
        ? `Log file validation enabled on ${logFileValidationTrails.length} trail(s)`
        : 'No trails have log file validation enabled',
      resources: allTrails.map(t => ({
        type: 'CloudTrail::Trail',
        id: t.Name,
        compliant: t.LogFileValidationEnabled
      }))
    })
  } catch (err) {
    results.push({ controlId: 'CC7.2-CLOUDTRAIL', status: 'review', detail: `Could not check CloudTrail: ${err.message}` })
  }

  return results
}

// ── RDS ────────────────────────────────────────────────────────────────────
export async function rdsChecks(clientConfig) {
  const rds = new RDSClient(clientConfig)
  const results = []

  try {
    const resp = await rds.send(new DescribeDBInstancesCommand({}))
    const instances = resp.DBInstances || []

    if (instances.length === 0) {
      return [{ controlId: 'CC9.1-RDS-ENCRYPTION', status: 'pass', detail: 'No RDS instances found', resources: [] }]
    }

    const unencrypted = instances.filter(i => !i.StorageEncrypted)
    const publiclyAccessible = instances.filter(i => i.PubliclyAccessible)
    const noBackup = instances.filter(i => i.BackupRetentionPeriod === 0)
    const noMultiAz = instances.filter(i => !i.MultiAZ && !i.DBInstanceClass.startsWith('db.t'))

    results.push({
      controlId: 'CC9.1-RDS-ENCRYPTION',
      status: unencrypted.length === 0 ? 'pass' : 'fail',
      detail: unencrypted.length === 0
        ? `All ${instances.length} RDS instances have encryption at rest`
        : `${unencrypted.length} RDS instance(s) not encrypted: ${unencrypted.map(i => i.DBInstanceIdentifier).join(', ')}`,
      resources: instances.map(i => ({ type: 'RDS::DBInstance', id: i.DBInstanceIdentifier, compliant: i.StorageEncrypted }))
    })

    results.push({
      controlId: 'CC6.6-RDS-PUBLIC',
      status: publiclyAccessible.length === 0 ? 'pass' : 'fail',
      detail: publiclyAccessible.length === 0
        ? `No RDS instances are publicly accessible`
        : `${publiclyAccessible.length} instance(s) publicly accessible: ${publiclyAccessible.map(i => i.DBInstanceIdentifier).join(', ')}`,
      resources: instances.map(i => ({ type: 'RDS::DBInstance', id: i.DBInstanceIdentifier, compliant: !i.PubliclyAccessible }))
    })

    results.push({
      controlId: 'CC9.2-RDS-BACKUP',
      status: noBackup.length === 0 ? 'pass' : 'fail',
      detail: noBackup.length === 0
        ? 'All RDS instances have automated backups enabled'
        : `${noBackup.length} instance(s) have backups disabled`,
      resources: instances.map(i => ({
        type: 'RDS::DBInstance',
        id: i.DBInstanceIdentifier,
        compliant: i.BackupRetentionPeriod > 0,
        metadata: { retentionDays: i.BackupRetentionPeriod }
      }))
    })
  } catch (err) {
    results.push({ controlId: 'CC9.1-RDS-ENCRYPTION', status: 'review', detail: `Could not check RDS: ${err.message}` })
  }

  return results
}

// ── GuardDuty ──────────────────────────────────────────────────────────────
export async function guarddutyChecks(clientConfig) {
  const gd = new GuardDutyClient(clientConfig)
  const results = []

  try {
    const detectorsResp = await gd.send(new ListDetectorsCommand({}))
    const detectorIds = detectorsResp.DetectorIds || []

    if (detectorIds.length === 0) {
      return [{
        controlId: 'CC7.1-GUARDDUTY',
        status: 'fail',
        detail: 'GuardDuty is not enabled in this region',
        resources: []
      }]
    }

    const detector = await gd.send(new GetDetectorCommand({ DetectorId: detectorIds[0] }))
    const isEnabled = detector.Status === 'ENABLED'

    results.push({
      controlId: 'CC7.1-GUARDDUTY',
      status: isEnabled ? 'pass' : 'fail',
      detail: isEnabled
        ? `GuardDuty is enabled (updated: ${detector.UpdatedAt})`
        : 'GuardDuty detector exists but is disabled',
      resources: [{ type: 'GuardDuty::Detector', id: detectorIds[0], compliant: isEnabled }]
    })
  } catch (err) {
    results.push({ controlId: 'CC7.1-GUARDDUTY', status: 'review', detail: `Could not check GuardDuty: ${err.message}` })
  }

  return results
}

// ── EC2 ────────────────────────────────────────────────────────────────────
export async function ec2Checks(clientConfig) {
  const ec2 = new EC2Client(clientConfig)
  const results = []

  // Check for overly permissive security groups (0.0.0.0/0 on sensitive ports)
  try {
    const sgResp = await ec2.send(new DescribeSecurityGroupsCommand({}))
    const groups = sgResp.SecurityGroups || []

    const sensitivePorts = [22, 3306, 5432, 1433, 6379, 27017]
    const openGroups = []

    for (const sg of groups) {
      for (const rule of sg.IpPermissions || []) {
        const isOpenToWorld = rule.IpRanges?.some(r => r.CidrIp === '0.0.0.0/0') ||
                              rule.Ipv6Ranges?.some(r => r.CidrIpv6 === '::/0')

        if (isOpenToWorld && sensitivePorts.includes(rule.FromPort)) {
          openGroups.push({ id: sg.GroupId, name: sg.GroupName, port: rule.FromPort })
        }
      }
    }

    results.push({
      controlId: 'CC6.6-EC2-SG',
      status: openGroups.length === 0 ? 'pass' : 'fail',
      detail: openGroups.length === 0
        ? 'No security groups expose sensitive ports to the internet'
        : `${openGroups.length} security group(s) expose sensitive ports (${[...new Set(openGroups.map(g => g.port))].join(', ')}) to 0.0.0.0/0`,
      resources: openGroups.map(g => ({ type: 'EC2::SecurityGroup', id: g.id, compliant: false, metadata: { port: g.port } }))
    })
  } catch (err) {
    results.push({ controlId: 'CC6.6-EC2-SG', status: 'review', detail: `Could not check security groups: ${err.message}` })
  }

  // Check EBS volumes are encrypted
  try {
    const volResp = await ec2.send(new DescribeVolumesCommand({}))
    const volumes = volResp.Volumes || []
    const unencrypted = volumes.filter(v => !v.Encrypted)

    results.push({
      controlId: 'CC9.1-EBS-ENCRYPTION',
      status: unencrypted.length === 0 ? 'pass' : 'fail',
      detail: unencrypted.length === 0
        ? `All ${volumes.length} EBS volumes are encrypted`
        : `${unencrypted.length} EBS volume(s) not encrypted`,
      resources: unencrypted.map(v => ({ type: 'EC2::Volume', id: v.VolumeId, compliant: false }))
    })
  } catch (err) {
    results.push({ controlId: 'CC9.1-EBS-ENCRYPTION', status: 'review', detail: `Could not check EBS: ${err.message}` })
  }

  return results
}
