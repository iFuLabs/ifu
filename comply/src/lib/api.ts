import { getAccessToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Auth is handled via httpOnly cookie sent automatically
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

// Helper to get auth headers for direct fetch calls
export function getAuthHeaders() {
  return {
    'Content-Type': 'application/json'
  }
}

// API methods
export const api = {
  controls: {
    score: () => apiFetch<any>('/api/v1/controls/score'),
    list: (params?: { framework?: string; status?: string }) => {
      const query = new URLSearchParams()
      if (params?.framework) query.append('framework', params.framework)
      if (params?.status) query.append('status', params.status)
      const queryString = query.toString()
      return apiFetch<any[]>(`/api/v1/controls${queryString ? `?${queryString}` : ''}`)
    },
    get: (id: string) => apiFetch<any>(`/api/v1/controls/${id}`),
    updateNotes: (id: string, notes: string) => apiFetch<any>(`/api/v1/controls/${id}/notes`, { 
      method: 'PUT', 
      body: JSON.stringify({ notes }) 
    }),
  },
  scans: {
    list: () => apiFetch<any[]>('/api/v1/scans'),
  },
  plan: {
    features: () => apiFetch<any>('/api/v1/plan/features'),
  },
  integrations: {
    list: () => apiFetch<any[]>('/api/v1/integrations'),
    sync: (id: string) => apiFetch<any>(`/api/v1/integrations/${id}/sync`, { 
      method: 'POST',
      body: JSON.stringify({}) // Send empty JSON object instead of no body
    }),
    disconnect: (id: string) => apiFetch<any>(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
    connectAws: (body: { roleArn: string; externalId: string }) => 
      apiFetch<any>('/api/v1/integrations/aws', { method: 'POST', body: JSON.stringify(body) }),
    connectGithub: (body: { installationId: number }) => 
      apiFetch<any>('/api/v1/integrations/github', { method: 'POST', body: JSON.stringify(body) }),
  },
}

