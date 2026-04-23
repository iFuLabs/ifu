'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Lock, CheckCircle, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

const PAGE_BG: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "'DM Sans', system-ui, sans-serif"
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 44px 14px 16px',
  fontSize: '15px',
  background: '#0F1115',
  border: '1px solid #25282F',
  borderRadius: '10px',
  color: '#F5F5F5',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: "'DM Sans', sans-serif"
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

const LOGO_MARK = () => (
  <div style={{
    margin: '0 auto 20px',
    display: 'flex',
    justifyContent: 'center'
  }}>
    <img src="/logos/white.svg" alt="iFu Labs" style={{ height: '56px', width: 'auto' }} />
  </div>
)

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Both fields are required')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={PAGE_BG}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          {LOGO_MARK()}
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: '10px',
            fontFamily: "'PP Fragment', serif",
            letterSpacing: '-0.02em'
          }}>
            Password reset successful
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6', marginBottom: '28px' }}>
            Your password has been updated. Redirecting to login...
          </p>
          <Loader2 size={26} className="animate-spin" style={{ color: '#E8820A' }} />
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
      <div style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          {LOGO_MARK()}
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: '8px',
            fontFamily: "'PP Fragment', serif",
            letterSpacing: '-0.02em'
          }}>
            Set new password
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
            Choose a strong password for your account
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
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>New password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9AA0A6',
                  padding: '4px',
                  display: 'flex'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Confirm password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Re-enter your password"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9AA0A6',
                  padding: '4px',
                  display: 'flex'
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
              boxShadow: loading ? 'none' : '0 6px 16px rgba(232, 130, 10, 0.25)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#FF9820')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#E8820A')}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Resetting...</>
            ) : (
              <>Reset password <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
