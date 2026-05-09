'use client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-lg text-center">
        <img src="/brand/logo.svg" alt="Ghara" className="h-8 mx-auto mb-8" />

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="text-2xl font-semibold text-ink mb-2">Welcome to Ghara</h1>
          <p className="text-muted text-sm mb-6">
            Your 7-day free trial is active. Let's connect your AWS account to get started.
          </p>
          <p className="text-xs text-muted mb-6">
            Full onboarding wizard coming in Phase 5.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          by{' '}
          <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
            <img src="/brand/ifulabs-logo.svg" alt="iFU Labs" className="h-3 inline" />
          </a>
        </p>
      </div>
    </div>
  )
}
