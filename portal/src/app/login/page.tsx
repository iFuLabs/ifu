'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function LoginPage() {
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
      
      // Store the JWT token
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user_email', response.user.email)
      
      // Redirect to product dashboard
      const complyUrl = process.env.NEXT_PUBLIC_COMPLY_URL
      const finopsUrl = process.env.NEXT_PUBLIC_FINOPS_URL
      
      // Check last used product
      const lastProduct = localStorage.getItem('lastProduct')
      if (lastProduct === 'comply') {
        window.location.href = `${complyUrl}/dashboard`
      } else if (lastProduct === 'finops') {
        window.location.href = `${finopsUrl}/dashboard`
      } else {
        // Default to portal home
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
      background: '#FAFAF8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      
      <div style={{ maxWidth: '420px', width: '100%' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: '#1B3A5C',
            borderRadius: '12px',
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
            fontSize: '32px', 
            fontWeight: '600', 
            color: '#1A1917', 
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '15px', color: '#6B685F' }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          border: '1px solid #E0DDD5',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#1A1917', 
              marginBottom: '8px' 
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
                padding: '12px 16px',
                fontSize: '15px',
                background: '#FAFAF8',
                border: '1px solid #E0DDD5',
                borderRadius: '8px',
                color: '#1A1917',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1B3A5C'
                e.target.style.background = 'white'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E0DDD5'
                e.target.style.background = '#FAFAF8'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#1A1917', 
              marginBottom: '8px' 
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
                padding: '12px 16px',
                fontSize: '15px',
                background: '#FAFAF8',
                border: '1px solid #E0DDD5',
                borderRadius: '8px',
                color: '#1A1917',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1B3A5C'
                e.target.style.background = 'white'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E0DDD5'
                e.target.style.background = '#FAFAF8'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#991B1B',
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
              background: loading ? '#6B685F' : '#1B3A5C',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              marginBottom: '16px'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Signing in...</>
            ) : (
              <>Sign in <ArrowRight size={18} /></>
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <a 
              href="/onboarding" 
              style={{ 
                fontSize: '14px', 
                color: '#6B685F',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#1B3A5C'}
              onMouseOut={(e) => e.currentTarget.style.color = '#6B685F'}
            >
              Don't have an account? Sign up
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a 
            href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}
            style={{ fontSize: '13px', color: '#9C9890', textDecoration: 'none' }}
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
