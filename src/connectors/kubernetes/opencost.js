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
            severity: 'high',
            resource: name,
            monthlySavings: totalCost * 30 / 7,
            detail: `Namespace "${name}" has <5% CPU and RAM utilization — likely idle or abandoned`,
            recommendation: `Scale down or remove workloads in namespace "${name}". If this is a dev/staging environment, consider scheduling it to scale to zero outside business hours.`,
          })
        }

        // Oversized CPU requests: high request, low actual usage
        if (totalCost > 5 && cpuEfficiency < 0.2 && alloc.cpuCoreRequestAverage > 0.5) {
          findings.push({
            type: 'oversized_cpu',
            severity: 'medium',
            resource: name,
            monthlySavings: totalCost * (1 - cpuEfficiency) * 0.5 * 30 / 7,
            detail: `Namespace "${name}" requests ${alloc.cpuCoreRequestAverage.toFixed(1)} CPU cores but uses only ${(cpuEfficiency * 100).toFixed(0)}%`,
            recommendation: `Right-size CPU requests in namespace "${name}". Set requests to 1.5x average usage and limits to 3x. Use VPA (Vertical Pod Autoscaler) for automatic tuning.`,
          })
        }

        // Oversized memory requests
        if (totalCost > 5 && ramEfficiency < 0.25 && alloc.ramByteRequestAverage > 512 * 1024 * 1024) {
          const ramRequestGb = (alloc.ramByteRequestAverage / (1024 ** 3)).toFixed(1)
          const ramUsageGb = ((alloc.ramByteUsageAverage || 0) / (1024 ** 3)).toFixed(1)
          findings.push({
            type: 'oversized_memory',
            severity: 'medium',
            resource: name,
            monthlySavings: (alloc.ramCost || 0) * (1 - ramEfficiency) * 0.5 * 30 / 7,
            detail: `Namespace "${name}" requests ${ramRequestGb} GB RAM but uses only ${ramUsageGb} GB (${(ramEfficiency * 100).toFixed(0)}% utilization)`,
            recommendation: `Reduce memory requests in namespace "${name}". Current usage suggests ${(parseFloat(ramUsageGb) * 1.5).toFixed(1)} GB would be sufficient with headroom.`,
          })
        }

        // Unused PVCs (high PV cost but near-zero other activity)
        if ((alloc.pvCost || 0) > 2 && cpuEfficiency < 0.01 && ramEfficiency < 0.01) {
          findings.push({
            type: 'unused_pvc',
            severity: 'medium',
            resource: name,
            monthlySavings: (alloc.pvCost || 0) * 30 / 7,
            detail: `Namespace "${name}" has $${((alloc.pvCost || 0) * 30 / 7).toFixed(0)}/mo in persistent volume costs but no active workloads`,
            recommendation: `Check for orphaned PersistentVolumeClaims in namespace "${name}". Run: kubectl get pvc -n ${name} — delete any that are no longer needed.`,
          })
        }

        // Off-hours waste: dev/staging/uat namespaces with significant cost
        const isNonProd = /dev|staging|uat|test|sandbox|preview/i.test(name)
        if (isNonProd && totalCost > 10) {
          findings.push({
            type: 'off_hours_waste',
            severity: 'low',
            resource: name,
            monthlySavings: totalCost * 0.6 * 30 / 7, // assume 60% savings from scaling to zero off-hours
            detail: `Non-production namespace "${name}" costs ~$${(totalCost * 30 / 7).toFixed(0)}/mo running 24/7`,
            recommendation: `Schedule namespace "${name}" to scale to zero outside business hours (evenings + weekends). Use KEDA or a CronJob-based scaler. Potential 60% savings.`,
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
        const cpuRequest = alloc.cpuCoreRequestAverage || 0

        // Idle workload: near-zero usage
        if (totalCost > 0.5 && cpuUsage < 0.01 && ramUsage < 1024 * 1024 * 10) {
          findings.push({
            type: 'idle_workload',
            severity: 'medium',
            resource: name,
            monthlySavings: totalCost * 30 / 7,
            detail: `Workload "${name}" has near-zero CPU and <10MB RAM usage over 7 days`,
            recommendation: `Remove or scale to zero: "${name}". If it's a CronJob that ran once, consider reducing its resource requests. Run: kubectl get deploy,sts -A | grep "${name.split('/').pop()}"`,
          })
        }

        // Workload with high replica count but low per-pod usage
        if (cpuRequest > 2 && cpuUsage < 0.3 && totalCost > 3) {
          findings.push({
            type: 'over_replicated',
            severity: 'low',
            resource: name,
            monthlySavings: totalCost * 0.4 * 30 / 7,
            detail: `Workload "${name}" requests ${cpuRequest.toFixed(1)} CPU cores total but uses only ${(cpuUsage * 100 / cpuRequest).toFixed(0)}% — may have too many replicas`,
            recommendation: `Consider reducing replica count or enabling HPA (Horizontal Pod Autoscaler) for "${name}" to scale based on actual load.`,
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
