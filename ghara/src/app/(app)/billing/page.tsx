'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, CreditCard, Loader2, ArrowUpRight, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const PLANS = [
  {
    id: 'ghara-starter',
    name: 'Starter',
    price: '$499',
    period: '/mo',
    spend: 'Up to $10k/mo AWS spend',
    features: [
      'SOC 2 framework',
      'Basic cost waste detection',
      'Weekly scans',
      '1 AWS account',
      'Email support',
    ],
  },
  {
    id: 'ghara-growth',
    name: 'Growth',
    price: '$1,299',
    period: '/mo',
    spend: 'Up to $100k/mo AWS spend',
    popular: true,
    features: [
      'All frameworks (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS)',
      'AI evidence & remediation',
      'Vendor risk management',
      'Anomaly detection',
      'Kubernetes cost (OpenCost)',
      'Slack integration & drift alerts',
      'Daily scans',
      'CSV/JSON export',
    ],
  },
  {
    id: 'ghara-scale',
    name: 'Scale',
    price: 'Custom',
    period: '',
    spend: 'Unlimited AWS spend',
    features: [
      'Everything in Growth',
      'Custom frameworks',
      'Multi-account AWS',
      'SSO / SAML',
      'Auditor read-only role',
      'Dedicated CSM',
      'Priority support',
      'FOCUS export',
    ],
  },
]

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/billing`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setBilling(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (planId === 'ghara-scale') {
      // Scale tier = sales-led
      window.open('mailto:info@ifulabs.com?subject=Ghara Scale tier inquiry', '_blank')
      return
    }

    setUpgrading(planId)
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.message || 'Failed to start checkout')
        return
      }
      const data = await res.json()
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      alert(err.message || 'Something went wrong')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-2">Billing</h1>

      {/* Current status */}
      {billing && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-ink">
                  Current plan: <span className="capitalize">{billing.plan || 'None'}</span>
                </span>
                <StatusBadge status={billing.status} />
              </div>
              {billing.status === 'trialing' && billing.trialDaysLeft > 0 && (
                <p className="text-sm text-muted">
                  {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''} remaining in your trial
                </p>
              )}
              {billing.status === 'expired' && (
                <p className="text-sm text-danger">
                  Your trial has ended. Upgrade below to restore full access.
                </p>
              )}
              {billing.status === 'active' && billing.subscription && (
                <p className="text-sm text-muted">
                  Next payment: {billing.subscription.amount ? `${billing.subscription.currency} ${(billing.subscription.amount / 100).toFixed(0)}` : ''} on {billing.subscription.nextPaymentDate ? new Date(billing.subscription.nextPaymentDate).toLocaleDateString() : '—'}
                </p>
              )}
            </div>
            {billing.status === 'active' && (
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the current billing period.')) return
                  await fetch(`${API_URL}/api/v1/billing/cancel`, { method: 'POST', credentials: 'include' })
                  window.location.reload()
                }}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = billing?.plan === plan.id.replace('ghara-', '')
          return (
            <div
              key={plan.id}
              className={clsx(
                'bg-card rounded-xl border p-6 flex flex-col',
                plan.popular ? 'border-accent shadow-sm' : 'border-border'
              )}
            >
              {plan.popular && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full self-start mb-3" style={{ background: '#DAC0FD', color: '#33063D' }}>
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1 mb-1">
                <span className="font-mono text-2xl font-semibold text-ink">{plan.price}</span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>
              <p className="text-xs text-muted mb-4">{plan.spend}</p>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted">
                    <CheckCircle size={14} className="text-accent mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="py-2.5 rounded-lg text-center text-sm font-medium" style={{ background: 'rgba(138,99,230,0.08)', color: '#8A63E6' }}>
                  Current plan
                </div>
              ) : plan.id === 'ghara-scale' ? (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className="py-2.5 rounded-lg border border-border text-sm font-medium text-ink hover:bg-surface transition-colors"
                >
                  Talk to us
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading === plan.id}
                  className="py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#33063D' }}
                >
                  {upgrading === plan.id && <Loader2 size={14} className="animate-spin" />}
                  {billing?.status === 'trialing' || billing?.status === 'expired' ? 'Upgrade' : 'Switch plan'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#ECFDF3', text: '#067647', label: 'Active' },
    trialing: { bg: 'rgba(138,99,230,0.08)', text: '#8A63E6', label: 'Trial' },
    expired: { bg: '#FEF3F2', text: '#B42318', label: 'Expired' },
    cancelled: { bg: '#F8F7FA', text: 'rgba(51,6,61,0.65)', label: 'Cancelled' },
  }
  const c = config[status] || config.expired
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  )
}
