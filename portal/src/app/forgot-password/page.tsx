'use client'
import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = '#E5E5E5'
const MUTED = 'rgba(51, 6, 61, 0.7)'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        throw new Error('Failed to send reset email')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const pageBg: React.CSSProperties = {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, ' + LAVENDER + ' 0%, #FFFFFF 60%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: "'Aeonik', 'DM Sans', system-ui, sans-serif"
  }

  if (success) {
    return (
      <div style={pageBg}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              margin: '0 auto 20px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img src="/logos/plum.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
            </div>
            <h1 style={{
              fontSize: '34px',
              fontWeight: 500,
              color: PLUM,
              marginBottom: '8px',
              fontFamily: "'PP Fragment', serif",
              letterSpacing: '-0.02em'
            }}>
              Check your email
            </h1>
            <p style={{ fontSize: '15px', color: MUTED, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: PLUM, fontWeight: 500 }}>{email}</strong>, you&apos;ll receive a password reset link shortly.
            </p>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid ' + BORDER,
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 12px 48px rgba(51, 6, 61, 0.12)'
          }}>
            <p style={{ fontSize: '14px', color: MUTED, marginBottom: '16px' }}>
              The email may take a few minutes to arrive. Be sure to check your spam folder.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: IRIS,
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            margin: '0 auto 20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <img src="/logos/plum.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: PLUM,
            marginBottom: '8px',
            fontFamily: "'PP Fragment', serif",
            letterSpacing: '-0.02em'
          }}>
            Reset your password
          </h1>
          <p style={{ fontSize: '15px', color: MUTED }}>
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid ' + BORDER,
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 12px 48px rgba(51, 6, 61, 0.12)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: PLUM,
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
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="john@company.com"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: '#FFFFFF',
                border: '1px solid ' + BORDER,
                borderRadius: '10px',
                color: PLUM,
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: "'Aeonik', 'DM Sans', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = IRIS
                e.target.style.boxShadow = '0 0 0 3px rgba(138, 99, 230, 0.15)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = BORDER
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#B91C1C',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#F4F4F4' : PLUM,
              color: loading ? MUTED : '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              marginBottom: '16px',
              boxShadow: loading ? 'none' : '0 6px 16px rgba(51, 6, 61, 0.22)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = IRIS)}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = PLUM)}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Sending...</>
            ) : (
              <>Send reset link</>
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: MUTED,
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
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
