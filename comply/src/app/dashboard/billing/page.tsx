'use client'
import { CreditCard, Calendar, Download, ExternalLink } from 'lucide-react'

export default function BillingPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Billing</h1>
        <p className="text-sm text-muted mt-0.5">Manage your subscription and billing</p>
      </div>

      {/* Current plan */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-ink mb-1">Current Plan</h2>
            <p className="text-xs text-muted">You're on the Starter plan</p>
          </div>
          <span className="text-xs px-3 py-1 bg-accent-light text-accent rounded-full font-mono">Trial</span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-mono text-3xl font-medium text-ink">$299</span>
          <span className="text-sm text-muted">/month</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted mb-6">
          <Calendar size={14} />
          <span>Trial ends in 14 days</span>
        </div>

        <button className="w-full px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-mid transition-all">
          Upgrade plan
        </button>
      </div>

      {/* Payment method */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-ink mb-4">Payment Method</h2>
        <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-lg">
          <CreditCard size={20} className="text-muted" />
          <div className="flex-1">
            <div className="text-sm text-ink">No payment method</div>
            <div className="text-xs text-muted">Add a card to continue after trial</div>
          </div>
          <button className="text-xs text-accent hover:underline">Add card</button>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-ink">Billing History</h2>
        </div>
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-muted">No invoices yet</p>
          <p className="text-xs text-muted mt-1">Your first invoice will appear here after your trial ends</p>
        </div>
      </div>
    </div>
  )
}
