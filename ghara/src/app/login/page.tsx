'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.auth.login({ email, password })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
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
          <div style={{ margin: '0 auto 20px', display: 'inline-flex', alignItems: 'center', gap: 12, justifyContent: 'center' }} aria-label="Ghara">
            <img src="/brand/ghara-mark.svg" alt="" style={{ height: 40, width: 40 }} />
            <span style={{ fontFamily: "'PP Fragment', Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 400, color: PLUM, letterSpacing: '-0.5px', lineHeight: 1 }}>Ghara</span>
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: '500',
            color: PLUM,
            marginBottom: '8px',
            fontFamily: "'PP Fragment', serif",
            letterSpacing: '-0.02em'
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '15px', color: MUTED }}>
            Sign in to your Ghara account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${BORDER}`,
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 12px 48px rgba(51, 6, 61, 0.12)'
        }}>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: '500',
              color: PLUM, marginBottom: '8px',
              letterSpacing: '0.02em', textTransform: 'uppercase'
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', fontSize: '15px',
                background: '#FFFFFF', border: `1px solid ${BORDER}`,
                borderRadius: '10px', color: PLUM, outline: 'none',
                transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif"
              }}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: '500',
              color: PLUM, marginBottom: '8px',
              letterSpacing: '0.02em', textTransform: 'uppercase'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your password"
              style={{
                width: '100%', padding: '14px 48px 14px 16px', fontSize: '15px',
                background: '#FFFFFF', border: `1px solid ${BORDER}`,
                borderRadius: '10px', color: PLUM, outline: 'none',
                transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif"
              }}
              onFocus={(e) => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(51,6,61,0.5)', padding: '4px 6px' }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
            </div>
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
            onClick={handleLogin}
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
              <><Loader2 size={18} className="animate-spin" /> Signing in...</>
            ) : (
              <>Sign in <ArrowRight size={18} /></>
            )}
          </button>

          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <a href="/forgot-password" style={{ fontSize: '14px', color: IRIS, textDecoration: 'none', fontWeight: '500' }}>
              Forgot your password?
            </a>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '14px', color: MUTED }}>Don&apos;t have an account? </span>
            <a href="/signup" style={{ fontSize: '14px', color: PLUM, textDecoration: 'none', fontWeight: '500' }}>
              Start free trial
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <a href="https://ghara.ifulabs.com" style={{ fontSize: '13px', color: SUBTLE, textDecoration: 'none' }}>
            ← Back to home
          </a>
        </div>

        {/* iFU Labs attribution */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
            <img src="/brand/plum.svg" alt="iFU Labs" style={{ height: '14px', opacity: 0.4 }} />
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PLUM }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
