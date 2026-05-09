'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.auth.login({ email, password })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img src="/brand/logo.svg" alt="Ghara" className="h-8" />
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-6">Welcome back to Ghara</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link href="/forgot-password" className="text-sm text-brand hover:underline">
              Forgot password?
            </Link>
            <p className="text-sm text-muted">
              Don't have an account?{' '}
              <Link href="/signup" className="text-brand hover:underline font-medium">
                Start free trial
              </Link>
            </p>
          </div>
        </div>

        {/* iFU Labs attribution */}
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
