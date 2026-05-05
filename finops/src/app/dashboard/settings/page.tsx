'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Clock, ToggleLeft, ToggleRight, Save, Loader2, Shield, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Only the FinOps-relevant products are exposed here. Compliance scan timing is
// managed in the Comply app (same backend endpoint, different audience). Backend
// at GET/PATCH /api/v1/organizations/scan-settings returns all three products;
// we read the full payload, edit only finops + anomaly, and round-trip the rest
// untouched on save.
type ScanProduct = 'comply' | 'finops' | 'anomaly'
type FinopsProduct = 'finops' | 'anomaly'

interface ScanConfig {
  enabled: boolean
  hourUtc: number
}

type ScanSettings = Record<ScanProduct, ScanConfig>

const PRODUCT_LABELS: Record<FinopsProduct, { label: string; description: string }> = {
  finops:  { label: 'FinOps Scan',       description: 'Cost optimisation, waste detection, and rightsizing recommendations across your AWS account' },
  anomaly: { label: 'Anomaly Detection', description: 'Spend-anomaly detection and budget-threshold evaluation' },
}

function formatHourUtc(hour: number): string {
  const h = hour % 24
  if (h === 0) return '12:00 AM UTC'
  if (h < 12) return `${h}:00 AM UTC`
  if (h === 12) return '12:00 PM UTC'
  return `${h - 12}:00 PM UTC`
}

export default function SettingsPage() {
  const { data: settings, error: fetchError, mutate } = useSWR<ScanSettings>('/api/v1/organizations/scan-settings', () =>
    fetch(`${API_URL}/api/v1/organizations/scan-settings`, { credentials: 'include' }).then(r => {
      if (!r.ok) throw new Error('Failed to load scan settings')
      return r.json()
    })
  )

  const { data: me } = useSWR('/api/v1/auth/me', () =>
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
  )

  const [draft, setDraft] = useState<ScanSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings && !draft) {
      setDraft(structuredClone(settings))
    }
  }, [settings, draft])

  const isAdmin = me?.user?.role === 'owner' || me?.user?.role === 'admin'
  const readOnly = !isAdmin

  const hasChanges = draft && settings && JSON.stringify(draft) !== JSON.stringify(settings)

  const updateProduct = (product: FinopsProduct, field: keyof ScanConfig, value: boolean | number) => {
    if (!draft || readOnly) return
    setDraft(prev => prev ? {
      ...prev,
      [product]: { ...prev[product], [field]: value }
    } : prev)
    setSaved(false)
    setSaveError('')
  }

  const handleSave = async () => {
    if (!draft || readOnly) return
    setSaving(true)
    setSaveError('')
    setSaved(false)

    try {
      // Send only the FinOps-controlled products so we never overwrite Comply's
      // schedule from the FinOps app, even if our local draft drifted.
      const payload = { finops: draft.finops, anomaly: draft.anomaly }
      const res = await fetch(`${API_URL}/api/v1/organizations/scan-settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Save failed' }))
        throw new Error(err.message || `HTTP ${res.status}`)
      }

      const updated = await res.json()
      mutate(updated, false)
      setDraft(structuredClone(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (fetchError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink">Failed to load settings</p>
            <p className="text-xs text-muted mt-1">{fetchError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage when FinOps and anomaly scans run for your organisation</p>
      </div>

      {readOnly && (
        <div className="bg-accent-light/40 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
          <Shield size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted">
            You have read-only access. Only admins and owners can change scan settings.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-ink">Scan Schedule</h2>
          <p className="text-xs text-muted mt-1">
            Scans run daily at the hour you choose (UTC). Compliance-scan timing is managed in the iFu Comply app.
          </p>
        </div>

        <div className="divide-y divide-border">
          {(['finops', 'anomaly'] as FinopsProduct[]).map(product => {
            const config = draft?.[product] || settings?.[product]
            if (!config) return null

            return (
              <div key={product} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {PRODUCT_LABELS[product].label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        config.enabled
                          ? 'bg-accent-light text-accent'
                          : 'bg-border text-muted'
                      }`}>
                        {config.enabled ? 'active' : 'paused'}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {PRODUCT_LABELS[product].description}
                    </p>
                  </div>

                  <button
                    onClick={() => updateProduct(product, 'enabled', !config.enabled)}
                    disabled={readOnly}
                    className="flex-shrink-0 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`${config.enabled ? 'Disable' : 'Enable'} ${PRODUCT_LABELS[product].label}`}
                  >
                    {config.enabled ? (
                      <ToggleRight size={28} className="text-accent" />
                    ) : (
                      <ToggleLeft size={28} className="text-muted" />
                    )}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Clock size={14} className="text-muted flex-shrink-0" />
                  <label htmlFor={`hour-${product}`} className="text-xs text-muted flex-shrink-0">
                    Run daily at
                  </label>
                  <select
                    id={`hour-${product}`}
                    value={config.hourUtc}
                    onChange={e => updateProduct(product, 'hourUtc', parseInt(e.target.value, 10))}
                    disabled={readOnly || !config.enabled}
                    className="px-2 py-1 bg-bg border border-border rounded text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatHourUtc(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="text-xs">
            {saveError && (
              <span className="text-danger flex items-center gap-1">
                <AlertCircle size={12} />
                {saveError}
              </span>
            )}
            {saved && (
              <span className="text-accent">Settings saved</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
