import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  GetReservationCoverageCommand,
  GetSavingsPlansCoverageCommand,
  GetRightsizingRecommendationCommand,
} from '@aws-sdk/client-cost-explorer'

import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeAddressesCommand,
  DescribeNatGatewaysCommand,
  DescribeSnapshotsCommand,
} from '@aws-sdk/client-ec2'

import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeTargetHealthCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2'

import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommand as DescribeClassicLoadBalancersCommand,
  DescribeInstanceHealthCommand,
} from '@aws-sdk/client-elastic-load-balancing'

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch'

import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds'

import { getEBSPricing, getSnapshotPricing, getNATGatewayPricing, getLoadBalancerPricing, getRDSPricing } from '../../services/aws-pricing.js'

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
  // Sort waste by ROI (savings × confidence score)
  findings.waste = findings.waste
    .map(w => ({
      ...w,
      roi: w.estimatedMonthlySavings * (w.severity === 'high' ? 1.0 : w.severity === 'medium' ? 0.8 : 0.6)
    }))
    .sort((a, b) => b.roi - a.roi)

  // Sort rightsizing by savings (already high confidence from AWS)
  findings.rightsizing = findings.rightsizing.sort((a, b) => 
    b.estimatedMonthlySavings - a.estimatedMonthlySavings
  )

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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // ── Unattached EBS volumes ───────────────────────────────────
  try {
    const { Volumes = [] } = await ec2.send(new DescribeVolumesCommand({
      Filters: [{ Name: 'status', Values: ['available'] }]
    }))

    // Batch fetch all unique volume type prices upfront
    const volumeTypes = [...new Set(Volumes.map(v => v.VolumeType || 'gp2'))]
    const priceMap = Object.fromEntries(
      await Promise.all(volumeTypes.map(async type => [type, await getEBSPricing(region, type)]))
    )

    for (const vol of Volumes) {

      const sizeGb = vol.Size || 0
      const volumeType = vol.VolumeType || 'gp2'
      const pricePerGb = priceMap[volumeType]
      const estimatedMonthlySavings = sizeGb * pricePerGb
      const ageInDays = vol.CreateTime 
        ? Math.floor((Date.now() - new Date(vol.CreateTime).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      waste.push({
        type:        'unattached_ebs',
        resourceId:  vol.VolumeId,
        resourceType: 'EBS Volume',
        description: `Unattached ${volumeType} volume (${sizeGb} GB) — not attached for ${ageInDays} days`,
        estimatedMonthlySavings,
        recommendation: `Delete or snapshot this volume. Run: aws ec2 delete-volume --volume-id ${vol.VolumeId}`,
        severity: estimatedMonthlySavings > 20 ? 'high' : 'medium',
        metadata: { sizeGb, volumeType, createTime: vol.CreateTime, ageInDays, pricePerGb }
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
        description: `Unassociated Elastic IP ${addr.PublicIp} — charged $3.60/month when not attached`,
        estimatedMonthlySavings: 3.60,
        recommendation: `Release this Elastic IP. Run: aws ec2 release-address --allocation-id ${addr.AllocationId}`,
        severity: 'low',
        metadata: { publicIp: addr.PublicIp }
      })
    }
  } catch (err) {
    console.warn('EIP waste check failed:', err.message)
  }

  // ── Stopped EC2 instances (> 30 days) ────────────────────────
  try {
    const { Reservations = [] } = await ec2.send(new DescribeInstancesCommand({
      Filters: [{ Name: 'instance-state-name', Values: ['stopped'] }]
    }))

    // Collect all instances and their volume IDs first
    const stoppedInstances = []
    const allVolumeIds = []
    
    for (const reservation of Reservations) {
      for (const instance of reservation.Instances || []) {
        const stateTransitionTime = instance.StateTransitionReason?.match(/\((\d{4}-\d{2}-\d{2})/)?.[1]
        const stoppedDate = stateTransitionTime ? new Date(stateTransitionTime) : null

        // Skip if stopped less than 30 days ago or can't determine date
        if (!stoppedDate || stoppedDate > thirtyDaysAgo) continue

        const volumeIds = instance.BlockDeviceMappings
          ?.map(bdm => bdm.Ebs?.VolumeId)
          .filter(Boolean) || []
        
        stoppedInstances.push({ instance, stoppedDate, volumeIds })
        allVolumeIds.push(...volumeIds)
      }
    }

    // Batch fetch all volumes in one call
    let volumeMap = {}
    if (allVolumeIds.length > 0) {
      try {
        const { Volumes = [] } = await ec2.send(new DescribeVolumesCommand({
          VolumeIds: allVolumeIds
        }))
        volumeMap = Object.fromEntries(Volumes.map(v => [v.VolumeId, v]))
      } catch {
        // If batch fetch fails, we'll use fallback estimates
      }
    }

    // Batch fetch unique volume type prices
    const volumeTypes = [...new Set(Object.values(volumeMap).map(v => v.VolumeType || 'gp2'))]
    const priceMap = volumeTypes.length > 0 
      ? Object.fromEntries(await Promise.all(volumeTypes.map(async type => [type, await getEBSPricing(region, type)])))
      : { gp2: await getEBSPricing(region, 'gp2') }

    // Now process each stopped instance
    for (const { instance, stoppedDate, volumeIds } of stoppedInstances) {
      const daysStoppedFor = Math.floor((Date.now() - stoppedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let totalStorageGb = 0
      let totalStorageCost = 0
      
      if (volumeIds.length > 0 && Object.keys(volumeMap).length > 0) {
        // Use actual volume data
        for (const volumeId of volumeIds) {
          const vol = volumeMap[volumeId]
          if (vol) {
            const sizeGb = vol.Size || 0
            const volumeType = vol.VolumeType || 'gp2'
            const pricePerGb = priceMap[volumeType] || priceMap.gp2
            totalStorageGb += sizeGb
            totalStorageCost += sizeGb * pricePerGb
          }
        }
      } else {
        // Fallback to estimate
        totalStorageGb = volumeIds.length > 0 ? volumeIds.length * 30 : 30
        totalStorageCost = totalStorageGb * priceMap.gp2
      }

      waste.push({
        type:        'stopped_ec2',
        resourceId:  instance.InstanceId,
        resourceType: 'EC2 Instance',
        description: `${instance.InstanceType} instance stopped for ${daysStoppedFor} days — still paying $${totalStorageCost.toFixed(2)}/mo for ${totalStorageGb} GB EBS storage`,
        estimatedMonthlySavings: totalStorageCost,
        recommendation: `Terminate this instance if no longer needed, or create an AMI and terminate to save storage costs. Run: aws ec2 terminate-instances --instance-ids ${instance.InstanceId}`,
        severity: daysStoppedFor > 90 ? 'high' : 'medium',
        metadata: { 
          instanceType: instance.InstanceType, 
          stoppedDate: stoppedDate.toISOString(),
          daysStoppedFor,
          storageGb: totalStorageGb,
          volumeCount: volumeIds.length
        }
      })
    }
  } catch (err) {
    console.warn('Stopped EC2 check failed:', err.message)
  }

  // ── Idle NAT Gateways (< 1GB traffic AND < 100 connections last 7 days) ───
  try {
    const { NatGateways = [] } = await ec2.send(new DescribeNatGatewaysCommand({
      Filter: [{ Name: 'state', Values: ['available'] }]
    }))

    const natGatewayPrice = await getNATGatewayPricing(region)

    for (const nat of NatGateways) {
      // Skip recently created NAT Gateways
      if (nat.CreateTime && new Date(nat.CreateTime) > sevenDaysAgo) continue

      try {
        // Check both traffic AND active connections
        const [trafficData, connectionsData] = await Promise.all([
          cw.send(new GetMetricStatisticsCommand({
            Namespace:  'AWS/NATGateway',
            MetricName: 'BytesOutToDestination',
            Dimensions: [{ Name: 'NatGatewayId', Value: nat.NatGatewayId }],
            StartTime:  sevenDaysAgo,
            EndTime:    new Date(),
            Period:     604800, // 7 days in seconds
            Statistics: ['Sum']
          })),
          cw.send(new GetMetricStatisticsCommand({
            Namespace:  'AWS/NATGateway',
            MetricName: 'ActiveConnectionCount',
            Dimensions: [{ Name: 'NatGatewayId', Value: nat.NatGatewayId }],
            StartTime:  sevenDaysAgo,
            EndTime:    new Date(),
            Period:     604800,
            Statistics: ['Maximum']
          }))
        ])

        const totalBytes = trafficData.Datapoints?.reduce((sum, d) => sum + (d.Sum || 0), 0) || 0
        const totalGB = totalBytes / (1024 ** 3)
        const maxConnections = Math.max(...(connectionsData.Datapoints?.map(d => d.Maximum || 0) || [0]), 0)

        // Flag if BOTH traffic is low AND connections are low
        if (totalGB < 1 && maxConnections < 100) {
          waste.push({
            type:        'idle_nat_gateway',
            resourceId:  nat.NatGatewayId,
            resourceType: 'NAT Gateway',
            description: `NAT Gateway processed only ${totalGB.toFixed(2)} GB with ${Math.round(maxConnections)} max connections in 7 days — likely idle`,
            estimatedMonthlySavings: natGatewayPrice,
            recommendation: 'Review if this NAT Gateway is still needed. Consider sharing one NAT Gateway across AZs for non-production workloads.',
            severity: 'high',
            metadata: { 
              subnetId: nat.SubnetId, 
              trafficGbLast7Days: totalGB.toFixed(3),
              maxConnectionsLast7Days: Math.round(maxConnections),
              createTime: nat.CreateTime
            }
          })
        }
      } catch { /* CloudWatch permission may be missing */ }
    }
  } catch (err) {
    console.warn('NAT Gateway waste check failed:', err.message)
  }

  // ── Idle RDS instances (low connections AND low CPU last 7 days) ─────────
  try {
    const { DBInstances = [] } = await rds.send(new DescribeDBInstancesCommand({}))

    for (const db of DBInstances.filter(d => d.DBInstanceStatus === 'available')) {
      // Skip recently created instances
      if (db.InstanceCreateTime && new Date(db.InstanceCreateTime) > sevenDaysAgo) continue

      try {
        // Check BOTH connections AND CPU utilization
        const [connectionsData, cpuData] = await Promise.all([
          cw.send(new GetMetricStatisticsCommand({
            Namespace:  'AWS/RDS',
            MetricName: 'DatabaseConnections',
            Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier }],
            StartTime:  sevenDaysAgo,
            EndTime:    new Date(),
            Period:     604800,
            Statistics: ['Maximum']
          })),
          cw.send(new GetMetricStatisticsCommand({
            Namespace:  'AWS/RDS',
            MetricName: 'CPUUtilization',
            Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier }],
            StartTime:  sevenDaysAgo,
            EndTime:    new Date(),
            Period:     604800,
            Statistics: ['Average']
          }))
        ])

        const maxConnections = Math.max(...(connectionsData.Datapoints?.map(d => d.Maximum || 0) || [0]), 0)
        const avgCpu = cpuData.Datapoints?.reduce((sum, d) => sum + (d.Average || 0), 0) / (cpuData.Datapoints?.length || 1) || 0

        // Flag if BOTH connections are zero AND CPU is very low (< 5%)
        if (maxConnections === 0 && avgCpu < 5) {
          // Get accurate RDS pricing
          const estimatedMonthlySavings = await getRDSPricing(region, db.DBInstanceClass, db.Engine)

          const ageInDays = db.InstanceCreateTime
            ? Math.floor((Date.now() - new Date(db.InstanceCreateTime).getTime()) / (1000 * 60 * 60 * 24))
            : 0

          waste.push({
            type:        'idle_rds',
            resourceId:  db.DBInstanceIdentifier,
            resourceType: 'RDS Instance',
            description: `RDS instance ${db.DBInstanceIdentifier} (${db.DBInstanceClass}) had zero connections and ${avgCpu.toFixed(1)}% avg CPU in 7 days`,
            estimatedMonthlySavings,
            recommendation: 'Stop or delete this RDS instance if not needed. Use RDS Serverless v2 for infrequently accessed databases.',
            severity: 'high',
            metadata: {
              instanceClass: db.DBInstanceClass,
              engine: db.Engine,
              multiAz: db.MultiAZ,
              maxConnectionsLast7Days: maxConnections,
              avgCpuLast7Days: avgCpu.toFixed(2),
              ageInDays,
              createTime: db.InstanceCreateTime
            }
          })
        }
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('RDS idle check failed:', err.message)
  }

  // ── Unused Application/Network Load Balancers ────────────────────────────
  try {
    const elbv2 = new ElasticLoadBalancingV2Client(cfg)
    const { LoadBalancers = [] } = await elbv2.send(new DescribeLoadBalancersCommand({}))

    for (const lb of LoadBalancers) {
      // Skip recently created load balancers
      if (lb.CreatedTime && new Date(lb.CreatedTime) > sevenDaysAgo) continue

      try {
        // Get target groups for this load balancer
        const { TargetGroups = [] } = await elbv2.send(new DescribeTargetGroupsCommand({
          LoadBalancerArn: lb.LoadBalancerArn
        }))

        let hasHealthyTargets = false
        for (const tg of TargetGroups) {
          const { TargetHealthDescriptions = [] } = await elbv2.send(new DescribeTargetHealthCommand({
            TargetGroupArn: tg.TargetGroupArn
          }))
          if (TargetHealthDescriptions.some(t => t.TargetHealth?.State === 'healthy')) {
            hasHealthyTargets = true
            break
          }
        }

        // Flag if no target groups OR no healthy targets
        if (TargetGroups.length === 0 || !hasHealthyTargets) {
          const lbType = lb.Type === 'application' ? 'ALB' : lb.Type === 'network' ? 'NLB' : 'Load Balancer'
          const estimatedMonthlySavings = await getLoadBalancerPricing(region, lb.Type)

          waste.push({
            type:        'unused_load_balancer',
            resourceId:  lb.LoadBalancerName,
            resourceType: lbType,
            description: `${lbType} has ${TargetGroups.length === 0 ? 'no target groups' : 'no healthy targets'} — not serving traffic`,
            estimatedMonthlySavings,
            recommendation: `Delete this load balancer if no longer needed. Run: aws elbv2 delete-load-balancer --load-balancer-arn ${lb.LoadBalancerArn}`,
            severity: 'medium',
            metadata: {
              loadBalancerArn: lb.LoadBalancerArn,
              type: lb.Type,
              scheme: lb.Scheme,
              targetGroupCount: TargetGroups.length,
              createdTime: lb.CreatedTime
            }
          })
        }
      } catch { /* skip */ }
    }
  } catch (err) {
    console.warn('Load Balancer waste check failed:', err.message)
  }

  // ── Unused Classic Load Balancers ─────────────────────────────────────────
  try {
    const elb = new ElasticLoadBalancingClient(cfg)
    const { LoadBalancerDescriptions = [] } = await elb.send(new DescribeClassicLoadBalancersCommand({}))

    const classicLbPrice = await getLoadBalancerPricing(region, 'classic')

    for (const lb of LoadBalancerDescriptions) {
      // Skip recently created Classic LBs (they do have CreatedTime)
      if (lb.CreatedTime && new Date(lb.CreatedTime) > sevenDaysAgo) continue

      // Check if it has no instances or no healthy instances
      if (!lb.Instances || lb.Instances.length === 0) {
        try {
          const { InstanceStates = [] } = await elb.send(new DescribeInstanceHealthCommand({
            LoadBalancerName: lb.LoadBalancerName
          }))

          const hasHealthyInstances = InstanceStates.some(i => i.State === 'InService')

          if (!hasHealthyInstances) {
            waste.push({
              type:        'unused_classic_lb',
              resourceId:  lb.LoadBalancerName,
              resourceType: 'Classic Load Balancer',
              description: `Classic Load Balancer has no healthy instances — not serving traffic`,
              estimatedMonthlySavings: classicLbPrice,
              recommendation: `Delete this Classic Load Balancer. Consider migrating to ALB/NLB. Run: aws elb delete-load-balancer --load-balancer-name ${lb.LoadBalancerName}`,
              severity: 'medium',
              metadata: {
                scheme: lb.Scheme,
                instanceCount: lb.Instances?.length || 0,
                createdTime: lb.CreatedTime
              }
            })
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    console.warn('Classic Load Balancer waste check failed:', err.message)
  }

  // ── Old EBS Snapshots (> 90 days, not part of AWS Backup) ────────────────
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const snapshotPrice = await getSnapshotPricing(region)
    
    const { Snapshots = [] } = await ec2.send(new DescribeSnapshotsCommand({
      OwnerIds: ['self']
    }))

    for (const snapshot of Snapshots) {
      // Skip recent snapshots
      if (!snapshot.StartTime || new Date(snapshot.StartTime) > ninetyDaysAgo) continue

      // Skip if part of AWS Backup (has aws:backup:source-resource tag)
      const isBackupSnapshot = snapshot.Tags?.some(t => t.Key?.startsWith('aws:backup'))
      if (isBackupSnapshot) continue

      const ageInDays = Math.floor((Date.now() - new Date(snapshot.StartTime).getTime()) / (1000 * 60 * 60 * 24))
      const sizeGb = snapshot.VolumeSize || 0
      const estimatedMonthlySavings = sizeGb * snapshotPrice

      // Only flag if savings > $2/month (avoid noise from tiny snapshots)
      if (estimatedMonthlySavings > 2) {
        waste.push({
          type:        'old_snapshot',
          resourceId:  snapshot.SnapshotId,
          resourceType: 'EBS Snapshot',
          description: `EBS snapshot (${sizeGb} GB) is ${ageInDays} days old — review if still needed`,
          estimatedMonthlySavings,
          recommendation: `Delete this snapshot if no longer needed for recovery. Run: aws ec2 delete-snapshot --snapshot-id ${snapshot.SnapshotId}`,
          severity: estimatedMonthlySavings > 10 ? 'medium' : 'low',
          metadata: {
            sizeGb,
            ageInDays,
            startTime: snapshot.StartTime,
            description: snapshot.Description,
            volumeId: snapshot.VolumeId,
            pricePerGb: snapshotPrice
          }
        })
      }
    }
  } catch (err) {
    console.warn('Snapshot waste check failed:', err.message)
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
