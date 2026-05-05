'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, AlertCircle, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface BillingState {
  status: 'active' | 'trialing' | 'expired'
  trialEndsAt: string | null
  trialDaysLeft: number
  hasPaymentMethod: boolean
  subscription: {
    amount?: number
    currency?: string
    nextPaymentDate?: string
    planName?: string
  } | null
}

function formatCurrency(amount?: number, currency = 'ZAR'): string {
  if (!amount) return ''
  const major = amount / 100
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(major)
  } catch {
    return `${currency} ${major.toFixed(2)}`
  }
}

function hoursLeft(endsAt: string): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60)))
}

/**
 * Top-of-dashboard banner that surfaces the trial state to every user, on
 * every page. Hidden when the org is on an active paid plan or the user
 * dismissed it for this browser session. Card-on-file is mandatory at
 * signup, so this banner only handles the auto-charge heads-up flow.
 */
export default function TrialBanner() {
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('trial-banner-dismissed') === '1') {
      setDismissed(true)
    }
    fetch(`${API_URL}/api/v1/billing`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBilling(data) })
      .catch(() => {})
  }, [])

  if (dismissed || !billing || billing.status !== 'trialing' || !billing.trialEndsAt) return null

  const hours = hoursLeft(billing.trialEndsAt)
  const isUrgent = hours <= 24

  const bg = isUrgent ? '#FEF3F2' : '#FFFAEB'
  const border = isUrgent ? '#FDA29B' : '#FEC84B'
  const fg = isUrgent ? '#B42318' : '#B54708'

  const dismiss = () => {
    sessionStorage.setItem('trial-banner-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm border-b"
      style={{ background: bg, borderColor: border, color: fg }}
      role="status"
    >
      {isUrgent ? <AlertCircle size={14} /> : <Clock size={14} />}
      <div className="flex-1 min-w-0">
        <strong>Trial ends in {hours} hour{hours !== 1 ? 's' : ''}.</strong>{' '}
        {billing.subscription?.amount
          ? `Your card will be charged ${formatCurrency(billing.subscription.amount, billing.subscription.currency)} for ${billing.subscription.planName || 'your subscription'}.`
          : 'Your card on file will be charged automatically.'}
      </div>
      <Link
        href="/dashboard/billing"
        className="px-3 py-1 rounded text-xs font-medium"
        style={{ background: fg, color: '#FFFFFF' }}
      >
        Manage
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}
