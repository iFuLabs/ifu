import {
  S3Client,
  ListBucketsCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketLoggingCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyStatusCommand
} from '@aws-sdk/client-s3'

/**
 * S3 checks map to SOC 2 CC6.1, CC6.6, CC7.2, CC9.1
 */
export async function s3Checks(clientConfig) {
  const s3 = new S3Client(clientConfig)
  const results = []

  const bucketsResp = await s3.send(new ListBucketsCommand({}))
  const buckets = bucketsResp.Buckets || []

  if (buckets.length === 0) {
    return [{ controlId: 'CC6.6-S3-PUBLIC', status: 'pass', detail: 'No S3 buckets found', resources: [] }]
  }

  // Track per-check failures
  const publicBuckets = []
  const unencryptedBuckets = []
  const noVersioningBuckets = []
  const noLoggingBuckets = []

  for (const bucket of buckets) {
    const name = bucket.Name

    // ── CC6.6: Block public access ──────────────────────────────────────
    try {
      const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name }))
      const config = pab.PublicAccessBlockConfiguration
      const isBlocked =
        config.BlockPublicAcls &&
        config.BlockPublicPolicy &&
        config.IgnorePublicAcls &&
        config.RestrictPublicBuckets

      if (!isBlocked) publicBuckets.push(name)
    } catch {
      publicBuckets.push(name) // If we can't check, assume not blocked
    }

    // ── CC9.1: Server-side encryption ──────────────────────────────────
    try {
      await s3.send(new GetBucketEncryptionCommand({ Bucket: name }))
      // If no error, encryption is enabled
    } catch (err) {
      if (err.name === 'ServerSideEncryptionConfigurationNotFoundError') {
        unencryptedBuckets.push(name)
      }
    }

    // ── CC7.2: Versioning enabled ───────────────────────────────────────
    try {
      const versioning = await s3.send(new GetBucketVersioningCommand({ Bucket: name }))
      if (versioning.Status !== 'Enabled') {
        noVersioningBuckets.push(name)
      }
    } catch {
      noVersioningBuckets.push(name)
    }

    // ── CC7.2: Access logging ───────────────────────────────────────────
    try {
      const logging = await s3.send(new GetBucketLoggingCommand({ Bucket: name }))
      if (!logging.LoggingEnabled) {
        noLoggingBuckets.push(name)
      }
    } catch {
      noLoggingBuckets.push(name)
    }
  }

  results.push({
    controlId: 'CC6.6-S3-PUBLIC',
    status: publicBuckets.length === 0 ? 'pass' : 'fail',
    detail: publicBuckets.length === 0
      ? `All ${buckets.length} S3 buckets block public access`
      : `${publicBuckets.length} bucket(s) allow public access: ${publicBuckets.slice(0, 3).join(', ')}`,
    resources: publicBuckets.map(b => ({ type: 'S3::Bucket', id: b, compliant: false }))
  })

  results.push({
    controlId: 'CC9.1-S3-ENCRYPTION',
    status: unencryptedBuckets.length === 0 ? 'pass' : 'fail',
    detail: unencryptedBuckets.length === 0
      ? `All ${buckets.length} S3 buckets have server-side encryption`
      : `${unencryptedBuckets.length} bucket(s) without encryption: ${unencryptedBuckets.slice(0, 3).join(', ')}`,
    resources: unencryptedBuckets.map(b => ({ type: 'S3::Bucket', id: b, compliant: false }))
  })

  results.push({
    controlId: 'CC7.2-S3-LOGGING',
    status: noLoggingBuckets.length === 0 ? 'pass' : 'fail',
    detail: noLoggingBuckets.length === 0
      ? `All ${buckets.length} S3 buckets have access logging enabled`
      : `${noLoggingBuckets.length} bucket(s) without logging: ${noLoggingBuckets.slice(0, 3).join(', ')}`,
    resources: noLoggingBuckets.map(b => ({ type: 'S3::Bucket', id: b, compliant: false }))
  })

  return results
}
