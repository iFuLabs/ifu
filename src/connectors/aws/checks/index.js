import { iamChecks } from './iam.js'
import { s3Checks } from './s3.js'
import { cloudtrailChecks } from './cloudtrail.js'
import { rdsChecks } from './rds.js'
import { guarddutyChecks } from './guardduty.js'
import { ec2Checks } from './ec2.js'
import { runIso27001Checks, runGdprChecks } from './iso-gdpr.js'
import { securityChecks } from './security.js'
import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2'

/**
 * Enumerate all opted-in AWS regions for the account.
 * Falls back to the primary region if the API call fails.
 */
async function getActiveRegions(credentials, primaryRegion) {
  try {
    const ec2 = new EC2Client({ region: primaryRegion, credentials })
    const { Regions = [] } = await ec2.send(new DescribeRegionsCommand({ AllRegions: false }))
    return Regions.map(r => r.RegionName).filter(Boolean)
  } catch {
    return [primaryRegion]
  }
}

/**
 * Merge multi-region results for a single controlId.
 * - If ANY region fails → overall fail (worst-case wins)
 * - If ALL regions pass → pass
 * - If any region is 'review' and none fail → review
 * Resources from all regions are concatenated.
 */
function mergeRegionResults(regionResults) {
  const byControlId = new Map()

  for (const { region, results } of regionResults) {
    for (const r of results) {
      if (!byControlId.has(r.controlId)) {
        byControlId.set(r.controlId, { controlId: r.controlId, regionStatuses: [], allResources: [], allDetails: [] })
      }
      const entry = byControlId.get(r.controlId)
      entry.regionStatuses.push({ region, status: r.status })
      entry.allResources.push(...(r.resources || []).map(res => ({ ...res, region })))
      entry.allDetails.push(`${region}: ${r.detail}`)
    }
  }

  const merged = []
  for (const [controlId, entry] of byControlId) {
    const statuses = entry.regionStatuses.map(s => s.status)
    let status = 'pass'
    if (statuses.includes('fail')) status = 'fail'
    else if (statuses.includes('review')) status = 'review'

    const failingRegions = entry.regionStatuses.filter(s => s.status === 'fail').map(s => s.region)
    const detail = failingRegions.length > 0
      ? `Failing in ${failingRegions.length} region(s): ${failingRegions.join(', ')}`
      : entry.allDetails[0] || ''

    merged.push({
      controlId,
      status,
      detail,
      resources: entry.allResources,
      regionDetails: entry.allDetails
    })
  }

  return merged
}

/**
 * Runs all AWS checks and returns normalized results.
 * Region-sensitive checks (GuardDuty, EC2, RDS, VPC/KMS security) are fanned
 * out across all active regions. Global checks (IAM, S3, CloudTrail) run once.
 *
 * @param {object} opts
 * @param {object} opts.credentials - Temporary AWS credentials
 * @param {string} opts.region      - Primary region (used for global checks + region enumeration)
 * @param {Array}  opts.controls    - Control definitions from DB
 * @param {Function} opts.onProgress - Callback with 0-100 progress
 * @returns {Array} results - [{ controlDefId, status, evidence }]
 */
export async function runAwsChecks({ credentials, region, controls, onProgress }) {
  const primaryRegion = region || process.env.AWS_REGION || 'us-east-1'
  const results = []

  // Map controlId → controlDefId for easy lookup
  const controlMap = {}
  for (const c of controls) {
    controlMap[c.controlId] = c.id
  }

  // ── Step 1: Enumerate active regions (5% progress) ─────────────────────
  const activeRegions = await getActiveRegions(credentials, primaryRegion)
  await onProgress(5)

  // ── Step 2: Global checks — run once against primary region ────────────
  // IAM, S3, CloudTrail are global AWS services; scanning them per-region
  // would produce duplicate results.
  const primaryConfig = { region: primaryRegion, credentials }

  const globalCheckGroups = [
    { name: 'IAM',        fn: iamChecks,        weight: 15 },
    { name: 'S3',         fn: s3Checks,         weight: 15 },
    { name: 'CloudTrail', fn: cloudtrailChecks, weight: 10 },
  ]

  let cumulativeProgress = 5
  for (const group of globalCheckGroups) {
    try {
      const groupResults = await group.fn(primaryConfig)
      for (const result of groupResults) {
        const controlDefId = controlMap[result.controlId]
        if (!controlDefId) continue
        results.push({
          controlDefId,
          status: result.status,
          evidence: {
            source: 'aws',
            checkGroup: group.name,
            controlId: result.controlId,
            detail: result.detail,
            resources: result.resources || [],
            regions: [primaryRegion],
            checkedAt: new Date().toISOString()
          }
        })
      }
    } catch (err) {
      console.error(`Check group ${group.name} failed:`, err.message)
    }
    cumulativeProgress += group.weight
    await onProgress(cumulativeProgress)
  }

  // ── Step 3: Regional checks — fan out across all active regions ─────────
  // GuardDuty, EC2 security groups, RDS, VPC flow logs, KMS rotation are
  // all per-region resources. A customer may have GuardDuty enabled in
  // us-east-1 but not eu-west-1 — we need to catch that.
  const regionalCheckFns = [
    { name: 'GuardDuty', fn: guarddutyChecks },
    { name: 'EC2',       fn: ec2Checks },
    { name: 'RDS',       fn: rdsChecks },
    { name: 'Security',  fn: securityChecks },
  ]

  // Run all regions in parallel, capped at 5 concurrent to avoid throttling
  const REGION_CONCURRENCY = 5
  const regionChunks = []
  for (let i = 0; i < activeRegions.length; i += REGION_CONCURRENCY) {
    regionChunks.push(activeRegions.slice(i, i + REGION_CONCURRENCY))
  }

  const allRegionalResults = [] // [{ region, checkName, results }]

  for (const chunk of regionChunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (r) => {
        const cfg = { region: r, credentials }
        const regionResults = []
        for (const check of regionalCheckFns) {
          try {
            const res = await check.fn(cfg)
            regionResults.push({ checkName: check.name, results: res })
          } catch (err) {
            console.warn(`Regional check ${check.name} failed in ${r}:`, err.message)
          }
        }
        return { region: r, regionResults }
      })
    )
    allRegionalResults.push(...chunkResults)
  }

  // Merge per-check across regions
  for (const checkFn of regionalCheckFns) {
    const perRegion = allRegionalResults.map(({ region, regionResults }) => ({
      region,
      results: regionResults.find(r => r.checkName === checkFn.name)?.results || []
    }))

    const merged = mergeRegionResults(perRegion)
    for (const result of merged) {
      const controlDefId = controlMap[result.controlId]
      if (!controlDefId) continue
      results.push({
        controlDefId,
        status: result.status,
        evidence: {
          source: 'aws',
          checkGroup: checkFn.name,
          controlId: result.controlId,
          detail: result.detail,
          resources: result.resources || [],
          regions: activeRegions,
          regionDetails: result.regionDetails,
          checkedAt: new Date().toISOString()
        }
      })
    }
  }

  cumulativeProgress = 80
  await onProgress(cumulativeProgress)

  // ── Step 4: Framework-specific checks (ISO 27001, GDPR) ─────────────────
  const frameworkChecks = [
    { name: 'ISO27001', fn: (cfg) => runIso27001Checks({ credentials: cfg.credentials, region: cfg.region, controls, onProgress: async () => {} }), weight: 10 },
    { name: 'GDPR',     fn: (cfg) => runGdprChecks({ credentials: cfg.credentials, region: cfg.region, controls, onProgress: async () => {} }), weight: 5 },
  ]

  for (const group of frameworkChecks) {
    try {
      const groupResults = await group.fn(primaryConfig)
      for (const result of groupResults) {
        const controlDefId = controlMap[result.controlId]
        if (!controlDefId) continue
        // Avoid duplicating a controlDefId already written by a regional check
        if (results.some(r => r.controlDefId === controlDefId)) continue
        results.push({
          controlDefId,
          status: result.status,
          evidence: {
            source: 'aws',
            checkGroup: group.name,
            controlId: result.controlId,
            detail: result.detail,
            resources: result.resources || [],
            regions: [primaryRegion],
            checkedAt: new Date().toISOString()
          }
        })
      }
    } catch (err) {
      console.error(`Check group ${group.name} failed:`, err.message)
    }
    cumulativeProgress += group.weight
    await onProgress(Math.min(cumulativeProgress, 100))
  }

  await onProgress(100)
  return results
}
