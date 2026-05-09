'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'

export default function TrialBanner() {
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    fetch(`${API_URL}/api/v1/billing`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.status === 'trialing') {
          setTrialDays(data.trialDaysLeft)
          setStatus('trialing')
        } else if (data?.status === 'expired') {
          setStatus('expired')
        }
      })
      .catch(() => {})
  }, [])

  if (status === 'expired') {
    return (
      <div className="px-4 py-2.5 text-center text-sm" style={{ background: '#FEF3F2', borderBottom: '1px solid rgba(180,35,24,0.15)' }}>
        <span style={{ color: '#B42318' }}>Your trial has ended. </span>
        <Link href="/billing" className="font-medium underline" style={{ color: '#B42318' }}>
          Upgrade to continue →
        </Link>
      </div>
    )
  }

  if (status === 'trialing' && trialDays !== null) {
    return (
      <div className="px-4 py-2 text-center text-sm flex items-center justify-center gap-2" style={{ background: 'rgba(138,99,230,0.06)', borderBottom: '1px solid rgba(138,99,230,0.1)' }}>
        <Clock size={14} style={{ color: '#8A63E6' }} />
        <span className="text-muted">
          {trialDays} day{trialDays !== 1 ? 's' : ''} left in your free trial.
        </span>
        <Link href="/billing" className="font-medium text-accent hover:underline">
          Upgrade →
        </Link>
      </div>
    )
  }

  return null
}
