'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'

/**
 * This page is hit after Auth0 redirects back to the app.
 * It checks whether the user has completed onboarding and
 * redirects them to the right place.
 */
export default function AuthCallbackPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return

    api.auth.me()
      .then(me => {
        if (me.onboarded) {
          router.replace('/dashboard')
        } else {
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        // If API is unreachable, go to dashboard anyway and let it handle it
        router.replace('/dashboard')
      })
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 18 18" fill="none" className="w-5 h-5">
            <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
            <circle cx="9" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>
        <Loader2 size={18} className="text-muted animate-spin" />
        <p className="text-sm text-muted">Signing you in...</p>
      </div>
    </div>
  )
}
