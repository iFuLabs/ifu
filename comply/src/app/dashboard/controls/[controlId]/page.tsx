'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, Minus, ChevronDown, ChevronUp, Save, UserCircle2, CalendarDays, PlayCircle, AlertOctagon, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import clsx from 'clsx'
import { AiGapExplainer } from '@/components/AiGapExplainer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const REMEDIATION_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
] as const

type RemediationStatus = typeof REMEDIATION_STATUSES[number]['value']

export default function ControlDetailPage() {
  const params = useParams()
  const controlId = params.controlId as string
  const { data: control, error, mutate } = useSWR(
    ['control', controlId],
    () => api.controls.get(controlId)
  )
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [savingRem, setSavingRem] = useState(false)

  const { data: members } = useSWR('team-members', async () => {
    const res = await fetch(`${API_URL}/api/v1/team/members`, { credentials: 'include' })
    return res.ok ? res.json() : []
  })

  const updateRemediation = async (patch: { ownerId?: string | null; dueDate?: string | null; status?: RemediationStatus | null }) => {
    setSavingRem(true)
    try {
      await api.controls.updateRemediation(controlId, patch)
      mutate()
    } finally {
      setSavingRem(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.controls.updateNotes(controlId, notes)
      mutate()
    } finally {
      setSavingNotes(false)
    }
  }

  if (error) return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/dashboard/controls" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} />
        Controls
      </Link>
      <div className="bg-card border border-danger/20 rounded-xl p-6">
        <h2 className="text-sm font-medium text-danger mb-2">Control not found</h2>
        <p className="text-sm text-muted">The control "{controlId}" could not be loaded. It may not exist or you may not have access to it.</p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary className="text-xs text-muted cursor-pointer">Error details</summary>
            <pre className="mt-2 text-xs font-mono text-danger bg-danger/5 p-2 rounded overflow-auto">
              {error?.message || String(error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )

  if (!control) return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/dashboard/controls" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} />
        Controls
      </Link>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-6 w-32 bg-border rounded animate-pulse mb-3" />
        <div className="h-8 w-full bg-border rounded animate-pulse mb-2" />
        <div className="h-20 w-full bg-border rounded animate-pulse" />
      </div>
    </div>
  )

  const statusConfig = {
    pass:    { icon: <CheckCircle size={18} className="text-accent" />, label: 'Passing', color: 'text-accent', bg: 'bg-accent-light' },
    fail:    { icon: <XCircle size={18} className="text-danger" />, label: 'Failing', color: 'text-danger', bg: 'bg-danger/10' },
    review:  { icon: <Clock size={18} className="text-warn" />, label: 'Needs Review', color: 'text-warn', bg: 'bg-warn/10' },
    pending: { icon: <Minus size={18} className="text-muted" />, label: 'Not Scanned', color: 'text-muted', bg: 'bg-border/50' },
  }
  const config = statusConfig[control.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* Back */}
      <Link href="/dashboard/controls" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} />
        Controls
      </Link>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={clsx('p-2 rounded-lg', config.bg)}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted">{control.controlId}</span>
              <span className="font-mono text-xs text-muted">·</span>
              <span className="font-mono text-xs text-muted capitalize">{control.framework}</span>
              <span className={clsx('font-mono text-[10px] px-2 py-0.5 rounded ml-auto', config.bg, config.color)}>
                {config.label}
              </span>
            </div>
            <h1 className="font-serif text-xl font-normal text-ink">{control.title}</h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">{control.description}</p>
            
            {/* Plain English explanation */}
            <div className="mt-3 p-3 bg-bg rounded-lg">
              <p className="text-xs text-muted leading-relaxed">
                <span className="font-medium text-ink">In plain English: </span>
                {control.status === 'pass' && "This security requirement is currently met in your infrastructure. "}
                {control.status === 'fail' && "This security requirement is not met and needs to be fixed before your audit. "}
                {control.status === 'review' && "This requires manual verification - automated checks can't fully validate this. "}
                {control.status === 'pending' && "We haven't scanned this yet. Run a scan or connect the required integration. "}
                {control.automatable ? "We check this automatically during scans." : "This requires manual evidence collection."}
              </p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-border text-xs text-muted font-mono">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1">Category</div>
            <div className="text-ink">{control.category}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1">Severity</div>
            <div className={clsx('capitalize', {
              'text-danger': control.severity === 'critical',
              'text-orange-500': control.severity === 'high',
              'text-warn': control.severity === 'medium',
              'text-muted': control.severity === 'low',
            })}>{control.severity}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1">Automated</div>
            <div className="text-ink">{control.automatable ? 'Yes' : 'Manual'}</div>
          </div>
          {control.lastChecked && (
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-1">Last Checked</div>
              <div className="text-ink">{format(new Date(control.lastChecked), 'MMM d, yyyy HH:mm')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Guidance */}
      {control.status === 'fail' && control.guidance && (
        <div className="bg-card border border-danger/20 rounded-xl p-5">
          <h2 className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
            How to fix this
          </h2>
          <p className="text-sm text-muted leading-relaxed">{control.guidance}</p>
        </div>
      )}

      {/* AI Gap Explainer — only shown for failing controls */}
      {control.status === 'fail' && (
        <AiGapExplainer controlId={controlId} />
      )}

      {/* Evidence */}
      {control.evidence && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg transition-colors text-sm font-medium text-ink"
          >
            Raw Evidence
            {showEvidence ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
          </button>
          {showEvidence && (
            <div className="border-t border-border">
              <pre className="p-5 text-xs font-mono text-muted overflow-x-auto bg-bg">
                {JSON.stringify(control.evidence, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Remediation */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-ink">Remediation</h2>
          {control.remediationStatus && (
            <span className={clsx(
              'font-mono text-[10px] px-2 py-0.5 rounded',
              control.remediationStatus === 'completed' && 'bg-accent-light text-accent',
              control.remediationStatus === 'blocked' && 'bg-danger/10 text-danger',
              control.remediationStatus === 'in_progress' && 'bg-warn/10 text-warn',
              (!control.remediationStatus || control.remediationStatus === 'open') && 'bg-border/50 text-muted'
            )}>
              {REMEDIATION_STATUSES.find(s => s.value === control.remediationStatus)?.label || control.remediationStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
              <UserCircle2 size={11} /> Owner
            </label>
            <select
              value={control.remediationOwnerId || ''}
              onChange={e => updateRemediation({ ownerId: e.target.value || null })}
              disabled={savingRem}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">— Unassigned —</option>
              {members?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name || m.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
              <CalendarDays size={11} /> Due date
            </label>
            <input
              type="date"
              value={control.remediationDueDate ? new Date(control.remediationDueDate).toISOString().slice(0, 10) : ''}
              onChange={e => updateRemediation({ dueDate: e.target.value || null })}
              disabled={savingRem}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateRemediation({ status: 'in_progress' })}
            disabled={savingRem || control.remediationStatus === 'in_progress'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg disabled:opacity-50"
          >
            <PlayCircle size={12} /> Mark started
          </button>
          <button
            onClick={() => updateRemediation({ status: 'blocked' })}
            disabled={savingRem || control.remediationStatus === 'blocked'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg disabled:opacity-50"
          >
            <AlertOctagon size={12} /> Mark blocked
          </button>
          <button
            onClick={() => updateRemediation({ status: 'completed' })}
            disabled={savingRem || control.remediationStatus === 'completed'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
          >
            <CheckCheck size={12} /> Mark complete
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-ink mb-3">Notes</h2>
        <textarea
          value={notes || control.notes || ''}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add context, remediation steps, or exemption reasons..."
          rows={4}
          className="w-full text-sm border border-border rounded p-3 text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none bg-bg"
        />
        <button
          onClick={handleSaveNotes}
          disabled={savingNotes}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          <Save size={12} />
          {savingNotes ? 'Saving...' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}
