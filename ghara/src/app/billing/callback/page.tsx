'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference) {
      setStatus('error')
      setError('Missing payment reference')
      return
    }

    // Call complete-signup to verify, refund tokenization, create subscription
    fetch(`${API_URL}/api/v1/auth/complete-signup?reference=${reference}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async res => {
        if (res.ok) {
          setStatus('success')
          // Redirect to onboarding after brief success message
          setTimeout(() => router.push('/onboarding'), 2000)
        } else {
          const data = await res.json().catch(() => ({ message: 'Verification failed' }))
          setStatus('error')
          setError(data.message || 'Failed to complete signup')
        }
      })
      .catch(err => {
        setStatus('error')
        setError(err.message || 'Network error')
      })
  }, [searchParams, router])

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Aeonik', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <img src="/brand/logo.svg" alt="Ghara" style={{ height: 48, margin: '0 auto 32px' }} />

        {status === 'verifying' && (
          <div style={{ background: '#FFFFFF', border: `1px solid rgba(51,6,61,0.1)`, borderRadius: 16, padding: '48px 40px', boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>
            <Loader2 size={36} style={{ color: IRIS, margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ fontSize: 20, fontWeight: 500, color: PLUM, fontFamily: "'PP Fragment', serif" }}>Setting up your account...</h2>
            <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.6)', marginTop: 8 }}>Verifying your card and starting your trial.</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ background: '#FFFFFF', border: `1px solid rgba(6,118,71,0.15)`, borderRadius: 16, padding: '48px 40px', boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>
            <CheckCircle size={36} style={{ color: '#067647', margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 20, fontWeight: 500, color: PLUM, fontFamily: "'PP Fragment', serif" }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.6)', marginTop: 8 }}>Your 7-day trial is active. Redirecting to setup...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: '#FFFFFF', border: `1px solid rgba(180,35,24,0.15)`, borderRadius: 16, padding: '48px 40px', boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>
            <AlertCircle size={36} style={{ color: '#B42318', margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ fontSize: 20, fontWeight: 500, color: PLUM, fontFamily: "'PP Fragment', serif" }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#B42318', marginTop: 8 }}>{error}</p>
            <button onClick={() => router.push('/signup')} style={{ marginTop: 20, padding: '12px 24px', background: PLUM, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  )
}
