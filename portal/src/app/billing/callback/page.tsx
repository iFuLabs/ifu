'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function BillingCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const reference = searchParams.get('reference')
    
    if (!reference) {
      setStatus('error')
      setMessage('Missing payment reference')
      return
    }

    verifyPayment(reference)
  }, [searchParams])

  async function verifyPayment(reference: string) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(`${API_URL}/api/v1/billing/verify?reference=${encodeURIComponent(reference)}`, {
        credentials: 'include',
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || error.error || 'Payment verification failed')
      }

      const data = await response.json()

      setStatus('success')
      setMessage('Payment successful! Redirecting...')

      // Redirect to onboarding confirm step with plan info
      setTimeout(() => {
        const plan = data.plan || 'finops'
        const planName = data.planName || 'FinOps'
        router.push(`/onboarding?step=4&plan=${plan}&planName=${encodeURIComponent(planName)}`)
      }, 2000)

    } catch (err: any) {
      setStatus('error')
      if (err.name === 'AbortError') {
        setMessage('Verification timed out. Please try again or contact support if you were charged.')
      } else {
        setMessage(err.message || 'Failed to verify payment')
      }
    } finally {
      clearTimeout(timeoutId)
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
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'white',
        border: '1px solid #E0DDD5',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center'
      }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={48} className="animate-spin" style={{ color: '#1B3A5C', margin: '0 auto 24px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1A1917', marginBottom: '8px' }}>
              Verifying payment...
            </h1>
            <p style={{ fontSize: '15px', color: '#6B685F' }}>
              Please wait while we confirm your payment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#EAF3EE',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={32} style={{ color: '#1D6648' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1A1917', marginBottom: '8px' }}>
              Payment successful!
            </h1>
            <p style={{ fontSize: '15px', color: '#6B685F' }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#FEE2E2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <XCircle size={32} style={{ color: '#991B1B' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1A1917', marginBottom: '8px' }}>
              Payment failed
            </h1>
            <p style={{ fontSize: '15px', color: '#6B685F', marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/onboarding?step=3')}
              style={{
                padding: '12px 24px',
                background: '#1B3A5C',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
          </>
        )}
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

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <BillingCallbackContent />
    </Suspense>
  )
}
