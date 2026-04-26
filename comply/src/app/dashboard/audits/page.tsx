'use client'
import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, CheckCircle2, AlertCircle, Download, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Audit {
  id: string
  framework: string
  type: string
  status: 'planning' | 'in_progress' | 'complete'
  kickoffAt: string | null
  fieldworkAt: string | null
  expectedCloseAt: string | null
  completedAt: string | null
  auditorFirm: string | null
  notes: string | null
}

const FRAMEWORKS = ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss']
const TYPES = ['type1', 'type2', 'iso', 'gdpr', 'hipaa', 'pci']

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ framework: 'soc2', type: 'type2', expectedCloseAt: '', auditorFirm: '', notes: '' })

  useEffect(() => { loadAudits() }, [])

  async function loadAudits() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/audits`, { credentials: 'include' })
      if (res.ok) setAudits(await res.json())
    } catch {} finally { setLoading(false) }
  }

  async function createAudit() {
    const res = await fetch(`${API_URL}/api/v1/audits`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) { setShowForm(false); loadAudits() }
  }

  async function deleteAudit(id: string) {
    if (!confirm('Delete this audit?')) return
    await fetch(`${API_URL}/api/v1/audits/${id}`, { method: 'DELETE', credentials: 'include' })
    loadAudits()
  }

  function daysUntil(date: string | null) {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const statusConfig = {
    planning: { label: 'Planning', color: '#B54708', bg: '#FFFAEB', icon: Clock },
    in_progress: { label: 'In Progress', color: '#8A63E6', bg: 'rgba(138, 99, 230, 0.08)', icon: AlertCircle },
    complete: { label: 'Complete', color: '#067647', bg: '#ECFDF3', icon: CheckCircle2 }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Audits</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Track audit timelines and deadlines</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`${API_URL}/api/v1/audits/calendar.ics`}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-card hover:bg-surface-hover transition-all text-muted hover:text-ink"
          >
            <Download size={14} />
            iCal
          </a>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all"
            style={{ background: '#33063D', color: '#fff' }}
          >
            <Plus size={14} />
            New audit
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink block mb-1">Framework</label>
              <select value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-ink">
                {FRAMEWORKS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-ink">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink block mb-1">Expected close date</label>
              <input type="date" value={form.expectedCloseAt} onChange={e => setForm({ ...form, expectedCloseAt: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-ink" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink block mb-1">Auditor firm</label>
              <input type="text" value={form.auditorFirm} onChange={e => setForm({ ...form, auditorFirm: e.target.value })} placeholder="e.g. Deloitte" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-ink" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createAudit} className="px-4 py-2 text-sm rounded-lg" style={{ background: '#33063D', color: '#fff' }}>Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-border rounded-lg text-muted">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Loading...</p>
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar size={32} style={{ color: 'rgba(51, 6, 61, 0.2)' }} className="mx-auto mb-3" />
          <p className="text-sm font-medium text-ink">No audits scheduled</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Create your first audit to start tracking deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map(audit => {
            const cfg = statusConfig[audit.status] || statusConfig.planning
            const Icon = cfg.icon
            const days = daysUntil(audit.expectedCloseAt)

            return (
              <div key={audit.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-ink">{audit.framework.toUpperCase()} — {audit.type}</h3>
                      {audit.auditorFirm && <p className="text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>{audit.auditorFirm}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    <button onClick={() => deleteAudit(audit.id)} className="p-1 text-muted hover:text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {days !== null && audit.status !== 'complete' && (
                  <div className={clsx('text-sm font-medium mb-2', days <= 7 ? 'text-danger' : days <= 30 ? 'text-warn' : 'text-ink')}>
                    {days > 0 ? `${days} days remaining` : days === 0 ? 'Due today' : `${Math.abs(days)} days overdue`}
                  </div>
                )}

                <div className="flex gap-6 text-xs font-mono" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
                  {audit.kickoffAt && <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Kickoff</span>{new Date(audit.kickoffAt).toLocaleDateString()}</div>}
                  {audit.fieldworkAt && <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Fieldwork</span>{new Date(audit.fieldworkAt).toLocaleDateString()}</div>}
                  {audit.expectedCloseAt && <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Close</span>{new Date(audit.expectedCloseAt).toLocaleDateString()}</div>}
                  {audit.completedAt && <div><span className="block text-[10px] uppercase tracking-wider mb-0.5">Completed</span>{new Date(audit.completedAt).toLocaleDateString()}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
