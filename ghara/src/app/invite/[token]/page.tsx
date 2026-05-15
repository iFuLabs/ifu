'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [invite, setInvite] = useState<any>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/team/invitation/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => { setInvite(data); setLoading(false) })
      .catch(() => { setError('This invitation is invalid or has expired.'); setLoading(false) })
  }, [token])

  const handleAccept = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must include an uppercase letter')
      return
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must include a lowercase letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must include a number')
      return
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must include a special character')
      return
    }

    setAccepting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/team/accept-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to accept invitation')
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: IRIS }} className="animate-spin" />
        <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Aeonik', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <img src="/brand/logo.svg" alt="Ghara" style={{ height: 48, margin: '0 auto 24px' }} />
          <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>
            <p style={{ fontSize: 15, color: '#B42318', marginBottom: 16 }}>{error}</p>
            <a href="/login" style={{ fontSize: 14, color: IRIS, textDecoration: 'none', fontWeight: 500 }}>Go to sign in →</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Aeonik', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
            <img src="/brand/logo.svg" alt="Ghara" style={{ height: 48 }} />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 500, color: PLUM, marginBottom: 8, fontFamily: "'PP Fragment', serif", letterSpacing: '-0.02em' }}>
            Join {invite?.organization?.name || 'the team'}
          </h1>
          <p style={{ fontSize: 15, color: MUTED }}>
            You've been invited as <strong style={{ color: PLUM }}>{invite?.role || 'member'}</strong>
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: PLUM, marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Your name
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              style={{ width: '100%', padding: '14px 16px', fontSize: 15, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, color: PLUM, outline: 'none', transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif" }}
              onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
              onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: PLUM, marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Create a password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAccept()}
              placeholder="Min 8 characters"
              style={{ width: '100%', padding: '14px 16px', fontSize: 15, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, color: PLUM, outline: 'none', transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif" }}
              onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
              onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
            {password && (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {[
                  { label: '8+ characters', met: password.length >= 8 },
                  { label: 'Uppercase', met: /[A-Z]/.test(password) },
                  { label: 'Lowercase', met: /[a-z]/.test(password) },
                  { label: 'Number', met: /[0-9]/.test(password) },
                  { label: 'Special char', met: /[^A-Za-z0-9]/.test(password) },
                ].map(r => (
                  <span key={r.label} style={{ fontSize: 11, color: r.met ? '#067647' : 'rgba(51,6,61,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.met ? '#067647' : 'rgba(51,6,61,0.15)' }} />
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, fontSize: 14, color: '#B91C1C', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{
              width: '100%', padding: 14, background: accepting ? '#F4F4F4' : PLUM,
              color: accepting ? MUTED : '#FFFFFF', fontSize: 15, fontWeight: 600,
              border: 'none', borderRadius: 10, cursor: accepting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', boxShadow: accepting ? 'none' : '0 6px 16px rgba(51,6,61,0.22)',
            }}
            onMouseOver={e => !accepting && (e.currentTarget.style.background = IRIS)}
            onMouseOut={e => !accepting && (e.currentTarget.style.background = PLUM)}
          >
            {accepting ? (
              <><Loader2 size={18} className="animate-spin" /> Joining...</>
            ) : (
              <>Accept & join <ArrowRight size={18} /></>
            )}
          </button>
        </div>

        {/* Footer */}
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
