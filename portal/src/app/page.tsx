'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function PortalPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch(`${API_URL}/api/v1/auth/me`, { 
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleProductClick(product: 'comply' | 'finops') {
    // Check if user has active subscription for this product
    const hasSubscription = user?.subscriptions?.some((sub: any) => 
      sub.product === product && (sub.status === 'active' || sub.status === 'trialing')
    )
    
    if (hasSubscription) {
      // User has subscription, open dashboard
      if (product === 'comply') {
        window.location.href = process.env.NEXT_PUBLIC_COMPLY_URL + '/dashboard' || 'http://localhost:3001/dashboard'
      } else {
        window.location.href = process.env.NEXT_PUBLIC_FINOPS_URL + '/dashboard' || 'http://localhost:3002/dashboard'
      }
    } else {
      // User doesn't have subscription, go to subscribe page
      window.location.href = `/subscribe?product=${product}`
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B3A5C 0%, #2E5F8A 100%)'
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'white' }} />
      </div>
    )
  }
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1B3A5C 0%, #2E5F8A 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'white',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="#1B3A5C" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="#1B3A5C"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
            iFu Labs
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)' }}>
            Choose your product
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {/* Comply Card */}
          <button
            onClick={() => handleProductClick('comply')}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              background: '#E8F2EE',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
              iFu Comply
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', marginBottom: '16px' }}>
              SOC 2, ISO 27001, and GDPR compliance automation. Automated evidence collection and control monitoring.
            </p>
            {user?.subscriptions?.some((sub: any) => sub.product === 'comply' && (sub.status === 'active' || sub.status === 'trialing')) ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                color: '#1A4D3C',
                fontWeight: '500'
              }}>
                Open Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                color: '#1B3A5C',
                fontWeight: '500'
              }}>
                Subscribe to iFu Comply
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </button>

          {/* FinOps Card */}
          <button
            onClick={() => handleProductClick('finops')}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: 'none',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              background: '#EFF6FF',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>💰</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
              iFu Costless
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', marginBottom: '16px' }}>
              AWS cost optimization and waste detection. Find savings opportunities and reduce your cloud spend.
            </p>
            {user?.subscriptions?.some((sub: any) => sub.product === 'finops' && (sub.status === 'active' || sub.status === 'trialing')) ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                color: '#1D6648',
                fontWeight: '500'
              }}>
                Open Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                color: '#1B3A5C',
                fontWeight: '500'
              }}>
                Subscribe to iFu Costless
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="/onboarding"
            style={{
              fontSize: '14px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            New user? Complete setup →
          </a>
          <a
            href={process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3004'}
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none'
            }}
          >
            ← Back to website
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
