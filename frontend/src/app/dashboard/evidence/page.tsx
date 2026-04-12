'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { useState } from 'react'
import { Download, CheckCircle, XCircle, Clock, Minus, FileText, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

const FRAMEWORKS = [
  { value: 'soc2',     label: 'SOC 2 Type II' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'gdpr',     label: 'GDPR' },
]

export default function EvidencePage() {
  const { data, isLoading, mutate } = useSWR('evidence', () =>
    fetch('/api/v1/evidence').then(r => r.json())
  )
  const [exporting, setExporting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const handleExport = async (framework: string) => {
    setExporting(framework)
    try {
      const res = await fetch(`/api/v1/evidence/export/pdf?framework=${framework}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.slice(0, -1) || `${framework}-evidence.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this evidence item?')) return
    await fetch(`/api/v1/evidence/${id}`, { method: 'DELETE' })
    mutate()
  }

  const automated = data?.automated || []
  const manual = data?.manual || []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Evidence Library</h1>
          <p className="text-sm text-muted mt-0.5">
            {data ? `${data.total} evidence items collected` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-accent text-white rounded hover:bg-accent/90 transition-all"
        >
          <Plus size={14} />
          Add manual evidence
        </button>
      </div>

      {/* Export cards */}
      <div>
        <h2 className="text-sm font-medium text-ink mb-3">Export Audit Pack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FRAMEWORKS.map(fw => (
            <div key={fw.value} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <span className="text-sm font-medium text-ink">{fw.label}</span>
              </div>
              <p className="text-xs text-muted">
                Full evidence pack with all controls, results, and remediation guidance.
              </p>
              <button
                onClick={() => handleExport(fw.value)}
                disabled={exporting === fw.value}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-border rounded hover:bg-bg transition-all text-muted hover:text-ink disabled:opacity-50 mt-auto"
              >
                <Download size={12} className={exporting === fw.value ? 'animate-bounce' : ''} />
                {exporting === fw.value ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Automated evidence */}
      <div>
        <h2 className="text-sm font-medium text-ink mb-3">Automated Evidence ({automated.length})</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : automated.length === 0 ? (
          <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
            <FileText size={28} className="text-muted/30 mx-auto mb-2" />
            <p className="text-sm text-muted">No automated evidence yet. Connect an integration and run a scan.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {automated.map((item: any) => (
              <EvidenceRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Manual evidence */}
      {(manual.length > 0 || showAdd) && (
        <div>
          <h2 className="text-sm font-medium text-ink mb-3">Manual Evidence ({manual.length})</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {showAdd && (
              <AddEvidenceForm
                onSuccess={() => { setShowAdd(false); mutate() }}
                onCancel={() => setShowAdd(false)}
              />
            )}
            {manual.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                <FileText size={14} className="text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">{item.title}</p>
                  {item.description && <p className="text-xs text-muted mt-0.5">{item.description}</p>}
                  <p className="text-xs text-muted mt-0.5 font-mono">
                    Added {formatDistanceToNow(new Date(item.collectedAt), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-muted hover:text-danger transition-colors rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EvidenceRow({ item }: { item: any }) {
  const statusIcon = {
    pass:    <CheckCircle size={14} className="text-accent flex-shrink-0" />,
    fail:    <XCircle size={14} className="text-danger flex-shrink-0" />,
    review:  <Clock size={14} className="text-warn flex-shrink-0" />,
    pending: <Minus size={14} className="text-muted flex-shrink-0" />,
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg transition-colors">
      {statusIcon[item.status as keyof typeof statusIcon] || statusIcon.pending}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[10px] text-muted">{item.controlId}</span>
          <span className="font-mono text-[10px] text-muted uppercase">{item.framework}</span>
        </div>
        <p className="text-sm text-ink truncate">{item.title}</p>
        {item.evidence?.detail && (
          <p className="text-xs text-muted mt-0.5 truncate">{item.evidence.detail}</p>
        )}
      </div>
      {item.checkedAt && (
        <span className="text-xs text-muted font-mono flex-shrink-0">
          {format(new Date(item.checkedAt), 'MMM d, HH:mm')}
        </span>
      )}
    </div>
  )
}

function AddEvidenceForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title) return
    setLoading(true)
    try {
      await fetch('/api/v1/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-4 bg-bg space-y-3">
      <p className="text-xs font-medium text-ink">Add manual evidence</p>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Information Security Policy v2.1"
        className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title || loading}
          className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-border rounded text-muted hover:text-ink transition-all">
          Cancel
        </button>
      </div>
    </div>
  )
}
