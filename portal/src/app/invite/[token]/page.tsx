'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface InvitationDetails {
  email: string
  role: string
  product: string
  organization: {
    id: string
    name: string
    slug: string
  }
  invitedBy: {
    name: string
    email: string
  }
  expiresAt: string
}

const PAGE_BG: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "'DM Sans', system-ui, sans-serif"
}

const LOGO_MARK = (
  <div style={{
    margin: '0 auto 20px',
    display: 'flex',
    justifyContent: 'center'
  }}>
    <img src="/logos/white.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
  </div>
)

const inputStyle: React.CSSProperties = {
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
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#C4C7CC',
  marginBottom: '8px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase'
}

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = '#E8820A'
  e.target.style.background = '#14161B'
  e.target.style.boxShadow = '0 0 0 3px rgba(232, 130, 10, 0.15)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = '#25282F'
  e.target.style.background = '#0F1115'
  e.target.style.boxShadow = 'none'
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  async function loadInvitation() {
    try {
      const res = await fetch(`${API_URL}/api/v1/team/invitation/${token}`)

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Invalid or expired invitation')
        setLoading(false)
        return
      }

      const data = await res.json()
      setInvitation(data)
      setLoading(false)
    } catch (err: any) {
      setError('Failed to load invitation')
      setLoading(false)
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setAccepting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/team/accept-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, name, password })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to accept invitation')
        setAccepting(false)
        return
      }

      const data = await res.json()

      const productUrl = data.product === 'finops'
        ? (process.env.NEXT_PUBLIC_FINOPS_URL || 'http://localhost:3002')
        : (process.env.NEXT_PUBLIC_COMPLY_URL || 'http://localhost:3001')

      router.push(productUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div style={PAGE_BG}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#E8820A', margin: '0 auto 14px' }} />
          <p style={{ fontSize: '14px', color: '#9AA0A6' }}>Loading invitation...</p>
        </div>
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div style={PAGE_BG}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            {LOGO_MARK}
            <h1 style={{
              fontSize: '34px',
              fontWeight: 500,
              color: '#F5F5F5',
              marginBottom: '8px',
              fontFamily: "'Fraunces', serif",
              letterSpacing: '-0.02em'
            }}>
              Invalid Invitation
            </h1>
            <p style={{ fontSize: '15px', color: '#9AA0A6' }}>{error}</p>
          </div>
          <div style={{
            background: 'rgba(20, 22, 27, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #25282F',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}>
              <AlertCircle size={26} style={{ color: '#FCA5A5' }} />
            </div>
            <a
              href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                background: '#E8820A',
                color: '#0B0C0F',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 6px 16px rgba(232, 130, 10, 0.25)'
              }}
            >
              Go to Home
              <ArrowRight size={16} />
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

  return (
    <div style={PAGE_BG}>
      <div style={{ maxWidth: '460px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {LOGO_MARK}
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: '10px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            You&apos;re invited
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6', lineHeight: 1.55 }}>
            <strong style={{ color: '#F5F5F5', fontWeight: 500 }}>{invitation?.invitedBy.name || invitation?.invitedBy.email}</strong> invited you to join{' '}
            <strong style={{ color: '#F5F5F5', fontWeight: 500 }}>{invitation?.organization.name}</strong>
          </p>
        </div>

        <div style={{
          background: 'rgba(20, 22, 27, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #25282F',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}>

          <div style={{
            background: '#0F1115',
            border: '1px solid #25282F',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '24px'
          }}>
            {[
              { k: 'Email', v: invitation?.email },
              { k: 'Role', v: invitation?.role, capitalize: true },
              { k: 'Expires', v: invitation && new Date(invitation.expiresAt).toLocaleDateString() }
            ].map((row, i, arr) => (
              <div key={row.k} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                marginBottom: i === arr.length - 1 ? 0 : '10px'
              }}>
                <span style={{ color: '#9AA0A6' }}>{row.k}</span>
                <span style={{
                  color: '#F5F5F5',
                  fontWeight: 500,
                  textTransform: row.capitalize ? 'capitalize' : 'none'
                }}>{row.v}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAccept}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirm your password"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#FCA5A5',
                marginBottom: '18px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={accepting}
              style={{
                width: '100%',
                padding: '14px',
                background: accepting ? '#2A2D34' : '#E8820A',
                color: accepting ? '#9AA0A6' : '#0B0C0F',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                cursor: accepting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: accepting ? 'none' : '0 6px 16px rgba(232, 130, 10, 0.25)'
              }}
              onMouseOver={(e) => !accepting && (e.currentTarget.style.background = '#FF9820')}
              onMouseOut={(e) => !accepting && (e.currentTarget.style.background = '#E8820A')}
            >
              {accepting ? (
                <><Loader2 size={18} className="animate-spin" /> Accepting...</>
              ) : (
                <>Accept invitation & create account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#6B7078', textAlign: 'center', marginTop: '20px' }}>
            By accepting, you agree to create an account with iFu Labs
          </p>
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
