'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Integration {
  id: string
  type: string
  product?: string
  status: string
  lastError: string | null
  lastErrorAt: string | null
  lastSyncAt: string | null
}

/**
 * Top-of-dashboard banner that surfaces a failing integration. Customers
 * whose AWS role permissions are revoked or rotated would otherwise see
 * stale dashboards with no explanation. Polls /api/v1/integrations once on
 * mount and shows the most recent error if any active integration is in
 * 'error' state.
 */
export default function IntegrationHealthBanner() {
  const [errored, setErrored] = useState<Integration | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('integration-health-dismissed') === '1') {
      setDismissed(true)
    }
    fetch(`${API_URL}/api/v1/integrations`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((rows: Integration[]) => {
        const broken = (rows || [])
          .filter(r => r.status === 'error' && r.lastError)
          .sort((a, b) => new Date(b.lastErrorAt || 0).getTime() - new Date(a.lastErrorAt || 0).getTime())
        setErrored(broken[0] || null)
      })
      .catch(() => {})
  }, [])

  if (dismissed || !errored) return null

  const typeLabel = errored.type === 'aws' ? 'AWS' : errored.type.toUpperCase()
  const truncatedError = (errored.lastError || '').length > 200
    ? errored.lastError!.slice(0, 200) + '…'
    : errored.lastError

  const dismiss = () => {
    sessionStorage.setItem('integration-health-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 text-sm border-b"
      style={{ background: '#FEF3F2', borderColor: '#FDA29B', color: '#B42318' }}
      role="alert"
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div>
          <strong>Your last {typeLabel} scan failed.</strong>{' '}
          This usually means the IAM role's permissions or trust policy changed. Until it's fixed your dashboards will show stale data.
        </div>
        {truncatedError && (
          <div className="mt-1 font-mono text-xs opacity-80 break-words">
            {truncatedError}
          </div>
        )}
      </div>
      <Link
        href="/dashboard/integrations"
        className="px-3 py-1 rounded text-xs font-medium flex-shrink-0"
        style={{ background: '#B42318', color: '#FFFFFF' }}
      >
        Reconnect
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}
