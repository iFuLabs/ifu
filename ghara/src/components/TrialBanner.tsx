'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, AlertCircle } from 'lucide-react'

export default function TrialBanner() {
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [pastDue, setPastDue] = useState<{ inGrace: boolean; graceDaysRemaining: number } | null>(null)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    fetch(`${API_URL}/api/v1/billing`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setStatus(data.status)
        if (data.status === 'trialing') setTrialDays(data.trialDaysLeft)
        if (data.status === 'past_due') setPastDue(data.pastDue || { inGrace: false, graceDaysRemaining: 0 })
      })
      .catch(() => {})
  }, [])

  // Past-due banner has highest priority — it always shows so the customer
  // can fix their card before access is paused
  if (status === 'past_due' && pastDue) {
    return (
      <div className="px-4 py-2.5 text-center text-sm flex items-center justify-center gap-2" style={{ background: '#FEF2F2', borderBottom: '1px solid rgba(185,28,28,0.15)' }}>
        <AlertCircle size={14} style={{ color: '#B91C1C' }} />
        <span style={{ color: '#B91C1C' }}>
          {pastDue.inGrace
            ? `Payment failed — ${pastDue.graceDaysRemaining} day${pastDue.graceDaysRemaining === 1 ? '' : 's'} to update your card.`
            : 'Access paused — payment failed.'}
        </span>
        <Link href="/billing" className="font-medium underline" style={{ color: '#B91C1C' }}>
          Fix payment →
        </Link>
      </div>
    )
  }

  // Don't show banner in the first 5 days — let them use the product in peace
  if (status === 'trialing' && trialDays !== null && trialDays > 2) {
    return null
  }

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

  // Only show on last 2 days
  if (status === 'trialing' && trialDays !== null && trialDays <= 2) {
    return (
      <div className="px-4 py-2 text-center text-sm flex items-center justify-center gap-2" style={{ background: 'rgba(138,99,230,0.06)', borderBottom: '1px solid rgba(138,99,230,0.1)' }}>
        <Clock size={14} style={{ color: '#8A63E6' }} />
        <span className="text-muted">
          Your card will be charged in {trialDays} day{trialDays !== 1 ? 's' : ''}.
        </span>
        <Link href="/billing" className="font-medium text-accent hover:underline">
          Manage →
        </Link>
      </div>
    )
  }

  return null
}
