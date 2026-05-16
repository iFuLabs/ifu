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
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/v1/billing`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([billingData, meData]) => {
      setBilling(billingData)
      setMe(meData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const isOwner = me?.user?.role === 'owner'

  const handlePayNow = async (planOverride?: string) => {
    const isUpgrade = !!planOverride
    const confirmMsg = isUpgrade
      ? 'Charge your card now and switch to this plan? Your card will be billed for the new plan immediately.'
      : 'Charge your card now and end your trial early? Your card will be billed for the current plan immediately.'
    if (!confirm(confirmMsg)) return
    setUpgrading(planOverride || 'pay-now')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/charge-now`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planOverride ? { plan: planOverride } : {}),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Payment failed')
        return
      }
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Something went wrong')
    } finally {
      setUpgrading(null)
    }
  }

  const handleRetryPayment = async () => {
    if (!confirm('Retry charging your card?')) return
    setUpgrading('retry')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/retry-payment`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Payment failed')
        return
      }
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Something went wrong')
    } finally {
      setUpgrading(null)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === 'ghara-scale') {
      // Scale tier = sales-led
      window.open('mailto:caleb.ackom@ifulabs.com?subject=Ghara Scale tier inquiry', '_blank')
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

      {/* Past-due banner — shown when payment failed; gives the customer a clear
          CTA to fix things before the grace window runs out. */}
      {billing?.status === 'past_due' && (
        <div
          className="rounded-xl border p-4 mb-4 flex items-start gap-3"
          style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}
        >
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#B91C1C' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>
              Payment failed
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(185,28,28,0.85)' }}>
              {billing.pastDue?.inGrace
                ? `We could not charge your card. You have ${billing.pastDue.graceDaysRemaining} day${billing.pastDue.graceDaysRemaining === 1 ? '' : 's'} to update your payment method before access is paused.`
                : 'Your grace period has ended and access has been paused. Update your payment method and retry to restore access.'}
            </p>
            {isOwner && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRetryPayment}
                  disabled={upgrading === 'retry'}
                  className="px-4 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#B91C1C' }}
                >
                  {upgrading === 'retry' && <Loader2 size={12} className="animate-spin" />}
                  Retry payment
                </button>
                <button
                  onClick={() => handleUpgrade(billing.tier ? `ghara-${billing.tier}` : 'ghara-starter')}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: '#FCA5A5', color: '#B91C1C', background: '#FFFFFF' }}
                >
                  Update card
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AWS spend cap banner — soft enforcement only, suggests upgrade */}
      {billing?.spendWarning && billing.status !== 'trialing' && (
        <div
          className="rounded-xl border p-4 mb-4 flex items-start gap-3"
          style={{ borderColor: '#FCD34D', background: '#FFFBEB' }}
        >
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#92400E' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>
              Your AWS spend (${billing.spendWarning.monthlyCost.toLocaleString()}/mo) is{' '}
              {billing.spendWarning.overagePct}% above the {billing.spendWarning.tier} plan limit
              (${billing.spendWarning.cap.toLocaleString()}/mo)
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(146,64,14,0.8)' }}>
              Consider upgrading to {billing.spendWarning.suggestedTier === 'scale' ? 'Scale' : 'Growth'} for the right level of support and scan capacity.
            </p>
          </div>
        </div>
      )}

      {/* Current status */}
      {billing && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-ink">
                  Current plan: <span className="capitalize">
                    {billing.status === 'trialing'
                      ? `${billing.selectedTier || (typeof billing.plan === 'string' && billing.plan.includes('growth') ? 'growth' : 'starter')} (trial)`
                      : (billing.tier || (typeof billing.plan === 'string' ? billing.plan.replace('ghara_', '').replace('_trial', '') : 'None'))}
                  </span>
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
            {billing.status === 'active' && isOwner && (
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
          // Resolve the customer's tier:
          // - During trial: prefer selectedTier (what they picked at signup); if missing,
          //   fall back to tier on the row (which should reflect the Paystack plan they
          //   were assigned), then plan name parsing as a final fallback.
          // - When active/expired: use tier from subscription (what they're paying for)
          const trialTier = billing?.selectedTier
            || (billing?.tier && billing.tier !== 'growth' ? billing.tier : null) // tier=growth during trial isn't authoritative
            || (typeof billing?.plan === 'string' && billing.plan.includes('growth') ? 'growth' : null)
            || (typeof billing?.plan === 'string' && billing.plan.includes('scale') ? 'scale' : null)
            || 'starter'
          const customerTier = billing?.status === 'trialing'
            ? trialTier
            : (billing?.tier || billing?.plan || null)

          const planTier = plan.id.replace('ghara-', '') // 'starter' | 'growth' | 'scale'
          const tierRank: Record<string, number> = { starter: 1, growth: 2, scale: 3 }
          const customerRank = customerTier ? (tierRank[customerTier] || 0) : 0
          const planRank = tierRank[planTier] || 0

          const isCurrent = customerTier === planTier
          const isUpgrade = planRank > customerRank
          const isDowngrade = planRank < customerRank && customerRank > 0

          // Trial Starter on Growth = "Upgrade", Trial Starter on Starter = "Pay now"
          // Trial Growth on Starter = "Downgrade", Trial Growth on Growth = "Pay now"
          // Active anything on same tier = "Current plan"
          const isTrialing = billing?.status === 'trialing'
          let ctaLabel: string
          if (isCurrent && isTrialing) {
            ctaLabel = 'Pay now'
          } else if (isCurrent) {
            ctaLabel = 'Current plan'
          } else if (plan.id === 'ghara-scale') {
            ctaLabel = 'Talk to us'
          } else if (isUpgrade) {
            ctaLabel = 'Upgrade'
          } else if (isDowngrade) {
            ctaLabel = 'Downgrade'
          } else {
            ctaLabel = 'Switch plan'
          }

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

              {isCurrent && !isTrialing ? (
                <div className="py-2.5 rounded-lg text-center text-sm font-medium" style={{ background: 'rgba(138,99,230,0.08)', color: '#8A63E6' }}>
                  Current plan
                </div>
              ) : plan.id === 'ghara-scale' ? (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className="py-2.5 rounded-lg border border-border text-sm font-medium text-ink hover:bg-surface transition-colors"
                >
                  {ctaLabel}
                </button>
              ) : isOwner ? (
                <button
                  onClick={() => {
                    // Trial customer with card on file → use charge-now
                    // (paying their current tier or switching tier without re-tokenizing).
                    if (isTrialing && billing?.hasPaymentMethod) {
                      handlePayNow(isCurrent ? undefined : plan.id)
                    } else {
                      handleUpgrade(plan.id)
                    }
                  }}
                  disabled={upgrading === plan.id || (isCurrent && isTrialing && upgrading === 'pay-now')}
                  className={clsx(
                    'py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                    isDowngrade
                      ? 'border border-border text-ink hover:bg-surface'
                      : 'text-white'
                  )}
                  style={isDowngrade ? undefined : { background: '#33063D' }}
                >
                  {(upgrading === plan.id || (isCurrent && isTrialing && upgrading === 'pay-now')) && <Loader2 size={14} className="animate-spin" />}
                  {ctaLabel}
                </button>
              ) : (
                <div className="py-2.5 rounded-lg text-center text-xs text-muted border border-border">
                  Contact your owner to upgrade
                </div>
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
    past_due: { bg: '#FEF2F2', text: '#B91C1C', label: 'Past due' },
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
