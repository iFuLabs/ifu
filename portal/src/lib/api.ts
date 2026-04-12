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

export const api = {
  auth: {
    me: () => apiFetch<Me>('/api/v1/auth/me'),
    onboard: (body: { orgName: string; orgDomain?: string }) =>
      apiFetch<Me>('/api/v1/auth/onboard', { method: 'POST', body: JSON.stringify(body) }),
  },

  integrations: {
    list: () => apiFetch<Integration[]>('/api/v1/integrations'),
    connectAws: (body: { roleArn: string; externalId: string }) =>
      apiFetch<Integration>('/api/v1/integrations/aws', { method: 'POST', body: JSON.stringify(body) }),
  },
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
  plan: 'starter' | 'growth' | 'enterprise'
}

export interface Integration {
  id: string
  type: 'aws' | 'github'
  status: 'connected' | 'disconnected' | 'error'
  metadata?: { accountId?: string; alias?: string }
  lastSyncAt?: string
}
