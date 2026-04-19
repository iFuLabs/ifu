'use client'
import { useState, useEffect } from 'react'
import { CreditCard, Calendar, Download, ExternalLink, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Helper to get auth headers
function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

interface BillingData {
  plan: string
  status: 'active' | 'trialing' | 'expired'
  trialEndsAt: string | null
  trialDaysLeft: number
  hasPaymentMethod: boolean
  subscription: {
    code: string
    status: string
    nextPaymentDate: string
    planName: string
    amount: number
    currency: string
  } | null
}

const PLAN_PRICES: Record<string, number> = {
  starter: 299,
  growth: 799
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBilling()
  }, [])

  async function fetchBilling() {
    try {
      const res = await fetch(`${API_URL}/api/v1/billing`, { 
        credentials: 'include',
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || `Failed to load billing (${res.status})`)
      }
      const data = await res.json()
      
      // Check if user has Comply subscription
      const hasComplyAccess = data.plan === 'starter' || data.plan === 'growth'
      if (!hasComplyAccess) {
        setError(`You don't have an active iFu Comply subscription. Your current plan is: ${data.plan === 'finops' ? 'iFu Costless' : 'None'}`)
      }
      
      setBilling(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddPayment(plan: string) {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error)
      }
      await fetchBilling()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  const planPrice = PLAN_PRICES[billing?.plan || 'starter'] || 299
  const statusLabel = billing?.status === 'active' ? 'Active'
    : billing?.status === 'trialing' ? 'Trial'
    : 'Expired'
  const statusColor = billing?.status === 'active' ? 'bg-green-100 text-green-700'
    : billing?.status === 'trialing' ? 'bg-accent-light text-accent'
    : 'bg-danger/10 text-danger'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Billing</h1>
        <p className="text-sm text-muted mt-0.5">Manage your subscription and billing</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Current plan */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-ink mb-1">Current Plan</h2>
            <p className="text-xs text-muted">
              {billing?.subscription?.planName || `iFu Comply ${(billing?.plan || 'starter').charAt(0).toUpperCase() + (billing?.plan || 'starter').slice(1)}`}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-mono ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-mono text-3xl font-medium text-ink">${planPrice}</span>
          <span className="text-sm text-muted">/month</span>
        </div>

        {/* Trial active with card */}
        {billing?.status === 'trialing' && billing.hasPaymentMethod && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-muted mb-3">
              <Calendar size={14} />
              <span>Trial ends in {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-4 py-3 bg-accent-light border border-accent/20 rounded-lg text-sm text-accent">
              Your card will be charged automatically when the trial ends.
            </div>
          </div>
        )}

        {/* Trial active without card */}
        {billing?.status === 'trialing' && !billing.hasPaymentMethod && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-muted mb-3">
              <Calendar size={14} />
              <span>Trial ends in {billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-warn/10 border border-warn/20 rounded-lg text-sm text-warn mb-4">
              <AlertCircle size={14} />
              <span>Add a payment method to continue after your trial ends.</span>
            </div>
          </div>
        )}

        {/* Active subscription */}
        {billing?.subscription?.nextPaymentDate && billing.status === 'active' && (
          <div className="flex items-center gap-2 text-xs text-muted mb-6">
            <Calendar size={14} />
            <span>Next payment: {new Date(billing.subscription.nextPaymentDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Trial expired */}
        {billing?.status === 'expired' && (
          <div className="flex items-center gap-2 text-xs text-danger mb-6">
            <AlertCircle size={14} />
            <span>Your trial has ended. {billing.hasPaymentMethod ? 'Subscribe to continue.' : 'Add a payment method to continue.'}</span>
          </div>
        )}

        {/* Action buttons based on status */}
        {billing?.status === 'trialing' && billing.hasPaymentMethod ? (
          // Trial with card - show manage option
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="px-4 py-2 border border-border text-muted text-sm rounded-lg hover:text-ink hover:bg-bg transition-all disabled:opacity-50"
          >
            Manage payment method
          </button>
        ) : billing?.status === 'trialing' && !billing.hasPaymentMethod ? (
          // Trial without card - show add payment with plan options
          <div className="flex gap-2">
            <button
              onClick={() => handleAddPayment('comply-starter')}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-mid transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Redirecting...' : 'Add card — iFu Comply Starter $299/mo'}
            </button>
            <button
              onClick={() => handleAddPayment('comply-growth')}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 border border-accent text-accent text-sm rounded-lg hover:bg-accent-light transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Redirecting...' : 'Add card — iFu Comply Growth $799/mo'}
            </button>
          </div>
        ) : billing?.status === 'active' && billing.subscription ? (
          // Active subscription - show cancel
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="px-4 py-2 border border-danger/30 text-danger text-sm rounded-lg hover:bg-danger/5 transition-all disabled:opacity-50"
          >
            {actionLoading ? 'Cancelling...' : 'Cancel subscription'}
          </button>
        ) : billing?.status === 'expired' ? (
          // Expired - show subscribe with plan options
          <div className="flex gap-2">
            <button
              onClick={() => handleAddPayment('comply-starter')}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-mid transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Redirecting...' : 'Subscribe — iFu Comply Starter $299/mo'}
            </button>
            <button
              onClick={() => handleAddPayment('comply-growth')}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 border border-accent text-accent text-sm rounded-lg hover:bg-accent-light transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Redirecting...' : 'Subscribe — iFu Comply Growth $799/mo'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Payment method */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-ink mb-4">Payment Method</h2>
        <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-lg">
          <CreditCard size={20} className="text-muted" />
          <div className="flex-1">
            {billing?.hasPaymentMethod ? (
              <>
                <div className="flex items-center gap-2 text-sm text-ink">
                  <CheckCircle size={14} className="text-green-600" />
                  Card on file
                </div>
                <div className="text-xs text-muted">Managed via Paystack</div>
              </>
            ) : (
              <>
                <div className="text-sm text-ink">No payment method</div>
                <div className="text-xs text-muted">Add a card to continue after trial</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-ink">Billing History</h2>
        </div>
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-muted">No invoices yet</p>
          <p className="text-xs text-muted mt-1">Your first invoice will appear after your trial ends</p>
        </div>
      </div>
    </div>
  )
}
