'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'

// Type definition
type Control = any
import { useState } from 'react'
import { Shield, CheckCircle, XCircle, Clock, Minus, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const FRAMEWORKS = [
  { value: '', label: 'All frameworks' },
  { value: 'soc2', label: 'SOC 2' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'hipaa', label: 'HIPAA' },
]

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'fail', label: 'Failing' },
  { value: 'pass', label: 'Passing' },
  { value: 'review', label: 'Review' },
  { value: 'pending', label: 'Pending' },
]

export default function ControlsPage() {
  const [framework, setFramework] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data: controls, isLoading } = useSWR(
    ['controls', framework, status],
    () => api.controls.list({ framework: framework || undefined, status: status || undefined }),
    { refreshInterval: 30000 }
  )

  const filtered = controls?.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.controlId.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Group by category
  const grouped = filtered.reduce<Record<string, Control[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  const passCount = controls?.filter(c => c.status === 'pass').length || 0
  const failCount = controls?.filter(c => c.status === 'fail').length || 0
  const total = controls?.length || 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Controls</h1>
        <p className="text-sm text-muted mt-0.5">
          {total > 0 ? `${passCount} of ${total} controls passing` : 'Loading controls...'}
        </p>
      </div>

      {/* Explainer card */}
      <div className="bg-accent-light border border-accent/20 rounded-xl p-5">
        <h2 className="text-sm font-medium text-accent mb-2">What are controls?</h2>
        <p className="text-sm text-accent/80 leading-relaxed">
          Controls are security and compliance requirements from frameworks like SOC 2, ISO 27001, and GDPR. 
          Each control checks a specific aspect of your infrastructure (like "MFA is enabled" or "Data is encrypted"). 
          We automatically scan your AWS account to verify these controls are met.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-accent flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-accent">Passing</div>
              <div className="text-xs text-accent/70">Requirement met</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-danger flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-ink">Failing</div>
              <div className="text-xs text-muted">Needs fixing</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-warn flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-ink">Review</div>
              <div className="text-xs text-muted">Manual check needed</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Minus size={14} className="text-muted flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-ink">Pending</div>
              <div className="text-xs text-muted">Not scanned yet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">Overall progress</span>
            <span className="font-mono text-sm text-muted">{passCount}/{total}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${total > 0 ? (passCount / total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted font-mono">
            <span className="text-accent">{passCount} passing</span>
            <span className="text-danger">{failCount} failing</span>
            <span>{controls?.filter(c => c.status === 'review').length} review</span>
            <span>{controls?.filter(c => c.status === 'pending').length} pending</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search controls..."
            className="pl-8 pr-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 w-52"
          />
        </div>
        <select
          value={framework}
          onChange={e => setFramework(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded bg-card text-ink focus:outline-none focus:border-accent/50"
        >
          {FRAMEWORKS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded bg-card text-ink focus:outline-none focus:border-accent/50"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Grouped controls */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-bg border-b border-border">
            <Shield size={13} className="text-muted" />
            <span className="text-xs font-medium text-muted uppercase tracking-wider">{category}</span>
            <span className="font-mono text-xs text-muted ml-auto">{items.length}</span>
          </div>
          <div className="divide-y divide-border">
            {items.map(control => (
              <ControlRow key={control.id} control={control} />
            ))}
          </div>
        </div>
      ))}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          <Shield size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No controls match your filters</p>
        </div>
      )}
    </div>
  )
}

function ControlRow({ control }: { control: Control }) {
  const statusConfig = {
    pass:           { icon: <CheckCircle size={15} className="text-accent" />, bg: '' },
    fail:           { icon: <XCircle size={15} className="text-danger" />, bg: 'bg-danger/[0.02]' },
    review:         { icon: <Clock size={15} className="text-warn" />, bg: '' },
    pending:        { icon: <Minus size={15} className="text-muted" />, bg: '' },
    not_applicable: { icon: <Minus size={15} className="text-muted" />, bg: '' },
  }
  const config = statusConfig[control.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Link
      href={`/dashboard/controls/${control.controlId}`}
      className={clsx('flex items-center gap-4 px-5 py-3.5 hover:bg-bg transition-colors group', config.bg)}
    >
      <div className="flex-shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-xs text-muted">{control.controlId}</span>
          {control.severity === 'critical' && (
            <span className="font-mono text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded uppercase tracking-wider">Critical</span>
          )}
          {!control.automatable && (
            <span className="font-mono text-[9px] bg-border text-muted px-1.5 py-0.5 rounded uppercase tracking-wider">Manual</span>
          )}
        </div>
        <p className="text-sm text-ink">{control.title}</p>
        {control.lastChecked && (
          <p className="text-xs text-muted mt-0.5">
            Checked {formatDistanceToNow(new Date(control.lastChecked), { addSuffix: true })}
          </p>
        )}
      </div>
      <ChevronRight size={14} className="text-border group-hover:text-muted transition-colors flex-shrink-0" />
    </Link>
  )
}
