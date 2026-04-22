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
      // Auth cookie is sent automatically
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

      // Store the product info in localStorage so onboarding can redirect correctly
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_product', data.product || 'comply')
        localStorage.setItem('onboarding_plan', data.plan || 'starter')
      }

      // Redirect back to onboarding confirmation step
      // This ensures the user stays authenticated and can properly access the dashboard
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
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(20, 22, 27, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #25282F',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
      }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={48} className="animate-spin" style={{ color: '#E8820A', margin: '0 auto 24px' }} />
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: '#F5F5F5',
              marginBottom: '10px',
              fontFamily: "'Fraunces', serif",
              letterSpacing: '-0.015em'
            }}>
              Verifying payment...
            </h1>
            <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
              Please wait while we confirm your payment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(232, 130, 10, 0.12)',
              border: '1px solid rgba(232, 130, 10, 0.35)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={32} style={{ color: '#E8820A' }} />
            </div>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: '#F5F5F5',
              marginBottom: '10px',
              fontFamily: "'Fraunces', serif",
              letterSpacing: '-0.015em'
            }}>
              Payment successful
            </h1>
            <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <XCircle size={32} style={{ color: '#FCA5A5' }} />
            </div>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 500,
              color: '#F5F5F5',
              marginBottom: '10px',
              fontFamily: "'Fraunces', serif",
              letterSpacing: '-0.015em'
            }}>
              Payment failed
            </h1>
            <p style={{ fontSize: '15px', color: '#9AA0A6', marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/onboarding?step=3')}
              style={{
                padding: '12px 24px',
                background: '#E8820A',
                color: '#0B0C0F',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(232, 130, 10, 0.25)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#FF9820')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#E8820A')}
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
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9AA0A6',
        fontFamily: "'DM Sans', system-ui, sans-serif"
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#E8820A' }} />
      </div>
    }>
      <BillingCallbackContent />
    </Suspense>
  )
}
