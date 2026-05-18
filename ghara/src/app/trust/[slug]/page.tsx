/**
 * Public Trust Center page — /trust/[slug]
 * No authentication required. NDA-gated orgs require an access token.
 */
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Shield, CheckCircle, Lock, ExternalLink, AlertTriangle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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

const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  soc2: 'Security, availability, and confidentiality controls audited by an independent CPA firm.',
  iso27001: 'Information security management system certified to the international ISO 27001 standard.',
  gdpr: 'Data protection controls aligned with EU General Data Protection Regulation requirements.',
  hipaa: 'Administrative, physical, and technical safeguards for electronic Protected Health Information.',
  pci_dss: 'Payment card industry data security standards for handling cardholder data.',
}

type TrustCenterData = {
  slug: string
  orgName: string
  headline?: string
  description?: string
  logoUrl?: string
  ndaRequired: boolean
  accessGranted: boolean
  publishedFrameworks?: string[]
  complianceSummary?: Array<{ framework: string; score: number | null; pass: number; fail: number; total: number }>
  publishedArtifacts?: Array<{ title: string; url: string; type: string; publishedAt: string }>
}

export default function PublicTrustCenterPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const token = searchParams?.get('token') || ''

  const [data, setData] = useState<TrustCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Access request form state
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState({ name: '', email: '', company: '', message: '' })
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle')

  useEffect(() => {
    if (!slug) return
    const url = `${API_URL}/api/v1/trust-center/${slug}${token ? `?token=${token}` : ''}`
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Trust Center not found')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, token])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setRequestStatus('submitting')
    try {
      await fetch(`${API_URL}/api/v1/trust-center/${slug}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      })
      setRequestStatus('submitted')
    } catch {
      setRequestStatus('idle')
      alert('Failed to submit request. Please try again.')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${LAVENDER}`, borderTopColor: PLUM, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <AlertTriangle size={32} style={{ color: '#B42318' }} />
        <p style={{ fontSize: 16, color: PLUM, fontWeight: 500 }}>Trust Center not found</p>
        <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)' }}>This page doesn't exist or hasn't been enabled yet.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F4', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div style={{ background: PLUM, padding: '40px 24px', textAlign: 'center' }}>
        {data.logoUrl && (
          <img src={data.logoUrl} alt={data.orgName} style={{ height: 40, marginBottom: 16, objectFit: 'contain' }} />
        )}
        <h1 style={{ fontSize: 28, fontWeight: 400, color: '#fff', fontFamily: "'PP Fragment', serif", marginBottom: 8 }}>
          {data.headline || `${data.orgName} Trust Center`}
        </h1>
        {data.description && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            {data.description}
          </p>
        )}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <img src="https://www.ifulabs.com/logos/white.svg" alt="iFU Labs" style={{ height: 16, opacity: 0.6 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Powered by Ghara</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* NDA gate — not yet granted */}
        {data.ndaRequired && !data.accessGranted && (
          <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 20px rgba(51,6,61,0.04)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `rgba(138,99,230,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={24} style={{ color: IRIS }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: PLUM, marginBottom: 8 }}>Access Required</h2>
            <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.55)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
              {data.orgName} requires you to request access before viewing their compliance documentation.
            </p>

            {requestStatus === 'submitted' ? (
              <div style={{ background: 'rgba(6,118,71,0.06)', border: '1px solid rgba(6,118,71,0.15)', borderRadius: 10, padding: '16px 24px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} style={{ color: GREEN }} />
                <span style={{ fontSize: 14, color: GREEN, fontWeight: 500 }}>Request submitted — you'll receive an email when approved.</span>
              </div>
            ) : !showRequestForm ? (
              <button onClick={() => setShowRequestForm(true)} style={{ padding: '12px 28px', background: PLUM, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Request Access
              </button>
            ) : (
              <form onSubmit={submitRequest} style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input required value={requestForm.name} onChange={e => setRequestForm({ ...requestForm, name: e.target.value })}
                    placeholder="Your name *" style={inputStyle} />
                  <input required type="email" value={requestForm.email} onChange={e => setRequestForm({ ...requestForm, email: e.target.value })}
                    placeholder="Work email *" style={inputStyle} />
                  <input value={requestForm.company} onChange={e => setRequestForm({ ...requestForm, company: e.target.value })}
                    placeholder="Company" style={inputStyle} />
                  <textarea value={requestForm.message} onChange={e => setRequestForm({ ...requestForm, message: e.target.value })}
                    placeholder="Why do you need access? (optional)" rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                  <button type="submit" disabled={requestStatus === 'submitting'} style={{ padding: '12px', background: PLUM, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: requestStatus === 'submitting' ? 0.7 : 1 }}>
                    {requestStatus === 'submitting' ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Compliance content — access granted */}
        {data.accessGranted && (
          <>
            {/* Framework scores */}
            {data.complianceSummary && data.complianceSummary.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: PLUM, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} style={{ color: IRIS }} /> Compliance Frameworks
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {data.complianceSummary.map(fw => (
                    <FrameworkCard key={fw.framework} fw={fw} />
                  ))}
                </div>
              </div>
            )}

            {/* Published artifacts */}
            {data.publishedArtifacts && data.publishedArtifacts.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: PLUM, marginBottom: 16 }}>Security Documents</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.publishedArtifacts.map((artifact, i) => (
                    <a key={i} href={artifact.url} target="_blank" rel="noreferrer" style={{
                      background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 10,
                      padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      textDecoration: 'none', transition: 'box-shadow 0.15s'
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: PLUM }}>{artifact.title}</p>
                        {artifact.publishedAt && (
                          <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.4)', marginTop: 2 }}>
                            Published {new Date(artifact.publishedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <ExternalLink size={14} style={{ color: 'rgba(51,6,61,0.3)', flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!data.complianceSummary?.length && !data.publishedArtifacts?.length) && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(51,6,61,0.4)' }}>
                <Shield size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No compliance data published yet.</p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, textAlign: 'center', paddingTop: 24, borderTop: '1px solid rgba(51,6,61,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.3)' }}>
            Compliance data is automatically verified by{' '}
            <a href="https://ghara.ifulabs.com" target="_blank" rel="noreferrer" style={{ color: IRIS, textDecoration: 'none' }}>Ghara by iFU Labs</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function FrameworkCard({ fw }: { fw: { framework: string; score: number | null; pass: number; fail: number; total: number } }) {
  const label = FRAMEWORK_LABELS[fw.framework] || fw.framework
  const desc = FRAMEWORK_DESCRIPTIONS[fw.framework] || ''
  const score = fw.score

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 12, padding: '20px', boxShadow: '0 2px 8px rgba(51,6,61,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: PLUM, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        {score !== null && (
          <span style={{
            fontFamily: "'Aeonik Fono', monospace", fontSize: 20, fontWeight: 700,
            color: score >= 80 ? GREEN : score >= 60 ? '#B54708' : '#B42318'
          }}>{score}%</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.5)', lineHeight: 1.5, marginBottom: 12 }}>{desc}</p>
      {fw.total > 0 && (
        <div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(51,6,61,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${score ?? 0}%`, background: score !== null && score >= 80 ? GREEN : IRIS, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: GREEN, fontWeight: 500 }}>{fw.pass} passing</span>
            {fw.fail > 0 && <span style={{ fontSize: 10, color: '#B42318', fontWeight: 500 }}>{fw.fail} failing</span>}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid rgba(51,6,61,0.15)',
  borderRadius: 8, fontSize: 13, color: PLUM, outline: 'none', boxSizing: 'border-box'
}
