'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.authenticated) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="animate-pulse text-muted text-sm">Loading...</div>
    </div>
  )
}
