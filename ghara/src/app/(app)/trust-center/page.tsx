'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Shield, Globe, Lock, Users, CheckCircle, XCircle, Clock, ExternalLink, Copy, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ghara.ifulabs.com'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const GREEN = '#067647'

const FRAMEWORK_LABELS: Record<string, string> = {
  soc2: 'SOC 2 Type II',
  iso27001: 'ISO 27001',
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  pci_dss: 'PCI DSS 4.0',
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...opts })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function TrustCenterAdminPage() {
  const { data: settings, mutate } = useSWR('/api/v1/trust-center', () => apiFetch('/api/v1/trust-center'))
  const { data: requestsData, mutate: mutateRequests } = useSWR('/api/v1/trust-center/requests', () => apiFetch('/api/v1/trust-center/requests'))

  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'requests'>('settings')

  // Initialise form from settings once loaded
  const currentForm = form ?? settings ?? {
    enabled: false, slug: '', headline: '', description: '',
    ndaRequired: false, publishedFrameworks: [], publishedArtifacts: []
  }

  const publicUrl = currentForm.slug ? `${PORTAL_URL}/trust/${currentForm.slug}` : null

  async function save() {
    setSaving(true)
    try {
      const updated = await apiFetch('/api/v1/trust-center', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentForm)
      })
      mutate(updated, false)
      setForm(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRequest(id: string, status: 'approved' | 'denied') {
    await apiFetch(`/api/v1/trust-center/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    mutateRequests()
  }

  function toggleFramework(fw: string) {
    const current: string[] = currentForm.publishedFrameworks || []
    const next = current.includes(fw) ? current.filter((f: string) => f !== fw) : [...current, fw]
    setForm({ ...currentForm, publishedFrameworks: next })
  }

  function copyUrl() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requests = requestsData?.requests || []
  const pendingCount = requests.filter((r: any) => r.status === 'pending').length

  return (
    <div style={{ padding: '32px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(138,99,230,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={18} style={{ color: IRIS }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 400, color: PLUM, fontFamily: "'PP Fragment', serif" }}>Trust Center</h1>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.55)', marginLeft: 48 }}>
          Share your compliance posture publicly. Prospects can request access and view your certifications.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(51,6,61,0.08)', paddingBottom: 0 }}>
        {(['settings', 'requests'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: 'transparent', borderBottom: activeTab === tab ? `2px solid ${PLUM}` : '2px solid transparent',
            color: activeTab === tab ? PLUM : 'rgba(51,6,61,0.45)', marginBottom: -1, transition: 'all 0.15s'
          }}>
            {tab === 'settings' ? 'Settings' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Access Requests
                {pendingCount > 0 && (
                  <span style={{ background: IRIS, color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 600 }}>{pendingCount}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Enable toggle */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>Enable Trust Center</p>
              <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 2 }}>Make your compliance page publicly accessible</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={currentForm.enabled} onChange={e => setForm({ ...currentForm, enabled: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 12, transition: '0.2s',
                background: currentForm.enabled ? PLUM : 'rgba(51,6,61,0.15)'
              }} />
              <span style={{
                position: 'absolute', top: 3, left: currentForm.enabled ? 23 : 3, width: 18, height: 18,
                borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </label>
          </div>

          {/* Slug + public URL */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '20px 24px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Public URL slug
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(51,6,61,0.4)', whiteSpace: 'nowrap' }}>{PORTAL_URL}/trust/</span>
              <input
                value={currentForm.slug || ''}
                onChange={e => setForm({ ...currentForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="your-company"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none' }}
              />
              {publicUrl && (
                <button onClick={copyUrl} style={{ padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PLUM }}>
                  {copied ? <Check size={13} style={{ color: GREEN }} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PLUM, textDecoration: 'none' }}>
                  <ExternalLink size={13} /> Preview
                </a>
              )}
            </div>
          </div>

          {/* Headline + description */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headline</label>
              <input
                value={currentForm.headline || ''}
                onChange={e => setForm({ ...currentForm, headline: e.target.value })}
                placeholder="Acme Security & Compliance"
                style={{ display: 'block', width: '100%', marginTop: 8, padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
              <textarea
                value={currentForm.description || ''}
                onChange={e => setForm({ ...currentForm, description: e.target.value })}
                placeholder="We take security seriously. Here's an overview of our compliance posture..."
                rows={3}
                style={{ display: 'block', width: '100%', marginTop: 8, padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Published frameworks */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '20px 24px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Published Frameworks</p>
            <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.45)', marginBottom: 16 }}>Select which frameworks to show on your public Trust Center. Only aggregate pass/fail scores are shown — no raw evidence.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(FRAMEWORK_LABELS).map(([fw, label]) => {
                const active = (currentForm.publishedFrameworks || []).includes(fw)
                return (
                  <button key={fw} onClick={() => toggleFramework(fw)} style={{
                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${active ? PLUM : 'rgba(51,6,61,0.15)'}`,
                    background: active ? PLUM : 'transparent', color: active ? '#fff' : PLUM,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {active && <CheckCircle size={13} />}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* NDA gate */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={16} style={{ color: IRIS }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>Require NDA / Access Request</p>
                  <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 2 }}>Visitors must request access before viewing compliance details</p>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={currentForm.ndaRequired} onChange={e => setForm({ ...currentForm, ndaRequired: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', inset: 0, borderRadius: 12, transition: '0.2s', background: currentForm.ndaRequired ? PLUM : 'rgba(51,6,61,0.15)' }} />
                <span style={{ position: 'absolute', top: 3, left: currentForm.ndaRequired ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </label>
            </div>
            {currentForm.ndaRequired && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NDA Document URL (optional)</label>
                <input
                  value={currentForm.ndaDocumentUrl || ''}
                  onChange={e => setForm({ ...currentForm, ndaDocumentUrl: e.target.value })}
                  placeholder="https://... (PDF link)"
                  style={{ display: 'block', width: '100%', marginTop: 8, padding: '8px 12px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={save} disabled={saving} style={{
              padding: '10px 24px', background: PLUM, color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
            }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(51,6,61,0.4)' }}>
              <Users size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>No access requests yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>When someone requests access to your Trust Center, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map((req: any) => (
                <div key={req.id} style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <StatusDot status={req.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: PLUM }}>{req.name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)' }}>{req.email}{req.company ? ` · ${req.company}` : ''}</p>
                    {req.message && <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.45)', marginTop: 4, fontStyle: 'italic' }}>"{req.message}"</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(51,6,61,0.35)', whiteSpace: 'nowrap' }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleRequest(req.id, 'approved')} style={{ padding: '6px 14px', background: PLUM, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button onClick={() => handleRequest(req.id, 'denied')} style={{ padding: '6px 14px', background: 'transparent', color: '#B42318', border: '1px solid rgba(180,35,24,0.3)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Deny
                      </button>
                    </div>
                  )}
                  {req.status !== 'pending' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: req.status === 'approved' ? 'rgba(6,118,71,0.08)' : 'rgba(180,35,24,0.08)', color: req.status === 'approved' ? GREEN : '#B42318' }}>
                      {req.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: '#E8B547', approved: '#067647', denied: '#B42318' }
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] || '#ccc', flexShrink: 0 }} />
}
