import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetReservationCoverageCommand,
  GetSavingsPlansCoverageCommand,
  GetRightsizingRecommendationCommand,
} from '@aws-sdk/client-cost-explorer'

import {
  ComputeOptimizerClient,
  GetEC2InstanceRecommendationsCommand,
  GetLambdaFunctionRecommendationsCommand,
} from '@aws-sdk/client-compute-optimizer'

import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeAddressesCommand,
  DescribeNatGatewaysCommand,
} from '@aws-sdk/client-ec2'

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch'

import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds'

/**
 * Runs all FinOps checks for a connected AWS account.
 * Returns a structured findings object with savings opportunities.
 */
export async function runFinOpsChecks({ credentials, region, onProgress }) {
  const cfg = { region, credentials }

  const findings = {
    monthlyCost:        null,
    forecastedCost:     null,
    totalMonthlySavings: 0,
    waste:              [],
    rightsizing:        [],
    reservations:       [],
    savingsPlans:       [],
    topServices:        [],
    summary:            {}
  }

  // ── 1. Current spend & top services ──────────────────────────
  try {
    const spend = await getCurrentSpend(cfg)
    findings.monthlyCost  = spend.monthlyCost
    findings.topServices  = spend.topServices
    await onProgress(15)
  } catch (err) {
    console.warn('FinOps: spend check failed:', err.message)
  }

  // ── 2. Cost forecast ──────────────────────────────────────────
  try {
    findings.forecastedCost = await getCostForecast(cfg)
    await onProgress(25)
  } catch (err) {
    console.warn('FinOps: forecast failed:', err.message)
  }

  // ── 3. Waste detection ────────────────────────────────────────
  try {
    const waste = await detectWaste(cfg, region)
    findings.waste = waste
    findings.totalMonthlySavings += waste.reduce((sum, w) => sum + (w.estimatedMonthlySavings || 0), 0)
    await onProgress(45)
  } catch (err) {
    console.warn('FinOps: waste detection failed:', err.message)
  }

  // ── 4. Rightsizing recommendations ───────────────────────────
  try {
    findings.rightsizing = await getRightsizingRecommendations(cfg)
    findings.totalMonthlySavings += findings.rightsizing.reduce((sum, r) => sum + (r.estimatedMonthlySavings || 0), 0)
    await onProgress(65)
  } catch (err) {
    console.warn('FinOps: rightsizing failed:', err.message)
  }

  // ── 5. Reserved Instance coverage ────────────────────────────
  try {
    findings.reservations = await getReservationCoverage(cfg)
    await onProgress(80)
  } catch (err) {
    console.warn('FinOps: reservations failed:', err.message)
  }

  // ── 6. Savings Plans coverage ─────────────────────────────────
  try {
    findings.savingsPlans = await getSavingsPlansCoverage(cfg)
    await onProgress(90)
  } catch (err) {
    console.warn('FinOps: savings plans failed:', err.message)
  }

  // ── Build summary ─────────────────────────────────────────────
  findings.summary = {
    wasteItems:       findings.waste.length,
    rightsizingItems: findings.rightsizing.length,
    totalMonthlySavings: Math.round(findings.totalMonthlySavings * 100) / 100,
    totalAnnualSavings:  Math.round(findings.totalMonthlySavings * 12 * 100) / 100,
    coverageGaps:     findings.reservations.filter(r => r.coveragePercentage < 70).length +
                      findings.savingsPlans.filter(s => s.coveragePercentage < 70).length,
    checkedAt:        new Date().toISOString()
  }

  await onProgress(100)
  return findings
}

// ── Individual check functions ─────────────────────────────────

async function getCurrentSpend(cfg) {
  const ce = new CostExplorerClient(cfg)

  const end   = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1) // first of this month

  const { ResultsByTime } = await ce.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: start.toISOString().slice(0, 10),
      End:   end.toISOString().slice(0, 10),
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
  }))

  const groups = ResultsByTime?.[0]?.Groups || []

  const topServices = groups
    .map(g => ({
      service: g.Keys[0],
      cost: parseFloat(g.Metrics.UnblendedCost.Amount || '0'),
      unit: g.Metrics.UnblendedCost.Unit
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  const monthlyCost = topServices.reduce((sum, s) => sum + s.cost, 0)

  return { monthlyCost: Math.round(monthlyCost * 100) / 100, topServices }
}

async function getCostForecast(cfg) {
  const ce = new CostExplorerClient(cfg)

  const start = new Date()
  start.setDate(start.getDate() + 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0) // end of month

  if (start >= end) return null // already at end of month

  const result = await ce.send(new GetCostForecastCommand({
    TimePeriod: {
      Start: start.toISOString().slice(0, 10),
      End:   end.toISOString().slice(0, 10),
    },
    Metric: 'UNBLENDED_COST',
    Granularity: 'MONTHLY'
  }))

  return parseFloat(result.Total?.Amount || '0')
}

async function detectWaste(cfg, region) {
  const ec2 = new EC2Client(cfg)
  const rds = new RDSClient(cfg)
  const cw  = new CloudWatchClient(cfg)
  const waste = []

  // ── Unattached EBS volumes ───────────────────────────────────
  try {
    const { Volumes = [] } = await ec2.send(new DescribeVolumesCommand({
      Filters: [{ Name: 'status', Values: ['available'] }]
    }))

    for (const vol of Volumes) {
      const sizeGb = vol.Size || 0
      const estimatedMonthlySavings = sizeGb * 0.10 // ~$0.10/GB/month gp2

      waste.push({
        type:        'unattached_ebs',
        resourceId:  vol.VolumeId,
        resourceType: 'EBS Volume',
        description: `Unattached ${vol.VolumeType || 'gp2'} volume (${sizeGb} GB) — not attached to any instance`,
        estimatedMonthlySavings,
        recommendation: `Delete or snapshot this volume. Run: aws ec2 delete-volume --volume-id ${vol.VolumeId}`,
        severity: estimatedMonthlySavings > 20 ? 'high' : 'medium',
        metadata: { sizeGb, volumeType: vol.VolumeType, createTime: vol.CreateTime }
      })
    }
  } catch (err) {
    console.warn('EBS waste check failed:', err.message)
  }

  // ── Unused Elastic IPs ───────────────────────────────────────
  try {
    const { Addresses = [] } = await ec2.send(new DescribeAddressesCommand({}))

    for (const addr of Addresses.filter(a => !a.AssociationId)) {
      waste.push({
        type:        'unused_eip',
        resourceId:  addr.AllocationId,
        resourceType: 'Elastic IP',
        description: `Unassociated Elastic IP ${addr.PublicIp} — charged ~$3.60/month when not attached`,
        estimatedMonthlySavings: 3.60,
        recommendation: `Release this Elastic IP. Run: aws ec2 release-address --allocation-id ${addr.AllocationId}`,
        severity: 'low',
        metadata: { publicIp: addr.PublicIp }
      })
    }
  } catch (err) {
    console.warn('EIP waste check failed:', err.message)
  }

  // ── Idle NAT Gateways (< 1GB traffic last 7 days) ───────────
  try {
    const { NatGateways = [] } = await ec2.send(new DescribeNatGatewaysCommand({
      Filter: [{ Name: 'state', Values: ['available'] }]
    }))

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    for (const nat of NatGateways) {
      try {
        const { Datapoints = [] } = await cw.send(new GetMetricStatisticsCommand({
          Namespace:  'AWS/NATGateway',
          MetricName: 'BytesOutToDestination',
          Dimensions: [{ Name: 'NatGatewayId', Value: nat.NatGatewayId }],
          StartTime:  sevenDaysAgo,
          EndTime:    new Date(),
          Period:     604800, // 7 days in seconds
          Statistics: ['Sum']
        }))

        const totalBytes = Datapoints.reduce((sum, d) => sum + (d.Sum || 0), 0)
        const totalGB    = totalBytes / (1024 ** 3)

        if (totalGB < 1) {
          waste.push({
            type:        'idle_nat_gateway',
            resourceId:  nat.NatGatewayId,
            resourceType: 'NAT Gateway',
            description: `NAT Gateway processed only ${totalGB.toFixed(2)} GB in the last 7 days — likely idle`,
            estimatedMonthlySavings: 32, // ~$32/month base cost
            recommendation: 'Review if this NAT Gateway is still needed. Consider sharing one NAT Gateway across AZs for non-production workloads.',
            severity: 'high',
            metadata: { subnetId: nat.SubnetId, trafficGbLast7Days: totalGB.toFixed(3) }
          })
        }
      } catch { /* CloudWatch permission may be missing */ }
    }
  } catch (err) {
    console.warn('NAT Gateway waste check failed:', err.message)
  }

  // ── Idle RDS instances (< 1 connection last 7 days) ─────────
  try {
    const { DBInstances = [] } = await rds.send(new DescribeDBInstancesCommand({}))
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    for (const db of DBInstances.filter(d => d.DBInstanceStatus === 'available')) {
      try {
        const { Datapoints = [] } = await cw.send(new GetMetricStatisticsCommand({
          Namespace:  'AWS/RDS',
          MetricName: 'DatabaseConnections',
          Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier }],
          StartTime:  sevenDaysAgo,
          EndTime:    new Date(),
          Period:     604800,
          Statistics: ['Maximum']
        }))

        const maxConnections = Math.max(...Datapoints.map(d => d.Maximum || 0), 0)

        if (maxConnections === 0) {
          // Rough cost estimate based on instance class
          const estimatedMonthlySavings = db.DBInstanceClass?.includes('large') ? 80 : 40

          waste.push({
            type:        'idle_rds',
            resourceId:  db.DBInstanceIdentifier,
            resourceType: 'RDS Instance',
            description: `RDS instance ${db.DBInstanceIdentifier} (${db.DBInstanceClass}) had zero connections in the last 7 days`,
            estimatedMonthlySavings,
            recommendation: 'Stop or delete this RDS instance if not needed. Use RDS Serverless v2 for infrequently accessed databases.',
            severity: 'high',
            metadata: {
              instanceClass: db.DBInstanceClass,
              engine: db.Engine,
              multiAz: db.MultiAZ
            }
          })
        }
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('RDS idle check failed:', err.message)
  }

  return waste
}

async function getRightsizingRecommendations(cfg) {
  const ce   = new CostExplorerClient(cfg)
  const recommendations = []

  try {
    const { RightsizingRecommendations = [] } = await ce.send(
      new GetRightsizingRecommendationCommand({
        Service: 'AmazonEC2',
        Configuration: { RecommendationTarget: 'SAME_INSTANCE_FAMILY', BenefitsConsidered: true }
      })
    )

    for (const rec of RightsizingRecommendations.slice(0, 20)) {
      const current   = rec.CurrentInstance
      const rightsize = rec.RightsizingType === 'Terminate'
        ? null
        : rec.ModifyRecommendationDetail?.TargetInstances?.[0]

      const savings = parseFloat(
        rightsize?.EstimatedMonthlySavings ||
        rec.TerminateRecommendationDetail?.EstimatedMonthlySavings || '0'
      )

      recommendations.push({
        resourceId:   current?.ResourceId,
        resourceType: 'EC2 Instance',
        currentType:  current?.InstanceType,
        targetType:   rightsize?.InstanceType || null,
        action:       rec.RightsizingType === 'Terminate' ? 'terminate' : 'downsize',
        estimatedMonthlySavings: savings,
        cpuUtilization:  parseFloat(current?.UtilizationMetrics?.find(m => m.Key === 'CPU')?.Value || '0'),
        memUtilization:  parseFloat(current?.UtilizationMetrics?.find(m => m.Key === 'MEMORY')?.Value || '0'),
        recommendation: rec.RightsizingType === 'Terminate'
          ? `Terminate ${current?.InstanceId} — consistently < 1% CPU utilization`
          : `Downsize ${current?.InstanceId} from ${current?.InstanceType} to ${rightsize?.InstanceType}`
      })
    }
  } catch (err) {
    console.warn('Rightsizing recommendations failed:', err.message)
  }

  return recommendations
}

async function getReservationCoverage(cfg) {
  const ce = new CostExplorerClient(cfg)
  const results = []

  try {
    const end   = new Date()
    const start = new Date(end)
    start.setMonth(start.getMonth() - 1)

    const { CoveragesByTime = [] } = await ce.send(new GetReservationCoverageCommand({
      TimePeriod: {
        Start: start.toISOString().slice(0, 10),
        End:   end.toISOString().slice(0, 10),
      },
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      Granularity: 'MONTHLY'
    }))

    for (const period of CoveragesByTime) {
      for (const group of period.Groups || []) {
        const service    = group.Attributes?.SERVICE || group.Keys?.[0]
        const coverage   = group.Coverage
        const pct        = parseFloat(coverage?.CoverageHours?.CoverageHoursPercentage || '0')
        const onDemandCost = parseFloat(coverage?.CoverageCost?.OnDemandCost || '0')

        if (onDemandCost > 50) { // only flag services with meaningful spend
          results.push({
            service,
            coveragePercentage: Math.round(pct),
            onDemandCost,
            recommendation: pct < 50
              ? `Only ${Math.round(pct)}% of ${service} usage is covered by RIs. Consider purchasing Reserved Instances.`
              : pct < 70
              ? `${service} RI coverage is ${Math.round(pct)}%. Room to increase coverage for additional savings.`
              : `${service} RI coverage is good at ${Math.round(pct)}%.`
          })
        }
      }
    }
  } catch (err) {
    console.warn('Reservation coverage failed:', err.message)
  }

  return results
}

async function getSavingsPlansCoverage(cfg) {
  const ce = new CostExplorerClient(cfg)
  const results = []

  try {
    const end   = new Date()
    const start = new Date(end)
    start.setMonth(start.getMonth() - 1)

    const { SavingsPlansCoverages = [] } = await ce.send(new GetSavingsPlansCoverageCommand({
      TimePeriod: {
        Start: start.toISOString().slice(0, 10),
        End:   end.toISOString().slice(0, 10),
      },
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      Granularity: 'MONTHLY'
    }))

    for (const coverage of SavingsPlansCoverages) {
      for (const group of coverage.Groups || []) {
        const pct          = parseFloat(group.SavingsPlansCoverage?.CoveragePercentage || '0')
        const onDemandCost = parseFloat(group.SavingsPlansCoverage?.OnDemandCost || '0')
        const service      = group.Attributes?.SERVICE || 'Unknown'

        if (onDemandCost > 50) {
          results.push({
            service,
            coveragePercentage: Math.round(pct),
            onDemandCost,
            recommendation: pct < 50
              ? `Low Savings Plan coverage for ${service} (${Math.round(pct)}%). A Compute Savings Plan could reduce costs by up to 66%.`
              : `${service} Savings Plan coverage is ${Math.round(pct)}%.`
          })
        }
      }
    }
  } catch (err) {
    console.warn('Savings Plans coverage failed:', err.message)
  }

  return results
}
