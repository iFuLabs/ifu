'use client'
import { useState, useEffect } from 'react'
import { Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface AuditEntry {
  id: string
  action: string
  resource: string | null
  resourceId: string | null
  metadata: Record<string, any> | null
  ipAddress: string | null
  createdAt: string
  userId: string | null
  userEmail: string | null
  userName: string | null
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 50

  useEffect(() => { loadEntries() }, [offset, actionFilter])

  async function loadEntries() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`${API_URL}/api/v1/audit-log?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.rows || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load audit log:', err)
    } finally {
      setLoading(false)
    }
  }

  async function exportCSV() {
    const res = await fetch(`${API_URL}/api/v1/audit-log/export`, { credentials: 'include' })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('removed')) return { color: '#B42318', bg: '#FEF3F2' }
    if (action.includes('create') || action.includes('connected') || action.includes('accepted')) return { color: '#067647', bg: '#ECFDF3' }
    return { color: '#B54708', bg: '#FFFAEB' }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Audit Log</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
            {total} event{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-card hover:bg-surface-hover transition-all text-muted hover:text-ink"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(51, 6, 61, 0.4)' }} />
          <input
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setOffset(0) }}
            placeholder="Filter by action (e.g. auth.login, control.remediation_updated)"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-ink">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map(entry => {
              const ac = actionColor(entry.action)
              return (
                <div key={entry.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style={{ color: ac.color, background: ac.bg }}
                        >
                          {entry.action}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-ink">
                        {entry.userName || entry.userEmail || 'System'}
                        {entry.resource && <span style={{ color: 'rgba(51, 6, 61, 0.65)' }}> · {entry.resource}</span>}
                      </p>
                    </div>
                  </div>
                  {expandedId === entry.id && entry.metadata && (
                    <div className="px-5 pb-3">
                      <pre className="text-xs font-mono p-3 rounded-lg overflow-auto" style={{ background: '#F8F7FA', color: '#33063D', maxHeight: 200 }}>
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
