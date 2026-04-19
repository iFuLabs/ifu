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
    const hasSubscription = user?.subscriptions?.some((sub: any) =>
      sub.product === product && (sub.status === 'active' || sub.status === 'trialing')
    )

    if (hasSubscription) {
      if (product === 'comply') {
        window.location.href = process.env.NEXT_PUBLIC_COMPLY_URL + '/dashboard' || 'http://localhost:3001/dashboard'
      } else {
        window.location.href = process.env.NEXT_PUBLIC_FINOPS_URL + '/dashboard' || 'http://localhost:3002/dashboard'
      }
    } else {
      window.location.href = `/subscribe?product=${product}`
    }
  }

  const pageBg: React.CSSProperties = {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: "'DM Sans', system-ui, sans-serif"
  }

  if (loading) {
    return (
      <div style={pageBg}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#E8820A' }} />
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  const hasComply = user?.subscriptions?.some((sub: any) => sub.product === 'comply' && (sub.status === 'active' || sub.status === 'trialing'))
  const hasFinops = user?.subscriptions?.some((sub: any) => sub.product === 'finops' && (sub.status === 'active' || sub.status === 'trialing'))

  const productCard = (
    opts: {
      product: 'comply' | 'finops',
      title: string,
      desc: string,
      hasSub: boolean,
      subLabel: string,
      icon: React.ReactNode,
    }
  ) => (
    <button
      onClick={() => handleProductClick(opts.product)}
      style={{
        background: 'rgba(20, 22, 27, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #25282F',
        borderRadius: '16px',
        padding: '32px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        color: 'inherit',
        fontFamily: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.borderColor = '#E8820A'
        e.currentTarget.style.boxShadow = '0 18px 40px rgba(0, 0, 0, 0.45), 0 0 0 3px rgba(232, 130, 10, 0.12)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#25282F'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35)'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        background: 'linear-gradient(135deg, #E8820A 0%, #C96F08 100%)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 6px 16px rgba(232, 130, 10, 0.25)'
      }}>
        {opts.icon}
      </div>
      <h2 style={{
        fontSize: '22px',
        fontWeight: 500,
        color: '#F5F5F5',
        marginBottom: '10px',
        fontFamily: "'Fraunces', serif",
        letterSpacing: '-0.02em'
      }}>
        {opts.title}
      </h2>
      <p style={{ fontSize: '14px', color: '#9AA0A6', lineHeight: 1.65, marginBottom: '20px' }}>
        {opts.desc}
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#E8820A',
        fontWeight: 600
      }}>
        {opts.hasSub ? 'Open Dashboard' : opts.subLabel}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </button>
  )

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: '900px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #E8820A 0%, #C96F08 100%)',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(232, 130, 10, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Choose your product
          </h1>
          <p style={{ fontSize: '15px', color: '#9AA0A6' }}>
            Pick a workspace to continue
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {productCard({
            product: 'comply',
            title: 'iFu Comply',
            desc: 'SOC 2, ISO 27001, and GDPR compliance automation. Automated evidence collection and control monitoring.',
            hasSub: !!hasComply,
            subLabel: 'Subscribe to iFu Comply',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            )
          })}

          {productCard({
            product: 'finops',
            title: 'iFu Costless',
            desc: 'AWS cost optimization and waste detection. Find savings opportunities and reduce your cloud spend.',
            hasSub: !!hasFinops,
            subLabel: 'Subscribe to iFu Costless',
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v22"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <a
            href="/onboarding"
            style={{
              fontSize: '14px',
              color: '#E8820A',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            New user? Complete setup →
          </a>
          <a
            href={process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3004'}
            style={{
              fontSize: '13px',
              color: '#6B7078',
              textDecoration: 'none'
            }}
          >
            ← Back to website
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
