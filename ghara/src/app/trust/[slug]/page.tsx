'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const GREEN = '#067647'
const GREY = '#F4F4F4'

const FRAMEWORK_META: Record<string, { label: string; short: string; color: string }> = {
  soc2:     { label: 'SOC 2 Type II',  short: 'SOC 2',    color: '#8A63E6' },
  iso27001: { label: 'ISO 27001',      short: 'ISO 27001', color: '#33063D' },
  gdpr:     { label: 'GDPR',           short: 'GDPR',      color: '#067647' },
  hipaa:    { label: 'HIPAA',          short: 'HIPAA',     color: '#B54708' },
  pci_dss:  { label: 'PCI DSS 4.0',   short: 'PCI DSS',   color: '#B42318' },
}

type TrustData = {
  slug: string; orgName: string; headline?: string; description?: string
  logoUrl?: string; ndaRequired: boolean; accessGranted: boolean
  publishedFrameworks?: string[]
  complianceSummary?: Array<{ framework: string; score: number | null; pass: number; fail: number; review: number; total: number }>
  publishedArtifacts?: Array<{ title: string; url: string; type: string; publishedAt: string }>
}

export default function PublicTrustCenterPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const token = searchParams?.get('token') || ''

  const [data, setData] = useState<TrustData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')

  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/v1/trust-center/${slug}${token ? `?token=${token}` : ''}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData).catch(() => setError(true)).finally(() => setLoading(false))
  }, [slug, token])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('submitting')
    try {
      await fetch(`${API_URL}/api/v1/trust-center/${slug}/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setSubmitState('done')
    } catch { setSubmitState('idle') }
  }

  if (loading) return <LoadingScreen />
  if (error || !data) return <NotFoundScreen />

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: PLUM }}>
      <Header data={data} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        {data.ndaRequired && !data.accessGranted ? (
          <AccessGate data={data} showForm={showForm} setShowForm={setShowForm}
            form={form} setForm={setForm} submitState={submitState} onSubmit={submitRequest} />
        ) : (
          <AccessGranted data={data} />
        )}
      </main>
      <Footer />
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ data }: { data: TrustData }) {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid rgba(51,6,61,0.08)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.orgName} style={{ height: 32, objectFit: 'contain' }} />
            : <div style={{ width: 32, height: 32, borderRadius: 8, background: PLUM, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{data.orgName?.[0]?.toUpperCase()}</div>
          }
          <span style={{ fontSize: 15, fontWeight: 600, color: PLUM }}>{data.orgName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(51,6,61,0.4)' }}>
          <span>Verified by</span>
          <img src="https://www.ifulabs.com/logos/plum.svg" alt="iFU Labs" style={{ height: 14 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ fontWeight: 600, color: IRIS }}>Ghara</span>
        </div>
      </div>
    </header>
  )
}

// ── Hero band ──────────────────────────────────────────────────────────────
function HeroBand({ data }: { data: TrustData }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${PLUM} 0%, #5B1A6B 100%)`, borderRadius: 16, padding: '48px 40px', marginBottom: 32, color: '#fff' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
        Trust Center
      </div>
      <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 300, lineHeight: 1.2, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
        {data.headline || `${data.orgName} Security & Compliance`}
      </h1>
      {data.description && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 560, margin: 0 }}>{data.description}</p>
      )}
    </div>
  )
}

// ── Framework score card ───────────────────────────────────────────────────
function FrameworkCard({ fw }: { fw: { framework: string; score: number | null; pass: number; fail: number; review: number; total: number } }) {
  const meta = FRAMEWORK_META[fw.framework] || { label: fw.framework, short: fw.framework, color: IRIS }
  const score = fw.score ?? 0
  const pct = fw.total > 0 ? Math.round((fw.pass / fw.total) * 100) : 0
  const statusColor = pct >= 90 ? GREEN : pct >= 70 ? '#B54708' : '#B42318'
  const statusLabel = pct >= 90 ? 'Compliant' : pct >= 70 ? 'In Progress' : 'Needs Work'

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 2px 12px rgba(51,6,61,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, marginBottom: 6 }}>{meta.short}</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: PLUM }}>{meta.label}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: PLUM, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}<span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(51,6,61,0.4)' }}>%</span></div>
          <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, marginTop: 4 }}>{statusLabel}</div>
        </div>
      </div>
      <div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(51,6,61,0.06)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ color: GREEN, fontWeight: 500 }}>✓ {fw.pass} passing</span>
          {fw.fail > 0 && <span style={{ color: '#B42318', fontWeight: 500 }}>✗ {fw.fail} failing</span>}
          {fw.review > 0 && <span style={{ color: '#B54708', fontWeight: 500 }}>⚠ {fw.review} review</span>}
        </div>
      </div>
      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(51,6,61,0.06)', fontSize: 12, color: 'rgba(51,6,61,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
        Continuously monitored by Ghara
      </div>
    </div>
  )
}

// ── Access granted view ────────────────────────────────────────────────────
function AccessGranted({ data }: { data: TrustData }) {
  return (
    <>
      <HeroBand data={data} />

      {/* Framework scores */}
      {data.complianceSummary && data.complianceSummary.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <SectionHeader title="Compliance Frameworks" subtitle="Automatically verified against your live AWS infrastructure" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {data.complianceSummary.map(fw => <FrameworkCard key={fw.framework} fw={fw} />)}
          </div>
        </section>
      )}

      {/* Artifacts */}
      {data.publishedArtifacts && data.publishedArtifacts.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <SectionHeader title="Security Documents" subtitle="Audit reports, certifications, and security documentation" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.publishedArtifacts.map((a, i) => <ArtifactRow key={i} artifact={a} />)}
          </div>
        </section>
      )}

      {/* Empty */}
      {!data.complianceSummary?.length && !data.publishedArtifacts?.length && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(51,6,61,0.35)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 15 }}>No compliance data published yet.</p>
        </div>
      )}
    </>
  )
}

// ── Artifact row ───────────────────────────────────────────────────────────
function ArtifactRow({ artifact }: { artifact: { title: string; url: string; type: string; publishedAt: string } }) {
  const typeIcons: Record<string, string> = { report: '📋', certificate: '🏆', policy: '📄', pentest: '🔍', default: '📎' }
  const icon = typeIcons[artifact.type] || typeIcons.default
  return (
    <a href={artifact.url} target="_blank" rel="noreferrer" style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', transition: 'box-shadow 0.15s, border-color 0.15s', boxShadow: '0 1px 4px rgba(51,6,61,0.03)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(51,6,61,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,99,230,0.3)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(51,6,61,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,6,61,0.08)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: GREY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>{artifact.title}</div>
        {artifact.publishedAt && <div style={{ fontSize: 12, color: 'rgba(51,6,61,0.45)', marginTop: 2 }}>Published {new Date(artifact.publishedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(51,6,61,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  )
}

// ── NDA gate ───────────────────────────────────────────────────────────────
function AccessGate({ data, showForm, setShowForm, form, setForm, submitState, onSubmit }: any) {
  return (
    <>
      <HeroBand data={data} />
      <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(51,6,61,0.06)', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: GREY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: PLUM, marginBottom: 10 }}>Access Required</h2>
        <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.55)', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
          {data.orgName} requires you to request access before viewing their compliance documentation.
        </p>

        {submitState === 'done' ? (
          <div style={{ background: 'rgba(6,118,71,0.06)', border: '1px solid rgba(6,118,71,0.2)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 14, color: GREEN, fontWeight: 500 }}>Request submitted — you'll hear back by email.</span>
          </div>
        ) : !showForm ? (
          <button onClick={() => setShowForm(true)} style={{ padding: '13px 32px', background: PLUM, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(51,6,61,0.2)' }}>
            Request Access →
          </button>
        ) : (
          <form onSubmit={onSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'name', placeholder: 'Full name *', required: true, type: 'text' },
              { key: 'email', placeholder: 'Work email *', required: true, type: 'email' },
              { key: 'company', placeholder: 'Company', required: false, type: 'text' },
            ].map(f => (
              <input key={f.key} required={f.required} type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ padding: '11px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 14, color: PLUM, outline: 'none', fontFamily: 'inherit' }} />
            ))}
            <textarea placeholder="Why do you need access? (optional)" rows={3} value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              style={{ padding: '11px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 14, color: PLUM, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            <button type="submit" disabled={submitState === 'submitting'} style={{ padding: '13px', background: PLUM, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: submitState === 'submitting' ? 0.7 : 1 }}>
              {submitState === 'submitting' ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: PLUM, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)', marginTop: 4 }}>{subtitle}</p>}
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(51,6,61,0.06)', padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.35)', margin: 0 }}>
        Compliance data continuously verified by{' '}
        <a href="https://ghara.ifulabs.com" target="_blank" rel="noreferrer" style={{ color: IRIS, textDecoration: 'none', fontWeight: 500 }}>Ghara by iFU Labs</a>
        {' '}· Last updated automatically on each scan
      </p>
    </footer>
  )
}

// ── Loading / error screens ────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${LAVENDER}`, borderTopColor: PLUM, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.4)', fontFamily: 'system-ui' }}>Loading Trust Center…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function NotFoundScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: PLUM }}>Trust Center not found</p>
      <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.45)' }}>This page doesn't exist or hasn't been enabled yet.</p>
    </div>
  )
}
