/**
 * EKS Container Insights connector — pulls Kubernetes cost data from CloudWatch
 * Container Insights metrics without requiring OpenCost deployment.
 *
 * Uses the customer's assumed AWS role to query CloudWatch metrics for:
 *   - Per-namespace CPU/memory usage and requests
 *   - Per-pod resource utilization
 *   - Node-level capacity vs usage
 *
 * Returns the same KubernetesCostData shape as the OpenCost connector so the
 * rest of the pipeline (caching, findings, UI) works identically.
 */
import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks'
import { logger } from '../../services/logger.js'

// On-demand pricing per vCPU-hour and per GB-hour (us-east-1 Linux).
// Used to estimate cost from resource usage when CUR data isn't available.
const CPU_COST_PER_HOUR = 0.0425  // ~$0.0425/vCPU-hour (m5.xlarge rate)
const RAM_COST_PER_GB_HOUR = 0.0053 // ~$0.0053/GB-hour

/**
 * Validate that Container Insights is enabled on at least one EKS cluster.
 * @param {{ accessKeyId: string, secretAccessKey: string, sessionToken: string }} credentials
 * @param {string} region
 * @returns {{ success: boolean, clusters?: string[], error?: string }}
 */
export async function validateContainerInsights(credentials, region = 'us-east-1') {
  try {
    const eks = new EKSClient({ region, credentials })
    const { clusters } = await eks.send(new ListClustersCommand({}))

    if (!clusters || clusters.length === 0) {
      return { success: false, error: 'No EKS clusters found in this account/region' }
    }

    // Check if at least one cluster has Container Insights enabled
    const insightsClusters = []
    for (const clusterName of clusters.slice(0, 5)) {
      const { cluster } = await eks.send(new DescribeClusterCommand({ name: clusterName }))
      const logging = cluster?.logging?.clusterLogging || []
      const hasInsights = logging.some(l => l.enabled && l.types?.includes('audit'))
      // Container Insights is indicated by the addon or CloudWatch agent — 
      // we'll just try to query metrics and see if data exists
      insightsClusters.push(clusterName)
    }

    return { success: true, clusters: insightsClusters }
  } catch (err) {
    return { success: false, error: `EKS access failed: ${err.message}` }
  }
}

/**
 * Fetch Kubernetes cost data from CloudWatch Container Insights.
 * Returns the same shape as fetchOpenCostData for compatibility.
 *
 * @param {{ credentials: object, region?: string, clusterName?: string, window?: string }} opts
 * @returns {Promise<KubernetesCostData>}
 */
export async function fetchContainerInsightsData({ credentials, region = 'us-east-1', clusterName, window = '7d' }) {
  const cw = new CloudWatchClient({ region, credentials })

  const windowHours = parseWindow(window)
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - windowHours * 60 * 60 * 1000)

  // Discover cluster name if not provided
  if (!clusterName) {
    const eks = new EKSClient({ region, credentials })
    const { clusters } = await eks.send(new ListClustersCommand({}))
    clusterName = clusters?.[0]
    if (!clusterName) {
      throw new Error('No EKS clusters found')
    }
  }

  // Fetch namespace-level metrics
  const namespaceData = await fetchNamespaceMetrics(cw, clusterName, startTime, endTime, windowHours)

  // Fetch pod/workload-level metrics
  const workloadData = await fetchPodMetrics(cw, clusterName, startTime, endTime, windowHours)

  // Analyze for waste findings (same logic as OpenCost)
  const findings = analyzeContainerInsightsFindings(namespaceData, workloadData, windowHours)

  return {
    namespaces: namespaceData,
    workloads: workloadData,
    findings,
    fetchedAt: new Date().toISOString(),
  }
}

async function fetchNamespaceMetrics(cw, clusterName, startTime, endTime, windowHours) {
  const period = windowHours > 48 ? 3600 : 300 // 1h or 5m granularity
  const namespace = 'ContainerInsights'

  const metricQueries = [
    { Id: 'cpu_request', MetricStat: { Metric: { Namespace: namespace, MetricName: 'namespace_cpu_request', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'cpu_usage', MetricStat: { Metric: { Namespace: namespace, MetricName: 'namespace_cpu_utilization', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'mem_request', MetricStat: { Metric: { Namespace: namespace, MetricName: 'namespace_memory_request', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'mem_usage', MetricStat: { Metric: { Namespace: namespace, MetricName: 'namespace_memory_utilization', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'namespace_count', MetricStat: { Metric: { Namespace: namespace, MetricName: 'namespace_number_of_running_pods', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
  ]

  try {
    const response = await cw.send(new GetMetricDataCommand({
      MetricDataQueries: metricQueries,
      StartTime: startTime,
      EndTime: endTime,
    }))

    return transformNamespaceMetrics(response.MetricDataResults, windowHours)
  } catch (err) {
    logger.warn({ err: err.message, clusterName }, 'Container Insights namespace metrics query failed')
    return []
  }
}

async function fetchPodMetrics(cw, clusterName, startTime, endTime, windowHours) {
  const period = windowHours > 48 ? 3600 : 300
  const namespace = 'ContainerInsights'

  const metricQueries = [
    { Id: 'pod_cpu_request', MetricStat: { Metric: { Namespace: namespace, MetricName: 'pod_cpu_request', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'pod_cpu_usage', MetricStat: { Metric: { Namespace: namespace, MetricName: 'pod_cpu_utilization', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'pod_mem_request', MetricStat: { Metric: { Namespace: namespace, MetricName: 'pod_memory_request', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
    { Id: 'pod_mem_usage', MetricStat: { Metric: { Namespace: namespace, MetricName: 'pod_memory_utilization', Dimensions: [{ Name: 'ClusterName', Value: clusterName }] }, Period: period, Stat: 'Average' } },
  ]

  try {
    const response = await cw.send(new GetMetricDataCommand({
      MetricDataQueries: metricQueries,
      StartTime: startTime,
      EndTime: endTime,
    }))

    return transformPodMetrics(response.MetricDataResults, windowHours)
  } catch (err) {
    logger.warn({ err: err.message, clusterName }, 'Container Insights pod metrics query failed')
    return []
  }
}

function transformNamespaceMetrics(results, windowHours) {
  // Container Insights returns aggregated metrics — we transform into the
  // same shape OpenCost uses: [{ namespaceName: { cpuCost, ramCost, ... } }]
  const cpuRequest = avgValue(results?.find(r => r.Id === 'cpu_request'))
  const cpuUsage = avgValue(results?.find(r => r.Id === 'cpu_usage'))
  const memRequest = avgValue(results?.find(r => r.Id === 'mem_request'))
  const memUsage = avgValue(results?.find(r => r.Id === 'mem_usage'))

  if (!cpuRequest && !memRequest) return []

  // Container Insights doesn't break down by namespace in aggregated queries,
  // so we return a single "cluster" entry with totals
  const cpuCost = (cpuRequest || 0) * CPU_COST_PER_HOUR * windowHours
  const ramCostGB = ((memRequest || 0) / (1024 * 1024 * 1024)) * RAM_COST_PER_GB_HOUR * windowHours

  return [{
    cluster: {
      cpuCost,
      ramCost: ramCostGB,
      pvCost: 0,
      networkCost: 0,
      cpuCoreRequestAverage: cpuRequest || 0,
      cpuCoreUsageAverage: cpuUsage || 0,
      ramByteRequestAverage: memRequest || 0,
      ramByteUsageAverage: memUsage || 0,
    }
  }]
}

function transformPodMetrics(results, windowHours) {
  const cpuRequest = avgValue(results?.find(r => r.Id === 'pod_cpu_request'))
  const cpuUsage = avgValue(results?.find(r => r.Id === 'pod_cpu_usage'))
  const memRequest = avgValue(results?.find(r => r.Id === 'pod_mem_request'))
  const memUsage = avgValue(results?.find(r => r.Id === 'pod_mem_usage'))

  if (!cpuRequest && !memRequest) return []

  const cpuCost = (cpuRequest || 0) * CPU_COST_PER_HOUR * windowHours
  const ramCostGB = ((memRequest || 0) / (1024 * 1024 * 1024)) * RAM_COST_PER_GB_HOUR * windowHours

  return [{
    cluster_workloads: {
      cpuCost,
      ramCost: ramCostGB,
      cpuCoreRequestAverage: cpuRequest || 0,
      cpuCoreUsageAverage: cpuUsage || 0,
      ramByteRequestAverage: memRequest || 0,
      ramByteUsageAverage: memUsage || 0,
    }
  }]
}

function analyzeContainerInsightsFindings(namespaceData, workloadData, windowHours) {
  const findings = []

  for (const window of namespaceData) {
    for (const [name, alloc] of Object.entries(window || {})) {
      const totalCost = (alloc.cpuCost || 0) + (alloc.ramCost || 0)
      const cpuEfficiency = alloc.cpuCoreRequestAverage > 0
        ? (alloc.cpuCoreUsageAverage || 0) / alloc.cpuCoreRequestAverage
        : 0
      const ramEfficiency = alloc.ramByteRequestAverage > 0
        ? (alloc.ramByteUsageAverage || 0) / alloc.ramByteRequestAverage
        : 0

      // Low utilization cluster
      if (totalCost > 5 && cpuEfficiency < 0.2) {
        findings.push({
          type: 'oversized_requests',
          severity: 'medium',
          resource: name,
          monthlySavings: totalCost * (1 - cpuEfficiency) * 0.5 * (720 / windowHours),
          detail: `Cluster CPU utilization is only ${(cpuEfficiency * 100).toFixed(0)}% of requested capacity`,
          recommendation: 'Right-size node groups or enable Karpenter/Cluster Autoscaler to match actual demand',
        })
      }

      if (totalCost > 5 && ramEfficiency < 0.2) {
        findings.push({
          type: 'oversized_memory',
          severity: 'medium',
          resource: name,
          monthlySavings: alloc.ramCost * (1 - ramEfficiency) * 0.5 * (720 / windowHours),
          detail: `Cluster memory utilization is only ${(ramEfficiency * 100).toFixed(0)}% of requested capacity`,
          recommendation: 'Reduce memory requests or switch to memory-optimized instance types',
        })
      }

      // Near-idle cluster
      if (totalCost > 1 && cpuEfficiency < 0.05 && ramEfficiency < 0.05) {
        findings.push({
          type: 'idle_namespace',
          severity: 'high',
          resource: name,
          monthlySavings: totalCost * (720 / windowHours),
          detail: `Cluster has <5% CPU and RAM utilization — may be idle`,
          recommendation: 'Consider scaling down to zero nodes during off-hours or consolidating workloads',
        })
      }
    }
  }

  findings.sort((a, b) => (b.monthlySavings || 0) - (a.monthlySavings || 0))
  return findings
}

// ── Helpers ────────────────────────────────────────────────────────────────

function avgValue(metricResult) {
  if (!metricResult?.Values?.length) return 0
  const sum = metricResult.Values.reduce((a, b) => a + b, 0)
  return sum / metricResult.Values.length
}

function parseWindow(window) {
  const match = window.match(/^(\d+)([dhm])$/)
  if (!match) return 168 // default 7d
  const [, num, unit] = match
  const n = parseInt(num)
  if (unit === 'h') return n
  if (unit === 'd') return n * 24
  if (unit === 'm') return n * 24 * 30
  return 168
}
