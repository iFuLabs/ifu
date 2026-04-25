'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'

const PAGE_BG: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, ' + LAVENDER + ' 0%, #FFFFFF 60%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "'Aeonik', 'DM Sans', system-ui, sans-serif"
}

function SubscribeForm() {
  const searchParams = useSearchParams()
  const product = searchParams.get('product') || 'comply'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>(
    product === 'finops' ? 'finops' : 'comply-starter'
  )

  const plans = product === 'comply' ? [
    {
      id: 'comply-starter',
      name: 'iFu Comply Starter',
      price: 299,
      description: 'Essential compliance monitoring',
      features: [
        'SOC 2 Type II compliance',
        'ISO 27001 controls',
        'GDPR compliance',
        'Automated evidence collection',
        'Up to 50 controls',
        'Email support'
      ]
    },
    {
      id: 'comply-growth',
      name: 'iFu Comply Growth',
      price: 799,
      description: 'Advanced compliance features',
      features: [
        'Everything in Starter',
        'HIPAA compliance',
        'PCI DSS compliance',
        'Custom frameworks',
        'Unlimited controls',
        'Priority support',
        'Dedicated CSM'
      ]
    }
  ] : [
    {
      id: 'finops',
      name: 'iFu Costless',
      price: 199,
      description: 'AWS cost optimization',
      features: [
        'Cost anomaly detection',
        'Waste identification',
        'Savings recommendations',
        'Budget alerts',
        'Multi-account support',
        'Email support'
      ]
    }
  ]

  async function handleSubscribe() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/billing/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: selectedPlan })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Failed to initialize payment')
      }

      const data = await res.json()
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
      setLoading(false)
    }
  }

  const productName = product === 'comply' ? 'iFu Comply' : 'iFu Costless'

  return (
    <div style={PAGE_BG}>
      <div style={{ maxWidth: '900px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
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
            Subscribe to {productName}
          </h1>
          <p style={{ fontSize: '15px', color: MUTED }}>
            Choose your plan and start your 3-day free trial
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: product === 'comply' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
          gap: '20px',
          marginBottom: '28px'
        }}>
          {plans.map(plan => {
            const active = selectedPlan === plan.id
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  background: '#FFFFFF',
                  border: active ? '1px solid ' + IRIS : '1px solid ' + BORDER,
                  boxShadow: active ? '0 0 0 3px rgba(138, 99, 230, 0.15), 0 12px 32px rgba(51, 6, 61, 0.12)' : '0 12px 32px rgba(51, 6, 61, 0.08)',
                  borderRadius: '16px',
                  padding: '32px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '24px',
                    height: '24px',
                    background: IRIS,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(138, 99, 230, 0.35)'
                  }}>
                    <CheckCircle size={16} style={{ color: '#FFFFFF' }} />
                  </div>
                )}

                <h3 style={{
                  fontSize: '22px',
                  fontWeight: 500,
                  color: PLUM,
                  marginBottom: '10px',
                  fontFamily: "'PP Fragment', serif",
                  letterSpacing: '-0.015em'
                }}>
                  {plan.name}
                </h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 600, color: PLUM, fontFamily: "'Aeonik Fono', 'DM Mono', monospace" }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: MUTED }}>/month</span>
                </div>

                <p style={{ fontSize: '14px', color: MUTED, marginBottom: '22px' }}>
                  {plan.description}
                </p>

                <div style={{ borderTop: '1px solid ' + BORDER, paddingTop: '20px' }}>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                      fontSize: '14px',
                      color: PLUM
                    }}>
                      <CheckCircle size={16} style={{ color: IRIS, flexShrink: 0 }} />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          background: LAVENDER,
          border: '1px solid ' + BORDER,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#FFFFFF',
            border: '1px solid rgba(51, 6, 61, 0.12)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: PLUM
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15 8l6 1-4.5 4.4L18 20l-6-3-6 3 1.5-6.6L3 9l6-1z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: PLUM, marginBottom: '4px' }}>
              3-day free trial included
            </div>
            <div style={{ fontSize: '13px', color: MUTED }}>
              Your card will be charged after the trial period ends. Cancel anytime.
            </div>
          </div>
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
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
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
            marginBottom: '18px',
            boxShadow: loading ? 'none' : '0 6px 16px rgba(51, 6, 61, 0.22)'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.background = IRIS)}
          onMouseOut={(e) => !loading && (e.currentTarget.style.background = PLUM)}
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Processing...</>
          ) : (
            <>Continue to payment <ArrowRight size={18} /></>
          )}
        </button>

        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{
              fontSize: '13px',
              color: SUBTLE,
              textDecoration: 'none'
            }}
          >
            ← Back to products
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

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div style={PAGE_BG}>
        <Loader2 size={32} className="animate-spin" style={{ color: IRIS }} />
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    }>
      <SubscribeForm />
    </Suspense>
  )
}
