'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'

const PAGE_BG: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, ' + LAVENDER + ' 0%, #FFFFFF 60%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "'Aeonik', 'DM Sans', system-ui, sans-serif"
}

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
      setMessage('Payment successful! Redirecting to confirmation...')

      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_product', data.product || 'comply')
        localStorage.setItem('onboarding_plan', data.plan || 'starter')
      }

      setTimeout(() => {
        window.location.href = '/onboarding?step=4'
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
    <div style={PAGE_BG}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid ' + BORDER,
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 12px 48px rgba(51, 6, 61, 0.12)'
      }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={48} className="animate-spin" style={{ color: IRIS, margin: '0 auto 24px' }} />
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: PLUM,
              marginBottom: '10px',
              fontFamily: "'PP Fragment', serif",
              letterSpacing: '-0.015em'
            }}>
              Verifying payment...
            </h1>
            <p style={{ fontSize: '15px', color: MUTED }}>
              Please wait while we confirm your payment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: LAVENDER,
              border: '1px solid rgba(138, 99, 230, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={32} style={{ color: PLUM }} />
            </div>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: PLUM,
              marginBottom: '10px',
              fontFamily: "'PP Fragment', serif",
              letterSpacing: '-0.015em'
            }}>
              Payment successful
            </h1>
            <p style={{ fontSize: '15px', color: MUTED }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <XCircle size={32} style={{ color: '#B91C1C' }} />
            </div>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: PLUM,
              marginBottom: '10px',
              fontFamily: "'PP Fragment', serif",
              letterSpacing: '-0.015em'
            }}>
              Payment failed
            </h1>
            <p style={{ fontSize: '15px', color: MUTED, marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/onboarding?step=3')}
              style={{
                padding: '12px 24px',
                background: PLUM,
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(51, 6, 61, 0.22)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = IRIS)}
              onMouseOut={(e) => (e.currentTarget.style.background = PLUM)}
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
    <Suspense fallback={
      <div style={PAGE_BG}>
        <Loader2 size={32} className="animate-spin" style={{ color: IRIS }} />
      </div>
    }>
      <BillingCallbackContent />
    </Suspense>
  )
}
