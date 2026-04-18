'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Failed to initialize payment')
      }

      const data = await res.json()
      
      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
      setLoading(false)
    }
  }

  const productName = product === 'comply' ? 'iFu Comply' : 'iFu Costless'
  const productEmoji = product === 'comply' ? '🛡️' : '💰'

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
      <div style={{ maxWidth: '900px', width: '100%' }}>
        
        {/* Header */}
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
            <span style={{ fontSize: '32px' }}>{productEmoji}</span>
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            color: '#1A1917', 
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Subscribe to {productName}
          </h1>
          <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
            Choose your plan and start your 3-day free trial
          </p>
        </div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: product === 'comply' ? 'repeat(2, 1fr)' : '1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                background: 'white',
                border: selectedPlan === plan.id ? '2px solid #1B3A5C' : '1px solid #E0DDD5',
                borderRadius: '16px',
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {selectedPlan === plan.id && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  background: '#1B3A5C',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={16} style={{ color: 'white' }} />
                </div>
              )}
              
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#1A1917', 
                marginBottom: '8px',
                fontFamily: "'Fraunces', serif"
              }}>
                {plan.name}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', color: '#1B3A5C', fontFamily: "'DM Mono', monospace" }}>
                  ${plan.price}
                </span>
                <span style={{ fontSize: '14px', color: '#6B685F' }}>/month</span>
              </div>
              
              <p style={{ fontSize: '14px', color: '#6B685F', marginBottom: '24px' }}>
                {plan.description}
              </p>
              
              <div style={{ borderTop: '1px solid #E0DDD5', paddingTop: '20px' }}>
                {plan.features.map((feature, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#1A1917'
                  }}>
                    <CheckCircle size={16} style={{ color: '#1D6648', flexShrink: 0 }} />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trial info */}
        <div style={{
          background: 'white',
          border: '1px solid #E0DDD5',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#F3E8FF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '20px' }}>🎉</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1917', marginBottom: '4px' }}>
                3-day free trial included
              </div>
              <div style={{ fontSize: '13px', color: '#6B685F' }}>
                Your card will be charged after the trial period ends. Cancel anytime.
              </div>
            </div>
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

        {/* Subscribe button */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? '#6B685F' : '#1B3A5C',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginBottom: '16px'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
          onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Processing...</>
          ) : (
            <>Continue to payment <ArrowRight size={20} /></>
          )}
        </button>

        {/* Back link */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{
              fontSize: '14px',
              color: '#6B685F',
              textDecoration: 'none'
            }}
          >
            ← Back to products
          </a>
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

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#FAFAF8'
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#1B3A5C' }} />
      </div>
    }>
      <SubscribeForm />
    </Suspense>
  )
}
