'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'

const inputStyle = {
  width: '100%', padding: '14px 16px', fontSize: '15px',
  background: '#FFFFFF', border: `1px solid ${BORDER}`,
  borderRadius: '10px', color: PLUM, outline: 'none',
  transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif"
}

const labelStyle = {
  display: 'block' as const, fontSize: '13px', fontWeight: '500' as const,
  color: PLUM, marginBottom: '8px',
  letterSpacing: '0.02em', textTransform: 'uppercase' as const
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !orgName.trim()) {
      setError('Email, password, and company name are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.auth.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        orgName: orgName.trim(),
        role: role || undefined,
      })
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'Aeonik', system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
            <img src="/brand/logo.svg" alt="Ghara" style={{ height: '48px', width: 'auto' }} />
          </div>
          <h1 style={{
            fontSize: '34px', fontWeight: '500', color: PLUM,
            marginBottom: '8px', fontFamily: "'PP Fragment', serif",
            letterSpacing: '-0.02em'
          }}>
            Start your free trial
          </h1>
          <p style={{ fontSize: '15px', color: MUTED }}>
            7 days of full access. No credit card required.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', border: `1px solid ${BORDER}`,
          borderRadius: '16px', padding: '40px',
          boxShadow: '0 12px 48px rgba(51, 6, 61, 0.12)'
        }}>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Your name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Work email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" autoFocus style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Company name</label>
            <input
              type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc" style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Your role</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value)}
              style={{ ...inputStyle, color: role ? PLUM : SUBTLE }}
            >
              <option value="">Select...</option>
              <option value="cto">CTO / VP Engineering</option>
              <option value="engineering">Engineering</option>
              <option value="compliance">Compliance / GRC</option>
              <option value="founder">Founder / CEO</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)', borderRadius: '10px',
              fontSize: '14px', color: '#B91C1C', marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: loading ? '#F4F4F4' : PLUM,
              color: loading ? MUTED : '#FFFFFF', fontSize: '15px', fontWeight: '600',
              border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s', marginBottom: '20px',
              boxShadow: loading ? 'none' : '0 6px 16px rgba(51, 6, 61, 0.22)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = IRIS)}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = PLUM)}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Creating account...</>
            ) : (
              <>Start free trial <ArrowRight size={18} /></>
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '14px', color: MUTED }}>Already have an account? </span>
            <a href="/login" style={{ fontSize: '14px', color: PLUM, textDecoration: 'none', fontWeight: '500' }}>
              Sign in
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <a href="https://ghara.ifulabs.com" style={{ fontSize: '13px', color: SUBTLE, textDecoration: 'none' }}>
            ← Back to home
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
            <img src="/brand/ifulabs-logo.svg" alt="iFU Labs" style={{ height: '14px', opacity: 0.4 }} />
          </a>
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
