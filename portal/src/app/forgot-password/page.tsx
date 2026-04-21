'use client'
import { useState } from 'react'
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

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

  if (success) {
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
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              margin: '0 auto 20px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img src="/logos/white.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
            </div>
            <h1 style={{
              fontSize: '34px',
              fontWeight: 500,
              color: '#F5F5F5',
              marginBottom: '8px',
              fontFamily: "'Fraunces', serif",
              letterSpacing: '-0.02em'
            }}>
              Check your email
            </h1>
            <p style={{ fontSize: '15px', color: '#9AA0A6', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: '#F5F5F5', fontWeight: 500 }}>{email}</strong>, you'll receive a password reset link shortly.
            </p>
          </div>

          <div style={{
            background: 'rgba(20, 22, 27, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #25282F',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
          }}>
            <p style={{ fontSize: '14px', color: '#9AA0A6', marginBottom: '16px' }}>
              The email may take a few minutes to arrive. Be sure to check your spam folder.
            </p>
            <Link 
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#E8820A',
                textDecoration: 'none',
                fontWeight: '500'
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
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            margin: '0 auto 20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <img src="/logos/white.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Reset your password
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div style={{
          background: 'rgba(20, 22, 27, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #25282F',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
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
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#2A2D34' : '#E8820A',
              color: loading ? '#9AA0A6' : '#0B0C0F',
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
              boxShadow: loading ? 'none' : '0 6px 16px rgba(232, 130, 10, 0.25)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#FF9820')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#E8820A')}
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
                color: '#9AA0A6',
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
