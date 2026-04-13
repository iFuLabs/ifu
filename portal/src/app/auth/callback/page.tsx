'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth0Client } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      const client = await getAuth0Client()
      const result = await client.handleRedirectCallback()
      
      // Check if user needs onboarding
      const token = await client.getTokenSilently()
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = await res.json()
      
      if (!data.onboarded) {
        // New user - go to onboarding
        const returnTo = result.appState?.returnTo || '/onboarding'
        router.push(returnTo)
      } else {
        // Existing user - go to their default product dashboard
        window.location.href = process.env.NEXT_PUBLIC_COMPLY_URL + '/dashboard'
      }
    } catch (err: any) {
      console.error('Auth callback error:', err)
      setError(err.message || 'Authentication failed')
    }
  }

  if (error) {
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
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'white',
          border: '1px solid #E0DDD5',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#FEE2E2',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
          </div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1A1917',
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif"
          }}>
            Authentication failed
          </h1>
          <p style={{ fontSize: '14px', color: '#6B685F', marginBottom: '24px' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1B3A5C',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back to home
          </button>
        </div>
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
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} style={{ color: '#1B3A5C', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '14px', color: '#6B685F' }}>Completing sign in...</p>
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
