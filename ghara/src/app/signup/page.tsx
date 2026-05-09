'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !orgName.trim()) {
      setError('Email, password, and company name are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.auth.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        orgName: orgName.trim(),
        role: role || undefined,
      })
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <img src="/brand/logo.svg" alt="Ghara" className="h-8" />
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">Start your free trial</h1>
          <p className="text-sm text-muted mb-6">7 days of full access. No credit card required.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Company name</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Inc"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Your role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                <option value="">Select...</option>
                <option value="cto">CTO / VP Engineering</option>
                <option value="engineering">Engineering</option>
                <option value="compliance">Compliance / GRC</option>
                <option value="founder">Founder / CEO</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: '#33063D' }}
            >
              {loading ? 'Creating account...' : 'Start free trial'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
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
