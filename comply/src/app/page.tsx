'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // In local dev, just redirect to dashboard
    // In production, this would check Auth0 authentication
    router.push('/dashboard')
  }, [router])

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: '#f8f9fa'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '16px',
          animation: 'spin 1s linear infinite'
        }}>
          ⚡
        </div>
        <p style={{ color: '#666', fontSize: '14px' }}>Redirecting to dashboard...</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
