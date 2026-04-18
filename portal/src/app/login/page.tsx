'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.auth.login({ email, password })
      
      // Cookie is set by the backend via Set-Cookie header.
      // Redirect to product dashboard.
      const complyUrl = process.env.NEXT_PUBLIC_COMPLY_URL
      const finopsUrl = process.env.NEXT_PUBLIC_FINOPS_URL

      if (response.lastProduct === 'comply') {
        window.location.href = `${complyUrl}/dashboard`
      } else if (response.lastProduct === 'finops') {
        window.location.href = `${finopsUrl}/dashboard`
      } else {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>

      <div style={{ maxWidth: '440px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #E8820A 0%, #C96F08 100%)',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(232, 130, 10, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: '500',
            color: '#F5F5F5',
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
            Sign in to your iFu Labs account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(20, 22, 27, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #25282F',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px',
              fontWeight: '500',
              color: '#C4C7CC',
              marginBottom: '8px',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: '#0F1115',
                border: '1px solid #25282F',
                borderRadius: '10px',
                color: '#F5F5F5',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#E8820A'
                e.target.style.background = '#14161B'
                e.target.style.boxShadow = '0 0 0 3px rgba(232, 130, 10, 0.15)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#25282F'
                e.target.style.background = '#0F1115'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px',
              fontWeight: '500',
              color: '#C4C7CC',
              marginBottom: '8px',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: '#0F1115',
                border: '1px solid #25282F',
                borderRadius: '10px',
                color: '#F5F5F5',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#E8820A'
                e.target.style.background = '#14161B'
                e.target.style.boxShadow = '0 0 0 3px rgba(232, 130, 10, 0.15)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#25282F'
                e.target.style.background = '#0F1115'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#FCA5A5',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#2A2D34' : '#E8820A',
              color: loading ? '#9AA0A6' : '#0B0C0F',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              marginBottom: '20px',
              boxShadow: loading ? 'none' : '0 6px 16px rgba(232, 130, 10, 0.25)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#FF9820')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#E8820A')}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Signing in...</>
            ) : (
              <>Sign in <ArrowRight size={18} /></>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 20px', color: '#3A3E47', fontSize: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#25282F' }} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7078' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#25282F' }} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <a
              href="/forgot-password"
              style={{
                fontSize: '14px',
                color: '#E8820A',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Forgot your password?
            </a>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '14px', color: '#9AA0A6' }}>Don&apos;t have an account? </span>
            <a
              href="/onboarding"
              style={{
                fontSize: '14px',
                color: '#F5F5F5',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#E8820A'}
              onMouseOut={(e) => e.currentTarget.style.color = '#F5F5F5'}
            >
              Sign up
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <a
            href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}
            style={{ fontSize: '13px', color: '#6B7078', textDecoration: 'none' }}
          >
            ← Back to home
          </a>
        </div>
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
