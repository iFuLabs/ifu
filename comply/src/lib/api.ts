const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // Send httpOnly auth cookie
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    me: () => apiFetch<Me>('/api/v1/auth/me'),
    onboard: (body: { orgName: string; orgDomain?: string }) =>
      apiFetch<Me>('/api/v1/auth/onboard', { method: 'POST', body: JSON.stringify(body) }),
  },

  controls: {
    list: (params?: { framework?: string; status?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      return apiFetch<Control[]>(`/api/v1/controls${qs ? `?${qs}` : ''}`)
    },
    score: () => apiFetch<ComplianceScore>('/api/v1/controls/score'),
    get: (controlId: string) => apiFetch<Control>(`/api/v1/controls/${controlId}`),
    updateNotes: (controlId: string, notes: string) =>
      apiFetch(`/api/v1/controls/${controlId}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  },

  integrations: {
    list: () => apiFetch<Integration[]>('/api/v1/integrations'),
    connectAws: (body: { roleArn: string; externalId: string }) =>
      apiFetch<Integration>('/api/v1/integrations/aws', { method: 'POST', body: JSON.stringify(body) }),
    connectGithub: (body: { installationId: number }) =>
      apiFetch<Integration>('/api/v1/integrations/github', { method: 'POST', body: JSON.stringify(body) }),
    disconnect: (id: string) =>
      apiFetch(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
    sync: (id: string) =>
      apiFetch(`/api/v1/integrations/${id}/sync`, { method: 'POST' }),
  },

  scans: {
    list: () => apiFetch<Scan[]>('/api/v1/scans'),
    get: (id: string) => apiFetch<Scan>(`/api/v1/scans/${id}`),
  },

  organizations: {
    current: () => apiFetch<Organization>('/api/v1/organizations/current'),
    members: () => apiFetch<User[]>('/api/v1/organizations/members'),
  },

  plan: {
    features: () => apiFetch<PlanFeatures>('/api/v1/plan/features'),
    check: (feature: string) => apiFetch<{ available: boolean; plan: string; requiredPlan: string | null }>(`/api/v1/plan/check/${feature}`),
  },
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface Me {
  authenticated: boolean
  onboarded: boolean
  user?: User
  organization?: Organization
}

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: 'owner' | 'admin' | 'member'
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'growth' | 'enterprise'
  trialEndsAt?: string
}

export interface PlanFeatures {
  plan: 'starter' | 'growth' | 'finops'
  features: {
    frameworks: string[]
    aiFeatures: boolean
    maxTeamMembers: number | null
    regulatoryAlerts: boolean
  }
  usage: {
    currentMembers: number
    maxMembers: number | null
  }
  limits: {
    teamMembersReached: boolean
  }
}

export interface Control {
  id: string
  controlId: string
  framework: 'soc2' | 'iso27001' | 'gdpr' | 'hipaa' | 'pci_dss'
  category: string
  title: string
  description: string
  guidance?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  automatable: boolean
  status: 'pass' | 'fail' | 'review' | 'pending' | 'not_applicable'
  lastChecked?: string
  evidence?: Record<string, unknown>
  notes?: string
}

export interface ComplianceScore {
  overall: number
  frameworks: Record<string, FrameworkScore>
  lastUpdated: string
}

export interface FrameworkScore {
  total: number
  pass: number
  fail: number
  review: number
  pending: number
  score: number
}

export interface Integration {
  id: string
  type: 'aws' | 'github' | 'okta' | 'google_workspace'
  status: 'connected' | 'disconnected' | 'error'
  metadata?: { 
    accountId?: string
    alias?: string
    orgLogin?: string
    repoSelection?: string
  }
  lastSyncAt?: string
  lastError?: string
}

export interface Scan {
  id: string
  integrationType: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  totalControls: number
  passCount: number
  failCount: number
  reviewCount: number
  triggeredBy: string
  startedAt?: string
  completedAt?: string
  error?: string
  createdAt: string
}
