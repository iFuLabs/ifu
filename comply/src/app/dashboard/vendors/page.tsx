'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Plus, Building2, AlertTriangle, CheckCircle, Clock, Trash2, Pencil, X, ExternalLink } from 'lucide-react'
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import clsx from 'clsx'

const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const
const CATEGORIES = ['Infrastructure', 'Auth & Identity', 'Payments', 'Analytics', 'Communication', 'Storage', 'Monitoring', 'Other']

const RISK_COLORS = {
  critical: 'text-danger bg-danger/10 border-danger/20',
  high:     'text-orange-600 bg-orange-50 border-orange-200',
  medium:   'text-warn bg-warn/10 border-warn/20',
  low:      'text-muted bg-border border-border',
}

export default function VendorsPage() {
  const { data, isLoading, mutate } = useSWR('vendors', () =>
    fetch('/api/v1/vendors').then(r => r.json())
  )
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filter, setFilter] = useState('')

  const vendors = data?.vendors || []
  const stats = data?.stats || {}

  const filtered = vendors.filter((v: any) =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase()) || v.category?.toLowerCase().includes(filter.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your vendor list?`)) return
    await fetch(`/api/v1/vendors/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Vendor Risk</h1>
          <p className="text-sm text-muted mt-0.5">Track third-party vendors and their compliance certifications.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-accent text-white rounded hover:bg-accent/90 transition-all"
        >
          <Plus size={14} />
          Add vendor
        </button>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Vendors" value={stats.total} color="text-ink" />
          <StatCard label="Critical Risk" value={stats.critical} color="text-danger" />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} color="text-warn" />
          <StatCard label="Expired Certs" value={stats.expired} color="text-danger" />
        </div>
      )}

      {/* Filter */}
      {vendors.length > 4 && (
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search vendors..."
          className="px-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 w-64"
        />
      )}

      {/* Add/Edit form */}
      {showForm && (
        <VendorForm
          initial={editing}
          onSuccess={() => { setShowForm(false); setEditing(null); mutate() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {/* Vendor list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-6 py-16 text-center">
          <Building2 size={32} className="text-muted/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No vendors yet</p>
          <p className="text-xs text-muted">Add the SaaS tools and services your company relies on.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((vendor: any) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={() => { setEditing(vendor); setShowForm(true) }}
              onDelete={() => handleDelete(vendor.id, vendor.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VendorCard({ vendor, onEdit, onDelete }: { vendor: any; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={clsx(
      'bg-card border rounded-xl overflow-hidden transition-colors',
      vendor.riskLevel === 'critical' ? 'border-danger/30' : 'border-border'
    )}>
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <div className="w-9 h-9 bg-bg border border-border rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-muted" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-ink">{vendor.name}</span>
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-muted hover:text-ink transition-colors">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {vendor.category && <span className="text-xs text-muted">{vendor.category}</span>}
            <span className={clsx('font-mono text-[10px] px-1.5 py-0.5 rounded border capitalize', RISK_COLORS[vendor.riskLevel as keyof typeof RISK_COLORS])}>
              {vendor.riskLevel} risk
            </span>
          </div>
        </div>

        {/* Cert badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <CertBadge label="SOC 2" status={vendor.soc2Status} expiresAt={vendor.soc2ExpiresAt} />
          <CertBadge label="ISO 27001" status={vendor.iso27001Status} expiresAt={vendor.iso27001ExpiresAt} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 text-muted hover:text-ink rounded transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-muted hover:text-danger rounded transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 py-4 border-t border-border bg-bg space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">SOC 2 Expiry</div>
              <div className="text-ink">{vendor.soc2ExpiresAt ? format(new Date(vendor.soc2ExpiresAt), 'MMM d, yyyy') : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">ISO 27001 Expiry</div>
              <div className="text-ink">{vendor.iso27001ExpiresAt ? format(new Date(vendor.iso27001ExpiresAt), 'MMM d, yyyy') : '—'}</div>
            </div>
          </div>
          {vendor.notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1 font-mono">Notes</div>
              <p className="text-xs text-ink">{vendor.notes}</p>
            </div>
          )}
          <div className="text-[10px] text-muted font-mono">
            Added {formatDistanceToNow(new Date(vendor.createdAt), { addSuffix: true })}
          </div>
        </div>
      )}
    </div>
  )
}

function CertBadge({ label, status, expiresAt }: { label: string; status: string; expiresAt?: string }) {
  if (status === 'none') {
    return (
      <span className="font-mono text-[10px] text-muted bg-border px-2 py-0.5 rounded hidden sm:inline">
        No {label}
      </span>
    )
  }

  const daysLeft = expiresAt ? differenceInDays(new Date(expiresAt), new Date()) : null

  const config = {
    valid:    { icon: <CheckCircle size={10} />, color: 'text-accent bg-accent-light', suffix: '' },
    expiring: { icon: <Clock size={10} />, color: 'text-warn bg-warn/10', suffix: daysLeft !== null ? ` (${daysLeft}d)` : '' },
    expired:  { icon: <AlertTriangle size={10} />, color: 'text-danger bg-danger/10', suffix: ' expired' },
  }

  const c = config[status as keyof typeof config] || config.valid

  return (
    <span className={clsx('flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded hidden sm:flex', c.color)}>
      {c.icon}
      {label}{c.suffix}
    </span>
  )
}

function VendorForm({ initial, onSuccess, onCancel }: { initial?: any; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name:               initial?.name || '',
    website:            initial?.website || '',
    category:           initial?.category || '',
    riskLevel:          initial?.riskLevel || 'medium',
    soc2ExpiresAt:      initial?.soc2ExpiresAt ? format(new Date(initial.soc2ExpiresAt), 'yyyy-MM-dd') : '',
    iso27001ExpiresAt:  initial?.iso27001ExpiresAt ? format(new Date(initial.iso27001ExpiresAt), 'yyyy-MM-dd') : '',
    notes:              initial?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name) return
    setLoading(true)
    setError('')
    try {
      const url = initial ? `/api/v1/vendors/${initial.id}` : '/api/v1/vendors'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error((await res.json()).message)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-accent/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">{initial ? 'Edit vendor' : 'Add vendor'}</h2>
        <button onClick={onCancel} className="text-muted hover:text-ink transition-colors"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Vendor name *">
          <input value={form.name} onChange={set('name')} placeholder="e.g. AWS, Stripe, Okta" className={inputCls} />
        </Field>
        <Field label="Website">
          <input value={form.website} onChange={set('website')} placeholder="https://vendor.com" className={inputCls} />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={set('category')} className={inputCls}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Risk level">
          <select value={form.riskLevel} onChange={set('riskLevel')} className={inputCls}>
            {RISK_LEVELS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="SOC 2 expiry date">
          <input type="date" value={form.soc2ExpiresAt} onChange={set('soc2ExpiresAt')} className={inputCls} />
        </Field>
        <Field label="ISO 27001 expiry date">
          <input type="date" value={form.iso27001ExpiresAt} onChange={set('iso27001ExpiresAt')} className={inputCls} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Risk notes, exemptions, vendor contact..." className={inputCls + ' resize-none'} />
      </Field>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!form.name || loading}
          className="px-4 py-2 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : initial ? 'Save changes' : 'Add vendor'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs border border-border rounded text-muted hover:text-ink transition-all">
          Cancel
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted font-mono uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={clsx('font-mono text-2xl font-medium', color)}>{value}</div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-border rounded bg-bg text-ink placeholder:text-muted focus:outline-none focus:border-accent/50'
