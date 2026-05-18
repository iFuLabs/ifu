'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const GREEN = '#067647'

const FRAMEWORK_META: Record<string, { label: string; description: string; color: string; icon: string }> = {
  soc2:     { label: 'SOC 2 Type II',  description: 'Security, availability & confidentiality controls audited by an independent CPA firm.',  color: '#8A63E6', icon: '🛡️' },
  iso27001: { label: 'ISO 27001',      description: 'International information security management system, certified by an accredited body.',   color: '#33063D', icon: '🏆' },
  gdpr:     { label: 'GDPR',           description: 'EU General Data Protection Regulation — data subject rights and processing controls.',     color: '#067647', icon: '🇪🇺' },
  hipaa:    { label: 'HIPAA',          description: 'US healthcare data protection — administrative, physical and technical safeguards for ePHI.', color: '#B54708', icon: '🏥' },
  pci_dss:  { label: 'PCI DSS 4.0',   description: 'Payment card industry security standard for handling cardholder data.',                    color: '#B42318', icon: '💳' },
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

  if (loading) return <Spinner />
  if (error || !data) return <NotFound />

  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8FA', fontFamily: font, color: PLUM }}>
      <Nav data={data} />
      {data.ndaRequired && !data.accessGranted
        ? <RequestAccess data={data} form={form} setForm={setForm} submitState={submitState} onSubmit={submitRequest} />
        : <MainContent data={data} />
      }
      <PageFooter />
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────
function Nav({ data }: { data: TrustData }) {
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid rgba(51,6,61,0.08)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.orgName} style={{ height: 32, objectFit: 'contain', maxWidth: 140 }} />
            : <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: PLUM, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{data.orgName?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 16, fontWeight: 600, color: PLUM }}>{data.orgName}</span>
              </div>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(51,6,61,0.45)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
          <span>Verified by</span>
          <span style={{ fontWeight: 600, color: IRIS }}>Ghara · iFU Labs</span>
        </div>
      </div>
    </nav>
  )
}

// ── Main content (access granted) ─────────────────────────────────────────
function MainContent({ data }: { data: TrustData }) {
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const overallScore = data.complianceSummary?.length
    ? Math.round(data.complianceSummary.reduce((s, f) => s + (f.score ?? 0), 0) / data.complianceSummary.length)
    : null

  return (
    <>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${PLUM} 0%, #5B1A6B 60%, #8A63E6 100%)`, color: '#fff', padding: '64px 32px 56px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Trust Center
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                {data.headline || `${data.orgName} Security & Compliance`}
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
                {data.description || `${data.orgName} is committed to maintaining the highest standards of security and compliance. This page provides real-time visibility into our compliance posture.`}
              </p>
            </div>
            {overallScore !== null && (
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 36px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: '#fff' }}>{overallScore}<span style={{ fontSize: 24, fontWeight: 300, opacity: 0.7 }}>%</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Overall Score</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Updated {now}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {data.complianceSummary && data.complianceSummary.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(51,6,61,0.07)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', gap: 0 }}>
            {[
              { label: 'Frameworks', value: data.complianceSummary.length },
              { label: 'Controls Passing', value: data.complianceSummary.reduce((s, f) => s + f.pass, 0) },
              { label: 'Controls Monitored', value: data.complianceSummary.reduce((s, f) => s + f.total, 0) },
              { label: 'Monitoring', value: 'Continuous' },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1, padding: '20px 24px', borderRight: i < 3 ? '1px solid rgba(51,6,61,0.07)' : 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: PLUM }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Frameworks */}
            {data.complianceSummary && data.complianceSummary.length > 0 && (
              <section>
                <SectionTitle title="Compliance Frameworks" subtitle="Automatically verified against live AWS infrastructure. Scores update on every scan." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.complianceSummary.map(fw => <FrameworkRow key={fw.framework} fw={fw} />)}
                </div>
              </section>
            )}

            {/* Documents */}
            {data.publishedArtifacts && data.publishedArtifacts.length > 0 && (
              <section>
                <SectionTitle title="Security Documents" subtitle="Audit reports, certifications, and security documentation." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.publishedArtifacts.map((a, i) => <ArtifactRow key={i} artifact={a} />)}
                </div>
              </section>
            )}
          </div>

          {/* Right column — sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SecurityHighlights />
            <ContactCard orgName={data.orgName} />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Framework row ──────────────────────────────────────────────────────────
function FrameworkRow({ fw }: { fw: { framework: string; score: number | null; pass: number; fail: number; review: number; total: number } }) {
  const meta = FRAMEWORK_META[fw.framework] || { label: fw.framework, description: '', color: IRIS, icon: '🔒' }
  const pct = fw.total > 0 ? Math.round((fw.pass / fw.total) * 100) : 0
  const statusColor = pct >= 90 ? GREEN : pct >= 70 ? '#B54708' : '#B42318'
  const statusLabel = pct >= 90 ? 'Compliant' : pct >= 70 ? 'In Progress' : 'Needs Work'
  const statusBg = pct >= 90 ? 'rgba(6,118,71,0.08)' : pct >= 70 ? 'rgba(181,71,8,0.08)' : 'rgba(180,35,24,0.08)'

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 6px rgba(51,6,61,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${meta.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{meta.icon}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: meta.color, marginBottom: 3 }}>{fw.framework.replace('_', ' ').toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: PLUM }}>{meta.label}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: PLUM, lineHeight: 1 }}>{pct}<span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(51,6,61,0.4)' }}>%</span></div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: statusBg, color: statusColor, display: 'inline-block', marginTop: 4 }}>{statusLabel}</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.55)', lineHeight: 1.6, margin: '0 0 16px' }}>{meta.description}</p>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(51,6,61,0.06)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)`, transition: 'width 1s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
        <span style={{ color: GREEN, fontWeight: 500 }}>✓ {fw.pass} passing</span>
        {fw.fail > 0 && <span style={{ color: '#B42318', fontWeight: 500 }}>✗ {fw.fail} failing</span>}
        {fw.review > 0 && <span style={{ color: '#B54708', fontWeight: 500 }}>⚠ {fw.review} under review</span>}
        <span style={{ color: 'rgba(51,6,61,0.35)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
          Live monitoring
        </span>
      </div>
    </div>
  )
}

// ── Sidebar cards ──────────────────────────────────────────────────────────
function SecurityHighlights() {
  const items = [
    { icon: '🔐', title: 'Encryption at rest', desc: 'All data encrypted using AES-256' },
    { icon: '🔒', title: 'Encryption in transit', desc: 'TLS 1.2+ enforced on all connections' },
    { icon: '☁️', title: 'Cloud infrastructure', desc: 'Hosted on AWS us-east-1' },
    { icon: '🔍', title: 'Continuous monitoring', desc: 'Automated scans run daily' },
    { icon: '👥', title: 'Access controls', desc: 'Role-based access with MFA required' },
    { icon: '📋', title: 'Audit logging', desc: 'Immutable logs of all system actions' },
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: '24px', boxShadow: '0 1px 6px rgba(51,6,61,0.04)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: PLUM, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Security Highlights</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: PLUM }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)', marginTop: 1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContactCard({ orgName }: { orgName: string }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${PLUM} 0%, #5B1A6B 100%)`, borderRadius: 14, padding: '24px', color: '#fff' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.7)' }}>Security Questions?</h3>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Have questions about {orgName}'s security practices or need additional documentation?
      </p>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
        Powered by Ghara · iFU Labs
      </div>
    </div>
  )
}

// ── Artifact row ───────────────────────────────────────────────────────────
function ArtifactRow({ artifact }: { artifact: { title: string; url: string; type: string; publishedAt: string } }) {
  const typeIcons: Record<string, string> = { report: '📋', certificate: '🏆', policy: '📄', pentest: '🔍', default: '📎' }
  const icon = typeIcons[artifact.type] || typeIcons.default
  return (
    <a href={artifact.url} target="_blank" rel="noreferrer" style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(51,6,61,0.03)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,99,230,0.3)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(51,6,61,0.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,6,61,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(51,6,61,0.03)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>{artifact.title}</div>
        {artifact.publishedAt && <div style={{ fontSize: 12, color: 'rgba(51,6,61,0.45)', marginTop: 2 }}>Published {new Date(artifact.publishedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(51,6,61,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  )
}

// ── Section title ──────────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: PLUM, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)', marginTop: 5 }}>{subtitle}</p>}
    </div>
  )
}

// ── Access request page ────────────────────────────────────────────────────
function RequestAccess({ data, form, setForm, submitState, onSubmit }: any) {
  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
      {/* Left — brand panel */}
      <div style={{ background: `linear-gradient(135deg, ${PLUM} 0%, #5B1A6B 60%, #8A63E6 100%)`, padding: '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Trust Center
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            {data.headline || `${data.orgName} Security & Compliance`}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0, maxWidth: 420 }}>
            {data.description || `Request access to view ${data.orgName}'s compliance posture, certifications, and security documentation.`}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: '🛡️', text: 'Real-time compliance scores across SOC 2, ISO 27001, and more' },
            { icon: '📋', text: 'Audit reports, certifications, and security documentation' },
            { icon: '🔍', text: 'Continuously monitored and automatically updated' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ background: '#F8F8FA', padding: '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {submitState === 'done' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(6,118,71,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: PLUM, marginBottom: 10 }}>Request submitted</h2>
            <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.55)', lineHeight: 1.7 }}>
              Your request has been sent to {data.orgName}. You'll receive an email with access instructions once approved.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: PLUM, margin: '0 0 8px' }}>Request Access</h2>
              <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.55)', margin: 0 }}>Fill in your details and {data.orgName} will review your request.</p>
            </div>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Full name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Jane Smith" required />
                <FormField label="Work email *" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="jane@company.com" type="email" required />
              </div>
              <FormField label="Company" value={form.company} onChange={v => setForm({ ...form, company: v })} placeholder="Acme Corp" />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Why do you need access?</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="We're evaluating vendors and need to review your security posture..." rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }} />
              </div>
              <button type="submit" disabled={submitState === 'submitting'} style={{ padding: '13px', background: PLUM, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: submitState === 'submitting' ? 'not-allowed' : 'pointer', opacity: submitState === 'submitting' ? 0.7 : 1, boxShadow: '0 4px 14px rgba(51,6,61,0.2)', marginTop: 4 }}>
                {submitState === 'submitting' ? 'Submitting…' : 'Request Access →'}
              </button>
              <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.4)', textAlign: 'center', margin: 0 }}>
                Your information is only shared with {data.orgName} and used to process your request.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder, type = 'text', required = false }: any) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(51,6,61,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(51,6,61,0.15)', borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }} />
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(51,6,61,0.07)', background: '#fff', padding: '20px 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.35)', margin: 0 }}>
        Compliance data continuously verified by{' '}
        <a href="https://ghara.ifulabs.com" target="_blank" rel="noreferrer" style={{ color: IRIS, textDecoration: 'none', fontWeight: 500 }}>Ghara by iFU Labs</a>
        {' '}· Scores update automatically on each scan
      </p>
    </footer>
  )
}

// ── Utility screens ────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'system-ui' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${LAVENDER}`, borderTopColor: PLUM, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: PLUM }}>Trust Center not found</p>
      <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.45)' }}>This page doesn't exist or hasn't been enabled yet.</p>
    </div>
  )
}
