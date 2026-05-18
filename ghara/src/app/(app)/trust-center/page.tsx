'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Globe, Lock, Users, CheckCircle, ExternalLink, Copy, Check, Upload, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ghara.ifulabs.com'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const GREEN = '#067647'

const FRAMEWORK_LABELS: Record<string, string> = {
  soc2: 'SOC 2 Type II', iso27001: 'ISO 27001', gdpr: 'GDPR', hipaa: 'HIPAA', pci_dss: 'PCI DSS 4.0',
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...opts })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 12, transition: '0.2s', background: checked ? PLUM : 'rgba(51,6,61,0.15)' }} />
      <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </label>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{children}</label>
      {hint && <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.4)', marginTop: 3 }}>{hint}</p>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '9px 12px',
  border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8,
  fontSize: 13, color: PLUM, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', background: '#fff',
}

const divider = <div style={{ height: 1, background: 'rgba(51,6,61,0.06)', margin: '24px 0' }} />

export default function TrustCenterAdminPage() {
  const { data: settings, mutate } = useSWR('/api/v1/trust-center', () => apiFetch('/api/v1/trust-center'))
  const { data: requestsData, mutate: mutateRequests } = useSWR('/api/v1/trust-center/requests', () => apiFetch('/api/v1/trust-center/requests'))

  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'requests'>('settings')

  const currentForm = form ?? settings ?? {
    enabled: false, slug: '', headline: '', description: '', logoUrl: '',
    ndaRequired: false, ndaDocumentUrl: '', publishedFrameworks: [], publishedArtifacts: []
  }

  const publicUrl = currentForm.slug ? `${PORTAL_URL}/trust/${currentForm.slug}` : null
  const isDirty = form !== null
  const requests = requestsData?.requests || []
  const pendingCount = requests.filter((r: any) => r.status === 'pending').length

  async function save() {
    setSaving(true)
    try {
      const updated = await apiFetch('/api/v1/trust-center', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentForm)
      })
      mutate(updated, false)
      setForm(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleRequest(id: string, status: 'approved' | 'denied') {
    await apiFetch(`/api/v1/trust-center/requests/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(138,99,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={20} style={{ color: IRIS }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: PLUM, margin: 0 }}>Trust Center</h1>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)', marginTop: 2 }}>Share your compliance posture with prospects</p>
            </div>
          </div>
          {/* Live status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(51,6,61,0.1)', background: currentForm.enabled ? 'rgba(6,118,71,0.06)' : 'rgba(51,6,61,0.04)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: currentForm.enabled ? GREEN : 'rgba(51,6,61,0.25)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: currentForm.enabled ? GREEN : 'rgba(51,6,61,0.4)' }}>{currentForm.enabled ? 'Live' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(51,6,61,0.08)' }}>
        {(['settings', 'requests'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: 'transparent', borderBottom: activeTab === tab ? `2px solid ${PLUM}` : '2px solid transparent',
            color: activeTab === tab ? PLUM : 'rgba(51,6,61,0.45)', marginBottom: -1, transition: 'color 0.15s',
          }}>
            {tab === 'settings' ? 'Settings' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Access Requests
                {pendingCount > 0 && <span style={{ background: IRIS, color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>{pendingCount}</span>}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <>
          {/* Single consolidated settings card */}
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(51,6,61,0.04)' }}>

            {/* Section: Visibility */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: PLUM, margin: 0 }}>Enable Trust Center</p>
                  <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 3 }}>Make your compliance page publicly accessible at the URL below</p>
                </div>
                <Toggle checked={currentForm.enabled} onChange={v => setForm({ ...currentForm, enabled: v })} />
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(51,6,61,0.06)' }} />

            {/* Section: Public URL */}
            <div style={{ padding: '24px 28px' }}>
              <FieldLabel hint="Share this link with prospects. Only lowercase letters, numbers, and hyphens.">Public URL</FieldLabel>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <span style={{ padding: '9px 12px', fontSize: 12, color: 'rgba(51,6,61,0.35)', background: '#FAFAFA', borderRight: '1px solid rgba(51,6,61,0.1)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {PORTAL_URL}/trust/
                  </span>
                  <input value={currentForm.slug || ''} onChange={e => setForm({ ...currentForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="your-company" style={{ flex: 1, padding: '9px 12px', border: 'none', fontSize: 13, color: PLUM, outline: 'none', fontFamily: 'inherit', background: 'transparent' }} />
                </div>
                {publicUrl && (
                  <>
                    <button onClick={copyUrl} title="Copy link" style={{ padding: '9px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: copied ? GREEN : PLUM, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    <a href={publicUrl} target="_blank" rel="noreferrer" title="Preview" style={{ padding: '9px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: PLUM, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      <ExternalLink size={13} /> Preview
                    </a>
                  </>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(51,6,61,0.06)' }} />

            {/* Section: Branding */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: PLUM, margin: 0 }}>Branding</p>

              <div>
                <FieldLabel hint="Upload your company logo. Shown in the header of your public Trust Center page.">Company Logo</FieldLabel>
                <LogoUpload
                  currentUrl={currentForm.logoUrl || ''}
                  onUploaded={(url: string) => setForm({ ...currentForm, logoUrl: url })}
                  apiUrl={API_URL}
                />
              </div>

              <div>
                <FieldLabel>Headline</FieldLabel>
                <input value={currentForm.headline || ''} onChange={e => setForm({ ...currentForm, headline: e.target.value })}
                  placeholder="Acme Security & Compliance" style={inputStyle} />
              </div>

              <div>
                <FieldLabel hint="Shown below the headline on your public page.">Description</FieldLabel>
                <textarea value={currentForm.description || ''} onChange={e => setForm({ ...currentForm, description: e.target.value })}
                  placeholder="We take security seriously. Here's an overview of our compliance posture..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(51,6,61,0.06)' }} />

            {/* Section: Frameworks */}
            <div style={{ padding: '24px 28px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: PLUM, margin: '0 0 4px' }}>Published Frameworks</p>
              <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginBottom: 16 }}>Only aggregate pass/fail scores are shown — no raw evidence or resource details.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(FRAMEWORK_LABELS).map(([fw, label]) => {
                  const active = (currentForm.publishedFrameworks || []).includes(fw)
                  return (
                    <button key={fw} onClick={() => toggleFramework(fw)} style={{
                      padding: '8px 16px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${active ? PLUM : 'rgba(51,6,61,0.15)'}`,
                      background: active ? PLUM : '#fff', color: active ? '#fff' : PLUM,
                      fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {active && <CheckCircle size={12} />}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(51,6,61,0.06)' }} />

            {/* Section: Access control */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(138,99,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Lock size={15} style={{ color: IRIS }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: PLUM, margin: 0 }}>Require Access Request</p>
                    <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 3 }}>Visitors must submit a request before viewing your compliance data. You approve or deny from the Access Requests tab.</p>
                  </div>
                </div>
                <Toggle checked={currentForm.ndaRequired} onChange={v => setForm({ ...currentForm, ndaRequired: v })} />
              </div>
              {currentForm.ndaRequired && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(51,6,61,0.06)' }}>
                  <FieldLabel hint="Optional — link to a PDF NDA that visitors must acknowledge before requesting access.">NDA Document URL</FieldLabel>
                  <input value={currentForm.ndaDocumentUrl || ''} onChange={e => setForm({ ...currentForm, ndaDocumentUrl: e.target.value })}
                    placeholder="https://yourcompany.com/nda.pdf" style={inputStyle} />
                </div>
              )}
            </div>
          </div>

          {/* Sticky save bar */}
          <div style={{ position: 'sticky', bottom: 0, marginTop: 16, padding: '14px 0', background: 'linear-gradient(to top, #FAFAFA 70%, transparent)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {isDirty && !saving && (
              <button onClick={() => setForm(null)} style={{ padding: '10px 20px', background: 'transparent', color: 'rgba(51,6,61,0.5)', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Discard
              </button>
            )}
            <button onClick={save} disabled={saving} style={{
              padding: '10px 28px', background: saved ? GREEN : PLUM, color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, padding: '64px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(51,6,61,0.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(51,6,61,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={22} style={{ color: 'rgba(51,6,61,0.3)' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>No access requests yet</p>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.45)', marginTop: 6 }}>When someone requests access to your Trust Center, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(51,6,61,0.04)' }}>
              {requests.map((req: any, i: number) => (
                <div key={req.id} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderTop: i > 0 ? '1px solid rgba(51,6,61,0.06)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(138,99,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: IRIS }}>
                    {req.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: PLUM, margin: 0 }}>{req.name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 2 }}>{req.email}{req.company ? ` · ${req.company}` : ''}</p>
                    {req.message && <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.4)', marginTop: 4, fontStyle: 'italic' }}>"{req.message}"</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(51,6,61,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleRequest(req.id, 'approved')} style={{ padding: '7px 16px', background: PLUM, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleRequest(req.id, 'denied')} style={{ padding: '7px 14px', background: 'transparent', color: '#B42318', border: '1px solid rgba(180,35,24,0.25)', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Deny</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0, background: req.status === 'approved' ? 'rgba(6,118,71,0.08)' : 'rgba(180,35,24,0.08)', color: req.status === 'approved' ? GREEN : '#B42318' }}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
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

// ── Logo Upload component ──────────────────────────────────────────────────
function LogoUpload({ currentUrl, onUploaded, apiUrl }: { currentUrl: string; onUploaded: (url: string) => void; apiUrl: string }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PNG, JPG, SVG, or WebP file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB.')
      return
    }

    setError('')
    setUploading(true)
    try {
      // Get presigned URL from API
      const res = await fetch(`${apiUrl}/api/v1/trust-center/logo`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Fallback: if S3 not configured, use object URL for preview only
        if (res.status === 501) {
          setError('Logo upload requires S3 to be configured. Ask your admin to set TRUST_CENTER_ASSETS_BUCKET.')
          return
        }
        throw new Error(err.message || 'Upload failed')
      }

      const { uploadUrl, publicUrl } = await res.json()

      // Upload directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      onUploaded(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Current logo preview or placeholder */}
        <div style={{ width: 64, height: 64, borderRadius: 10, border: '1px solid rgba(51,6,61,0.12)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {currentUrl
            ? <img src={currentUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <div style={{ fontSize: 22, color: 'rgba(51,6,61,0.2)' }}>🏢</div>
          }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: uploading ? 'rgba(51,6,61,0.06)' : '#fff', border: '1px solid rgba(51,6,61,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: PLUM, cursor: uploading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : currentUrl ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.4)', margin: 0 }}>PNG, JPG, SVG or WebP · max 2 MB</p>
        </div>

        {currentUrl && (
          <button onClick={() => onUploaded('')} title="Remove logo" style={{ padding: 6, background: 'transparent', border: '1px solid rgba(51,6,61,0.12)', borderRadius: 6, cursor: 'pointer', color: 'rgba(51,6,61,0.4)', display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: '#B42318', marginTop: 8 }}>{error}</p>}
    </div>
  )
}
