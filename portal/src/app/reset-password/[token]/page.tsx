'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Lock, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'

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
      
      // Redirect to login after 3 seconds
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
      <div style={{
        minHeight: '100vh',
        background: '#FAFAF8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: "'DM Sans', system-ui, sans-serif"
      }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: '#10B981',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle size={32} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            color: '#1A1917', 
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Password reset successful
          </h1>
          <p style={{ fontSize: '15px', color: '#6B685F', marginBottom: '24px' }}>
            Your password has been updated. Redirecting to login...
          </p>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #E0DDD5',
            borderTopColor: '#1B3A5C',
            borderRadius: '50%',
            margin: '0 auto',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
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
            <Lock size={28} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            color: '#1A1917', 
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Set new password
          </h1>
          <p style={{ fontSize: '15px', color: '#6B685F' }}>
            Choose a strong password for your account
          </p>
        </div>

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
              New password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
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
                  color: '#6B685F',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#1A1917', 
              marginBottom: '8px' 
            }}>
              Confirm password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Re-enter your password"
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
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
                  color: '#6B685F',
                  padding: '4px'
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
            onClick={handleSubmit}
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
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Resetting...</>
            ) : (
              <>Reset password</>
            )}
          </button>
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
