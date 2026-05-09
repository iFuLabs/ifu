const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
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

export const api = {
  auth: {
    me: () => apiFetch<Me>('/api/v1/auth/me'),
    login: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    signup: (body: { name: string; email: string; password: string; orgName: string; orgDomain?: string; role?: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/onboard', { method: 'POST', body: JSON.stringify(body) }),
    forgotPassword: (body: { email: string }) =>
      apiFetch<{ message: string }>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (body: { token: string; password: string }) =>
      apiFetch<{ message: string }>('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  },

  billing: {
    status: () => apiFetch<BillingStatus>('/api/v1/billing'),
    initialize: (body: { plan: string }) =>
      apiFetch<{ authorizationUrl: string; reference: string }>('/api/v1/billing/initialize', { method: 'POST', body: JSON.stringify(body) }),
    verify: (reference: string) => apiFetch<any>(`/api/v1/billing/verify?reference=${reference}`),
    cancel: () => apiFetch<{ status: string }>('/api/v1/billing/cancel', { method: 'POST' }),
  },

  integrations: {
    list: () => apiFetch<Integration[]>('/api/v1/integrations'),
    getAwsSetupInfo: () => apiFetch<AwsSetupInfo>('/api/v1/integrations/aws/setup-info'),
    connectAws: (body: { roleArn: string; externalId: string; product?: string }) =>
      apiFetch<Integration>('/api/v1/integrations/aws', { method: 'POST', body: JSON.stringify(body) }),
    disconnect: (id: string) =>
      apiFetch<void>(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
  },

  team: {
    list: () => apiFetch<TeamMember[]>('/api/v1/team'),
    invite: (body: { email: string; role: string }) =>
      apiFetch<any>('/api/v1/team/invite', { method: 'POST', body: JSON.stringify(body) }),
    remove: (userId: string) =>
      apiFetch<void>(`/api/v1/team/${userId}`, { method: 'DELETE' }),
  },

  scans: {
    list: () => apiFetch<Scan[]>('/api/v1/scans'),
    trigger: () => apiFetch<Scan>('/api/v1/scans', { method: 'POST' }),
  },

  finops: {
    get: (params?: { startDate?: string; endDate?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
      return apiFetch<any>(`/api/v1/finops${qs}`)
    },
    export: (format: 'csv' | 'json') => apiFetch<any>(`/api/v1/finops/export?format=${format}`),
  },

  controls: {
    list: () => apiFetch<any[]>('/api/v1/controls'),
    score: () => apiFetch<any>('/api/v1/controls/score'),
  },

  slack: {
    get: () => apiFetch<any>('/api/v1/slack'),
    channels: () => apiFetch<any[]>('/api/v1/slack/channels'),
    setChannel: (channelId: string) =>
      apiFetch<any>('/api/v1/slack', { method: 'PATCH', body: JSON.stringify({ channelId }) }),
  },
}

// Types
export interface AuthResponse {
  token: string
  user: User
  organization: Organization
}

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
  role: 'owner' | 'admin' | 'member'
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
}

export interface BillingStatus {
  plan: string
  product: string | null
  status: 'active' | 'trialing' | 'expired'
  trialEndsAt: string | null
  trialDaysLeft: number
  hasPaymentMethod: boolean
  subscription: any | null
}

export interface Integration {
  id: string
  type: 'aws' | 'github' | 'okta' | 'google_workspace'
  product: string
  status: 'connected' | 'disconnected' | 'error'
  metadata?: any
  lastSyncAt?: string
}

export interface AwsSetupInfo {
  accountId: string
  externalIdPrefix: string
  instructions: string[]
}

export interface TeamMember {
  id: string
  email: string
  name?: string
  role: 'owner' | 'admin' | 'member'
}

export interface Scan {
  id: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  totalControls: number
  passCount: number
  failCount: number
  createdAt: string
  completedAt?: string
}
