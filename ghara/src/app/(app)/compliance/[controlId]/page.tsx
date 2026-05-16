'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, Minus, ChevronDown, ChevronUp, Save, UserCircle2, CalendarDays, PlayCircle, AlertOctagon, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const REMEDIATION_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
] as const

type RemediationStatus = typeof REMEDIATION_STATUSES[number]['value']

async function fetchControl(controlId: string) {
  const res = await fetch(`${API_URL}/api/v1/controls/${controlId}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Control not found')
  return res.json()
}

async function fetchMembers() {
  const res = await fetch(`${API_URL}/api/v1/team/members`, { credentials: 'include' })
  return res.ok ? res.json() : []
}

export default function ControlDetailPage() {
  const params = useParams()
  const controlId = params.controlId as string
  const { data: control, error, mutate } = useSWR(['control', controlId], () => fetchControl(controlId))
  const { data: members } = useSWR('team-members', fetchMembers)
  const { data: me } = useSWR('me', () =>
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
  )
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [savingRem, setSavingRem] = useState(false)

  const isAuditor = me?.user?.role === 'auditor'

  const updateRemediation = async (patch: { ownerId?: string | null; dueDate?: string | null; status?: RemediationStatus | null }) => {
    setSavingRem(true)
    try {
      await fetch(`${API_URL}/api/v1/controls/${controlId}/remediation`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      mutate()
    } finally { setSavingRem(false) }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch(`${API_URL}/api/v1/controls/${controlId}/notes`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      mutate()
    } finally { setSavingNotes(false) }
  }

  if (error) return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/compliance" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Controls
      </Link>
      <div className="bg-card border border-danger/20 rounded-xl p-6">
        <h2 className="text-sm font-medium text-danger mb-2">Control not found</h2>
        <p className="text-sm text-muted">The control "{controlId}" could not be loaded.</p>
      </div>
    </div>
  )

  if (!control) return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/compliance" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Controls
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
      <Link href="/compliance" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Controls
      </Link>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={clsx('p-2 rounded-lg', config.bg)}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted">{control.controlId}</span>
              <span className="font-mono text-xs text-muted">·</span>
              <span className="font-mono text-xs text-muted capitalize">{control.framework}</span>
              <span className={clsx('font-mono text-[10px] px-2 py-0.5 rounded ml-auto', config.bg, config.color)}>{config.label}</span>
            </div>
            <h1 className="font-serif text-xl font-normal text-ink">{control.title}</h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">{control.description}</p>
          </div>
        </div>
        <div className="flex gap-6 mt-5 pt-5 border-t border-border text-xs text-muted font-mono">
          <div><div className="text-[10px] uppercase tracking-wider mb-1">Category</div><div className="text-ink">{control.category}</div></div>
          <div><div className="text-[10px] uppercase tracking-wider mb-1">Severity</div><div className={clsx('capitalize', { 'text-danger': control.severity === 'critical', 'text-warn': control.severity === 'medium' })}>{control.severity}</div></div>
          <div><div className="text-[10px] uppercase tracking-wider mb-1">Automated</div><div className="text-ink">{control.automatable ? 'Yes' : 'Manual'}</div></div>
          {control.lastChecked && <div><div className="text-[10px] uppercase tracking-wider mb-1">Last Checked</div><div className="text-ink">{format(new Date(control.lastChecked), 'MMM d, yyyy HH:mm')}</div></div>}
        </div>
      </div>

      {/* Guidance */}
      {control.status === 'fail' && control.guidance && (
        <div className="bg-card border border-danger/20 rounded-xl p-5">
          <h2 className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" /> How to fix this
          </h2>
          <p className="text-sm text-muted leading-relaxed">{control.guidance}</p>
        </div>
      )}

      {/* AI Explanation & Remediation */}
      {control.status === 'fail' && (
        <AiRemediationSection controlId={controlId} apiUrl={API_URL} />
      )}

      {/* Evidence */}
      {control.evidence && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={() => setShowEvidence(!showEvidence)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg transition-colors text-sm font-medium text-ink">
            Raw Evidence
            {showEvidence ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
          </button>
          {showEvidence && (
            <div className="border-t border-border">
              <pre className="p-5 text-xs font-mono text-muted overflow-x-auto bg-bg">{JSON.stringify(control.evidence, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Remediation */}
      {!isAuditor && (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-ink">Remediation</h2>
          {control.remediationStatus && (
            <span className={clsx('font-mono text-[10px] px-2 py-0.5 rounded',
              control.remediationStatus === 'completed' && 'bg-accent-light text-accent',
              control.remediationStatus === 'blocked' && 'bg-danger/10 text-danger',
              control.remediationStatus === 'in_progress' && 'bg-warn/10 text-warn',
              (!control.remediationStatus || control.remediationStatus === 'open') && 'bg-border/50 text-muted'
            )}>{REMEDIATION_STATUSES.find(s => s.value === control.remediationStatus)?.label || control.remediationStatus}</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1"><UserCircle2 size={11} /> Owner</label>
            <select value={control.remediationOwnerId || ''} onChange={e => updateRemediation({ ownerId: e.target.value || null })} disabled={savingRem} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50">
              <option value="">— Unassigned —</option>
              {members?.map((m: any) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1"><CalendarDays size={11} /> Due date</label>
            <input type="date" value={control.remediationDueDate ? new Date(control.remediationDueDate).toISOString().slice(0, 10) : ''} onChange={e => updateRemediation({ dueDate: e.target.value || null })} disabled={savingRem} className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => updateRemediation({ status: 'in_progress' })} disabled={savingRem || control.remediationStatus === 'in_progress'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg disabled:opacity-50"><PlayCircle size={12} /> Mark started</button>
          <button onClick={() => updateRemediation({ status: 'blocked' })} disabled={savingRem || control.remediationStatus === 'blocked'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg disabled:opacity-50"><AlertOctagon size={12} /> Mark blocked</button>
          <button onClick={() => updateRemediation({ status: 'completed' })} disabled={savingRem || control.remediationStatus === 'completed'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"><CheckCheck size={12} /> Mark complete</button>
        </div>
      </div>
      )}

      {/* Notes */}
      {!isAuditor && (
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-ink mb-3">Notes</h2>
        <textarea value={notes || control.notes || ''} onChange={e => setNotes(e.target.value)} placeholder="Add context, remediation steps, or exemption reasons..." rows={4} className="w-full text-sm border border-border rounded p-3 text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none bg-bg" />
        <button onClick={handleSaveNotes} disabled={savingNotes} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-all disabled:opacity-50">
          <Save size={12} /> {savingNotes ? 'Saving...' : 'Save notes'}
        </button>
      </div>
      )}
    </div>
  )
}

function AiRemediationSection({ controlId, apiUrl }: { controlId: string; apiUrl: string }) {
  const [explanation, setExplanation] = useState<any>(null)
  const [remediation, setRemediation] = useState<any>(null)
  const [format, setFormat] = useState<'terraform' | 'cli' | 'cloudformation'>('terraform')
  const [loading, setLoading] = useState(false)
  const [remLoading, setRemLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchExplanation = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiUrl}/api/v1/ai/explain/${controlId}`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed' }))
        throw new Error(err.message)
      }
      setExplanation(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRemediation = async () => {
    setRemLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiUrl}/api/v1/ai/remediate/${controlId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed' }))
        throw new Error(err.message)
      }
      setRemediation(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRemLoading(false)
    }
  }

  const handleCopy = () => {
    if (!remediation?.code) return
    navigator.clipboard.writeText(remediation.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          AI Remediation
        </h2>
        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">Growth+</span>
      </div>

      {/* Explanation section */}
      {!explanation && !loading && (
        <button onClick={fetchExplanation} className="text-xs text-accent hover:underline">
          Analyze this failure with AI →
        </button>
      )}
      {loading && <p className="text-xs text-muted animate-pulse">Analyzing control failure...</p>}

      {explanation && (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-ink leading-relaxed">{explanation.summary}</p>
            {explanation.businessImpact && (
              <p className="text-xs text-muted mt-1">Impact: {explanation.businessImpact}</p>
            )}
          </div>

          {explanation.steps?.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider">Steps to fix</h3>
              {explanation.steps.map((step: any) => (
                <div key={step.order} className="flex gap-2 text-sm">
                  <span className="font-mono text-xs text-accent flex-shrink-0 mt-0.5">{step.order}.</span>
                  <div>
                    <span className="font-medium text-ink">{step.title}</span>
                    <span className="text-muted"> — {step.detail}</span>
                    {step.effort && <span className="text-xs text-muted ml-1">({step.effort})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate code button */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-medium text-ink">Generate fix code</h3>
              <select
                value={format}
                onChange={e => { setFormat(e.target.value as any); setRemediation(null) }}
                className="text-xs border border-border rounded px-2 py-1 bg-bg text-ink"
              >
                <option value="terraform">Terraform</option>
                <option value="cli">AWS CLI</option>
                <option value="cloudformation">CloudFormation</option>
              </select>
              <button
                onClick={fetchRemediation}
                disabled={remLoading}
                className="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
              >
                {remLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {remediation && (
              <div className="space-y-2">
                {remediation.explanation && (
                  <p className="text-xs text-muted">{remediation.explanation}</p>
                )}
                <div className="relative">
                  <pre className="bg-bg border border-border rounded-lg p-4 text-xs font-mono text-ink overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap">
                    {remediation.code}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 text-xs px-2 py-1 bg-card border border-border rounded text-muted hover:text-ink"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                {remediation.verifyCommand && (
                  <div className="text-xs text-muted">
                    <span className="font-medium">Verify: </span>
                    <code className="bg-bg px-1.5 py-0.5 rounded font-mono">{remediation.verifyCommand}</code>
                  </div>
                )}
                {remediation.warnings?.length > 0 && (
                  <div className="bg-warn/5 border border-warn/20 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-warn mb-1">⚠️ Warnings</h4>
                    <ul className="text-xs text-muted space-y-0.5">
                      {remediation.warnings.map((w: string, i: number) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
