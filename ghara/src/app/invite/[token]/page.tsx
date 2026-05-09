'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [invite, setInvite] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  useEffect(() => {
    fetch(`${API_URL}/api/v1/team/invite/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => { setInvite(data); setLoading(false) })
      .catch(() => { setError('Invalid or expired invitation'); setLoading(false) })
  }, [token, API_URL])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setAccepting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/team/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to accept invitation')
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading invitation...</div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <Link href="/login" className="text-brand hover:underline text-sm">Go to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <img src="/brand/logo.svg" alt="Ghara" className="h-8" />
        </div>

        <div className="bg-card rounded-xl border border-border p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">Join {invite?.orgName || 'the team'}</h1>
          <p className="text-sm text-muted mb-6">
            You've been invited as <strong>{invite?.role || 'member'}</strong>. Set up your account to get started.
          </p>

          <form onSubmit={handleAccept} className="space-y-4">
            {error && (
              <div className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={accepting}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {accepting ? 'Joining...' : 'Accept invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
