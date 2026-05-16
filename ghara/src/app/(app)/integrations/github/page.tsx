'use client'
import { useState, useEffect } from 'react'
import { Github, CheckCircle, ExternalLink, AlertCircle, Lock } from 'lucide-react'
import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const GITHUB_APP_URL = 'https://github.com/apps/ifu-labs'

export default function GithubIntegrationPage() {
  const [integration, setIntegration] = useState<any>(null)
  const [installationId, setInstallationId] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const { data: me } = useSWR('me', () =>
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
  )
  const isAdmin = me?.user?.role === 'owner' || me?.user?.role === 'admin'

  useEffect(() => {
    fetch(`${API_URL}/api/v1/integrations`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const gh = data.find((i: any) => i.type === 'github' && i.status === 'connected')
        if (gh) setIntegration(gh)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Check if returning from GitHub App install with installation_id in URL
    const params = new URLSearchParams(window.location.search)
    const id = params.get('installation_id')
    if (id) {
      setInstallationId(id)
      handleConnect(id)
    }
  }, [])

  const handleConnect = async (id?: string) => {
    const idToUse = id || installationId
    if (!idToUse) {
      setError('Please enter the GitHub App installation ID')
      return
    }

    setConnecting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/integrations/github`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installationId: parseInt(idToUse) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to connect')
      }
      const data = await res.json()
      setIntegration(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return null

  if (!isAdmin && !integration) {
    return (
      <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#33063D', marginBottom: 8 }}>GitHub Integration</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9F9F9', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'rgba(51,6,61,0.6)' }}>
          <Lock size={14} style={{ flexShrink: 0 }} />
          Only admins and owners can connect or manage integrations.
        </div>
      </div>
    )
  }

  if (integration) {
    return (
      <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#33063D', marginBottom: 8 }}>GitHub Integration</h1>
        <div style={{
          background: '#FFFFFF', border: '1px solid rgba(6,118,71,0.15)',
          borderRadius: 14, padding: '28px', marginTop: 20,
          boxShadow: '0 4px 16px rgba(51,6,61,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(6,118,71,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} style={{ color: '#067647' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#33063D' }}>Connected</p>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.6)', marginTop: 2 }}>
                {integration.metadata?.orgLogin ? `Organization: ${integration.metadata.orgLogin}` : 'GitHub App installed'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)', marginTop: 16 }}>
            Ghara checks branch protection, secret scanning, and CODEOWNERS for compliance evidence.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#33063D', marginBottom: 8 }}>Connect GitHub</h1>
      <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.6)', marginBottom: 24 }}>
        Install the iFU Labs GitHub App to collect compliance evidence from your repositories — branch protection, secret scanning, and CODEOWNERS.
      </p>

      {/* Step 1: Install the app */}
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)',
        borderRadius: 14, padding: '28px', marginBottom: 16,
        boxShadow: '0 4px 16px rgba(51,6,61,0.03)',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#33063D', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Github size={16} />
          Step 1: Install the GitHub App
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.6)', marginBottom: 16 }}>
          Click below to install the iFU Labs GitHub App on your organization. Select which repositories to grant access to.
        </p>
        <a
          href={GITHUB_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', background: '#24292f', color: '#fff',
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            textDecoration: 'none', transition: 'background 0.2s',
          }}
        >
          <Github size={16} /> Install GitHub App <ExternalLink size={14} />
        </a>
      </div>

      {/* Step 2: Paste installation ID */}
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)',
        borderRadius: 14, padding: '28px',
        boxShadow: '0 4px 16px rgba(51,6,61,0.03)',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#33063D', marginBottom: 12 }}>
          Step 2: Enter Installation ID
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.6)', marginBottom: 16 }}>
          After installing, you'll be redirected back here automatically. If not, find the installation ID in your GitHub App settings URL.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#B42318' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={installationId}
            onChange={e => setInstallationId(e.target.value)}
            placeholder="e.g. 12345678"
            style={{
              flex: 1, padding: '12px 14px', fontSize: 14,
              border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8,
              color: '#33063D', outline: 'none', fontFamily: "'Aeonik Fono', monospace",
            }}
          />
          <button
            onClick={() => handleConnect()}
            disabled={connecting || !installationId}
            style={{
              padding: '12px 20px', background: '#33063D', color: '#fff',
              borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none',
              cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.6 : 1,
            }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
