import { getAccessToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // For Auth0 flow, try to get token for Authorization header
  let token = null
  try {
    token = await getAccessToken()
  } catch (err) {
    // No Auth0 token — httpOnly cookie will be sent automatically
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // Send httpOnly auth cookie
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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
    onboard: (body: { name?: string; email?: string; password?: string; orgName: string; orgDomain?: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/onboard', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  },

  integrations: {
    list: () => apiFetch<Integration[]>('/api/v1/integrations'),
    getAwsSetupInfo: () => apiFetch<AwsSetupInfo>('/api/v1/integrations/aws/setup-info'),
    connectAws: (body: { roleArn: string; externalId: string }) =>
      apiFetch<Integration>('/api/v1/integrations/aws', { method: 'POST', body: JSON.stringify(body) }),
  },
}

export interface AwsSetupInfo {
  accountId: string
  externalIdPrefix: string
  instructions: string[]
}

export interface AuthResponse {
  token: string
  user: User
  organization: Organization
  lastProduct?: 'comply' | 'finops'
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
  plan: 'starter' | 'growth' | 'enterprise' | 'finops'
}

export interface Integration {
  id: string
  type: 'aws' | 'github'
  status: 'connected' | 'disconnected' | 'error'
  metadata?: { accountId?: string; alias?: string }
  lastSyncAt?: string
}
