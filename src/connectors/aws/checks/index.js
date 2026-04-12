import { iamChecks } from './iam.js'
import { s3Checks } from './s3.js'
import { cloudtrailChecks } from './cloudtrail.js'
import { rdsChecks } from './rds.js'
import { guarddutyChecks } from './guardduty.js'
import { ec2Checks } from './ec2.js'
import { runIso27001Checks, runGdprChecks } from './iso-gdpr.js'

/**
 * Runs all AWS checks and returns normalized results.
 *
 * @param {object} opts
 * @param {object} opts.credentials - Temporary AWS credentials
 * @param {string} opts.region
 * @param {Array}  opts.controls - Control definitions from DB
 * @param {Function} opts.onProgress - Callback with 0-100 progress
 * @returns {Array} results - [{ controlDefId, status, evidence }]
 */
export async function runAwsChecks({ credentials, region, controls, onProgress }) {
  const clientConfig = { region, credentials }
  const results = []

  // Map controlId → controlDefId for easy lookup
  const controlMap = {}
  for (const c of controls) {
    controlMap[c.controlId] = c.id
  }

  const checkGroups = [
    { name: 'IAM',        fn: iamChecks,        weight: 20 },
    { name: 'S3',         fn: s3Checks,         weight: 20 },
    { name: 'CloudTrail', fn: cloudtrailChecks, weight: 15 },
    { name: 'RDS',        fn: rdsChecks,        weight: 15 },
    { name: 'GuardDuty',  fn: guarddutyChecks,  weight: 15 },
    { name: 'EC2',        fn: ec2Checks,        weight: 10 },
    { name: 'ISO27001',   fn: (cfg) => runIso27001Checks({ credentials: cfg.credentials, region: cfg.region, controls, onProgress: async () => {} }), weight: 10 },
    { name: 'GDPR',       fn: (cfg) => runGdprChecks({ credentials: cfg.credentials, region: cfg.region, controls, onProgress: async () => {} }), weight: 5 }
  ]

  let cumulativeProgress = 0

  for (const group of checkGroups) {
    try {
      const groupResults = await group.fn(clientConfig)

      for (const result of groupResults) {
        const controlDefId = controlMap[result.controlId]
        if (!controlDefId) continue // Control not in our DB yet — skip

        results.push({
          controlDefId,
          status: result.status,
          evidence: {
            source: 'aws',
            checkGroup: group.name,
            controlId: result.controlId,
            detail: result.detail,
            resources: result.resources || [],
            checkedAt: new Date().toISOString()
          }
        })
      }
    } catch (err) {
      console.error(`Check group ${group.name} failed:`, err.message)
      // Don't fail the whole scan — mark affected controls as 'review'
    }

    cumulativeProgress += group.weight
    await onProgress(cumulativeProgress)
  }

  return results
}
