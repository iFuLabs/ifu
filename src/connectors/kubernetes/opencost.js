/**
 * OpenCost connector — pulls cost allocation data from a customer's OpenCost endpoint.
 *
 * OpenCost exposes a Prometheus-compatible API. The primary endpoint we use:
 *   GET /allocation/compute?window=7d&aggregate=namespace
 *   GET /allocation/compute?window=7d&aggregate=controller
 *
 * Returns: cost per namespace, cost per workload, idle pods, oversized requests,
 * unused PVCs, idle nodes.
 */
import { logger } from '../../services/logger.js'

/**
 * Validate an OpenCost endpoint is reachable and returns data.
 * @param {string} endpointUrl - Base URL of the OpenCost API (e.g. http://opencost.monitoring:9003)
 * @param {string|null} bearerToken - Optional bearer token for auth
 * @returns {{ success: boolean, error?: string, version?: string }}
 */
export async function validateOpenCostEndpoint(endpointUrl, bearerToken) {
  try {
    const url = new URL('/allocation/compute', endpointUrl)
    url.searchParams.set('window', '1h')
    url.searchParams.set('aggregate', 'namespace')

    const headers = { 'Accept': 'application/json' }
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10000) })

    if (!res.ok) {
      return { success: false, error: `OpenCost returned HTTP ${res.status}: ${await res.text().catch(() => '')}` }
    }

    const data = await res.json()
    if (!data || (!data.data && !Array.isArray(data))) {
      return { success: false, error: 'Unexpected response format from OpenCost' }
    }

    return { success: true, version: res.headers.get('x-opencost-version') || 'unknown' }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return { success: false, error: 'Connection timed out — ensure the endpoint is reachable from our servers' }
    }
    return { success: false, error: err.message }
  }
}

/**
 * Pull cost allocation data from OpenCost.
 * @param {{ endpointUrl: string, bearerToken?: string, window?: string }} opts
 * @returns {Promise<KubernetesCostData>}
 */
export async function fetchOpenCostData({ endpointUrl, bearerToken, window = '7d' }) {
  const headers = { 'Accept': 'application/json' }
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

  // Fetch namespace-level allocation
  const namespaceData = await _fetchAllocation(endpointUrl, headers, window, 'namespace')
  // Fetch workload-level allocation
  const workloadData = await _fetchAllocation(endpointUrl, headers, window, 'controller')

  // Analyze for waste
  const findings = analyzeKubernetesFindings(namespaceData, workloadData)

  return {
    namespaces: namespaceData,
    workloads: workloadData,
    findings,
    fetchedAt: new Date().toISOString(),
  }
}

async function _fetchAllocation(endpointUrl, headers, window, aggregate) {
  const url = new URL('/allocation/compute', endpointUrl)
  url.searchParams.set('window', window)
  url.searchParams.set('aggregate', aggregate)
  url.searchParams.set('accumulate', 'true')

  const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(30000) })
  if (!res.ok) {
    throw new Error(`OpenCost ${aggregate} query failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  // OpenCost returns { code: 200, data: [ { ... } ] }
  return json.data || json
}

/**
 * Analyze OpenCost data for waste findings.
 */
function analyzeKubernetesFindings(namespaceData, workloadData) {
  const findings = []

  // Process namespace data
  if (Array.isArray(namespaceData)) {
    for (const window of namespaceData) {
      for (const [name, alloc] of Object.entries(window || {})) {
        if (name === '__idle__' || name === '__unallocated__') continue

        const totalCost = (alloc.cpuCost || 0) + (alloc.ramCost || 0) + (alloc.pvCost || 0) + (alloc.networkCost || 0)
        const cpuEfficiency = alloc.cpuCoreRequestAverage > 0
          ? (alloc.cpuCoreUsageAverage || 0) / alloc.cpuCoreRequestAverage
          : 0
        const ramEfficiency = alloc.ramByteRequestAverage > 0
          ? (alloc.ramByteUsageAverage || 0) / alloc.ramByteRequestAverage
          : 0

        // Idle namespace: very low CPU and RAM usage
        if (totalCost > 1 && cpuEfficiency < 0.05 && ramEfficiency < 0.05) {
          findings.push({
            type: 'idle_namespace',
            severity: 'medium',
            resource: name,
            monthlySavings: totalCost * 30 / 7, // extrapolate from 7d window
            detail: `Namespace "${name}" has <5% CPU and RAM utilization`,
            recommendation: `Consider scaling down or removing workloads in namespace "${name}"`,
          })
        }

        // Oversized requests: high request, low actual usage
        if (totalCost > 5 && cpuEfficiency < 0.2 && alloc.cpuCoreRequestAverage > 0.5) {
          findings.push({
            type: 'oversized_requests',
            severity: 'medium',
            resource: name,
            monthlySavings: totalCost * (1 - cpuEfficiency) * 0.5 * 30 / 7,
            detail: `Namespace "${name}" requests ${alloc.cpuCoreRequestAverage.toFixed(1)} CPU cores but uses only ${(cpuEfficiency * 100).toFixed(0)}%`,
            recommendation: `Right-size CPU requests in namespace "${name}" to match actual usage`,
          })
        }
      }
    }
  }

  // Process workload data for idle workloads
  if (Array.isArray(workloadData)) {
    for (const window of workloadData) {
      for (const [name, alloc] of Object.entries(window || {})) {
        if (name === '__idle__' || name === '__unallocated__') continue

        const totalCost = (alloc.cpuCost || 0) + (alloc.ramCost || 0)
        const cpuUsage = alloc.cpuCoreUsageAverage || 0
        const ramUsage = alloc.ramByteUsageAverage || 0

        // Idle workload: near-zero usage
        if (totalCost > 0.5 && cpuUsage < 0.01 && ramUsage < 1024 * 1024 * 10) {
          findings.push({
            type: 'idle_workload',
            severity: 'low',
            resource: name,
            monthlySavings: totalCost * 30 / 7,
            detail: `Workload "${name}" has near-zero CPU and <10MB RAM usage`,
            recommendation: `Consider removing or scaling to zero: "${name}"`,
          })
        }
      }
    }
  }

  // Sort by savings potential
  findings.sort((a, b) => (b.monthlySavings || 0) - (a.monthlySavings || 0))

  return findings
}

/**
 * @typedef {Object} KubernetesCostData
 * @property {Array} namespaces - Namespace-level cost allocation
 * @property {Array} workloads - Workload-level cost allocation
 * @property {Array} findings - Waste findings
 * @property {string} fetchedAt - ISO timestamp
 */
