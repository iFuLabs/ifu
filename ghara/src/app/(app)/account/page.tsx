'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Clock, ToggleLeft, ToggleRight, Save, Loader2, Shield, AlertCircle, User, KeyRound } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type ScanProduct = 'comply' | 'finops' | 'anomaly'

interface ScanConfig { enabled: boolean; hourUtc: number }
interface ScanSettings { comply: ScanConfig; finops: ScanConfig; anomaly: ScanConfig }

const PRODUCT_LABELS: Record<ScanProduct, { label: string; description: string }> = {
  comply:  { label: 'Compliance Scan',    description: 'Automated control checks against AWS and GitHub integrations' },
  finops:  { label: 'Cost Scan',          description: 'Cost optimization, waste detection, and rightsizing recommendations' },
  anomaly: { label: 'Anomaly Detection',  description: 'Spend anomaly detection and budget threshold evaluation' },
}

function formatHourUtc(hour: number): string {
  const h = hour % 24
  if (h === 0) return '12:00 AM UTC'
  if (h < 12) return `${h}:00 AM UTC`
  if (h === 12) return '12:00 PM UTC'
  return `${h - 12}:00 PM UTC`
}

export default function SettingsPage() {
  const { data: settings, error: fetchError, mutate } = useSWR<ScanSettings>('scan-settings', () =>
    fetch(`${API_URL}/api/v1/organizations/scan-settings`, { credentials: 'include' }).then(r => {
      if (!r.ok) throw new Error('Failed to load scan settings')
      return r.json()
    })
  )

  const { data: me } = useSWR('me', () =>
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
  )

  const [draft, setDraft] = useState<ScanSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    if (settings && !draft) setDraft(structuredClone(settings))
  }, [settings, draft])

  useEffect(() => {
    if (me?.user?.name) setProfileName(me.user.name)
  }, [me])

  const isAdmin = me?.user?.role === 'owner' || me?.user?.role === 'admin'
  const readOnly = !isAdmin
  const hasChanges = draft && settings && JSON.stringify(draft) !== JSON.stringify(settings)

  const updateProduct = (product: ScanProduct, field: keyof ScanConfig, value: boolean | number) => {
    if (!draft || readOnly) return
    setDraft(prev => prev ? { ...prev, [product]: { ...prev[product], [field]: value } } : prev)
    setSaved(false)
    setSaveError('')
  }

  const handleSave = async () => {
    if (!draft || readOnly) return
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/scan-settings`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      })
      if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Save failed' })); throw new Error(err.message) }
      const updated = await res.json()
      mutate(updated, false)
      setDraft(structuredClone(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  const handleProfileSave = async () => {
    setProfileSaving(true); setProfileSaved(false)
    try {
      await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() }),
      })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {} finally { setProfileSaving(false) }
  }

  return (
    <div style={{ padding: '32px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#33063D', marginBottom: 24 }}>Settings</h1>

      {/* SSO link */}
      <Link href="/account/sso" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '18px 24px', marginBottom: 20, boxShadow: '0 2px 12px rgba(51,6,61,0.03)', textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KeyRound size={16} style={{ color: '#8A63E6' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#33063D' }}>Single Sign-On (SSO)</div>
            <div style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 2 }}>Configure SAML SSO for your organization</div>
          </div>
        </div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(138,99,230,0.08)', color: '#8A63E6', fontWeight: 500 }}>Scale</span>
      </Link>

      {/* Profile section */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '28px', marginBottom: 20, boxShadow: '0 2px 12px rgba(51,6,61,0.03)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#33063D', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={15} /> Profile
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(51,6,61,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</label>
            <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(51,6,61,0.12)', borderRadius: 8, color: '#33063D', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(51,6,61,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</label>
            <input type="email" value={me?.user?.email || ''} disabled
              style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid rgba(51,6,61,0.08)', borderRadius: 8, color: 'rgba(51,6,61,0.4)', outline: 'none', background: 'rgba(51,6,61,0.02)' }} />
          </div>
        </div>
        <button onClick={handleProfileSave} disabled={profileSaving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#33063D', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: profileSaving ? 0.6 : 1 }}>
          {profileSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {profileSaved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      {/* Scan Schedule */}
      {readOnly && (
        <div style={{ background: 'rgba(138,99,230,0.04)', border: '1px solid rgba(138,99,230,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={14} style={{ color: '#8A63E6' }} />
          <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.6)' }}>Only admins and owners can change scan settings.</p>
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(51,6,61,0.03)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(51,6,61,0.06)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>Scan Schedule</h2>
          <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 4 }}>Configure when each scan type runs. Scans execute daily at the specified hour (UTC).</p>
        </div>

        {(['comply', 'finops', 'anomaly'] as ScanProduct[]).map(product => {
          const config = draft?.[product] || settings?.[product]
          if (!config) return null
          return (
            <div key={product} style={{ padding: '18px 24px', borderBottom: '1px solid rgba(51,6,61,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#33063D' }}>{PRODUCT_LABELS[product].label}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: "'Aeonik Fono', monospace", background: config.enabled ? 'rgba(138,99,230,0.08)' : 'rgba(51,6,61,0.04)', color: config.enabled ? '#8A63E6' : 'rgba(51,6,61,0.4)' }}>
                      {config.enabled ? 'active' : 'paused'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 4 }}>{PRODUCT_LABELS[product].description}</p>
                </div>
                <button onClick={() => updateProduct(product, 'enabled', !config.enabled)} disabled={readOnly} style={{ background: 'none', border: 'none', cursor: readOnly ? 'not-allowed' : 'pointer', opacity: readOnly ? 0.4 : 1 }}>
                  {config.enabled ? <ToggleRight size={26} style={{ color: '#8A63E6' }} /> : <ToggleLeft size={26} style={{ color: 'rgba(51,6,61,0.3)' }} />}
                </button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={13} style={{ color: 'rgba(51,6,61,0.4)' }} />
                <span style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)' }}>Run daily at</span>
                <select value={config.hourUtc} onChange={e => updateProduct(product, 'hourUtc', parseInt(e.target.value))} disabled={readOnly || !config.enabled}
                  style={{ padding: '5px 10px', fontSize: 12, border: '1px solid rgba(51,6,61,0.12)', borderRadius: 6, color: '#33063D', outline: 'none', opacity: (!config.enabled || readOnly) ? 0.4 : 1 }}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHourUtc(h)}</option>)}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {/* Save bar */}
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ fontSize: 12 }}>
            {saveError && <span style={{ color: '#B42318', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {saveError}</span>}
            {saved && <span style={{ color: '#8A63E6' }}>Settings saved</span>}
          </div>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#33063D', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer', opacity: (saving || !hasChanges) ? 0.5 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}

      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
