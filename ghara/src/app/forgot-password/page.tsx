'use client'
import { useState } from 'react'
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true); setError('')
    try {
      await api.auth.forgotPassword({ email: email.trim() })
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Aeonik', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
            <img src="/brand/logo.svg" alt="Ghara" style={{ height: 48 }} />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 500, color: PLUM, marginBottom: 8, fontFamily: "'PP Fragment', serif", letterSpacing: '-0.02em' }}>
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p style={{ fontSize: 15, color: MUTED }}>
            {sent ? `We sent a reset link to ${email}` : 'Enter your email and we\'ll send a reset link.'}
          </p>
        </div>

        <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={48} style={{ color: IRIS, margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>Didn't receive it? Check your spam folder or try again.</p>
              <a href="/login" style={{ fontSize: 14, color: IRIS, textDecoration: 'none', fontWeight: 500 }}>Back to sign in</a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: PLUM, marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@company.com" autoFocus
                  style={{ width: '100%', padding: '14px 16px', fontSize: 15, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, color: PLUM, outline: 'none', transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif" }}
                  onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {error && (
                <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, fontSize: 14, color: '#B91C1C', marginBottom: 20 }}>{error}</div>
              )}

              <button
                onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', padding: 14, background: loading ? '#F4F4F4' : PLUM, color: loading ? MUTED : '#FFFFFF', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', marginBottom: 20, boxShadow: loading ? 'none' : '0 6px 16px rgba(51,6,61,0.22)' }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = IRIS)}
                onMouseOut={e => !loading && (e.currentTarget.style.background = PLUM)}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : <>Send reset link <ArrowRight size={18} /></>}
              </button>

              <div style={{ textAlign: 'center' }}>
                <a href="/login" style={{ fontSize: 14, color: SUBTLE, textDecoration: 'none' }}>← Back to sign in</a>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
            <img src="/brand/plum.svg" alt="iFU Labs" style={{ height: 14, opacity: 0.4 }} />
          </a>
        </div>
      </div>
      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
