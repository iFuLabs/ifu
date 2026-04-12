const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// ── FinOps API ─────────────────────────────────────────────────────────────
export const api = {
  finops: {
    getFindings: (refresh = false) => 
      apiFetch<FinOpsFindings>(`/api/v1/finops${refresh ? '?refresh=true' : ''}`),
    getSummary: () => 
      apiFetch<FinOpsSummary>('/api/v1/finops/summary'),
  },
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface FinOpsFindings {
  monthlyCost: number
  forecastedCost: number
  totalMonthlySavings: number
  waste: WasteItem[]
  rightsizing: RightsizingItem[]
  reservations: CoverageItem[]
  savingsPlans: CoverageItem[]
  topServices: ServiceCost[]
  summary: FinOpsSummary
  cached?: boolean
}

export interface FinOpsSummary {
  wasteItems: number
  rightsizingItems: number
  totalMonthlySavings: number
  totalAnnualSavings: number
  coverageGaps: number
  checkedAt: string
  available?: boolean
  message?: string
}

export interface WasteItem {
  type: string
  resourceId: string
  resourceType: string
  description: string
  estimatedMonthlySavings: number
  recommendation: string
  severity: 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
}

export interface RightsizingItem {
  resourceId: string
  currentType: string
  targetType: string | null
  action: 'downsize' | 'terminate'
  estimatedMonthlySavings: number
  cpuUtilization: number
  memUtilization: number
  recommendation: string
}

export interface CoverageItem {
  service: string
  coveragePercentage: number
  onDemandCost: number
  recommendation: string
}

export interface ServiceCost {
  service: string
  cost: number
  unit: string
}
