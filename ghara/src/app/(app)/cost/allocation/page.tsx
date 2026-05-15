'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RefreshCw, Download, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface AllocationItem {
  value: string
  cost: number
  percentage: number
  monthOverMonthDelta: number
}

interface AllocationData {
  tagKey: string
  startDate: string
  endDate: string
  total: number
  byValue: AllocationItem[]
  cached?: boolean
}

const TAG_KEYS = ['Environment', 'Team', 'Project', 'CostCenter']
const COLORS = ['#8A63E6', '#DAC0FD', '#C8F6C0', '#FEDF89', '#FCA5A5', '#93C5FD', '#A5B4FC', '#D1D5DB']

export default function AllocationPage() {
  const [data, setData] = useState<AllocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tagKey, setTagKey] = useState('Environment')

  useEffect(() => {
    loadData()
  }, [tagKey])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/finops/allocation?tagKey=${encodeURIComponent(tagKey)}`, { credentials: 'include' })
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Failed to load allocation:', err)
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (!data) return
    const rows = [
      ['Tag Value', 'Cost (USD)', 'Percentage', 'MoM Delta (%)'],
      ...data.byValue.map(v => [v.value, v.cost.toFixed(2), v.percentage.toFixed(1), v.monthOverMonthDelta.toFixed(1)])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cost-allocation-${tagKey}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cost" className="text-muted hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-normal text-ink">Cost Allocation</h1>
            <p className="text-sm text-muted mt-0.5">Slice spend by tag to see where money goes</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={!data}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-card hover:bg-surface transition-all text-muted hover:text-ink disabled:opacity-50"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Tag key picker */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {TAG_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setTagKey(key)}
            className={clsx(
              'px-4 py-1.5 text-xs font-medium rounded transition-all',
              tagKey === key ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-16 flex items-center justify-center">
          <RefreshCw size={20} className="animate-spin text-muted" />
        </div>
      ) : !data || data.byValue.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-sm font-medium text-ink">No data for tag: {tagKey}</p>
          <p className="text-xs text-muted mt-1">
            Make sure your AWS resources are tagged with this key
          </p>
        </div>
      ) : (
        <>
          {/* Untagged warning */}
          {data.byValue[0]?.value === '(untagged)' && data.byValue[0].percentage > 5 && (
            <div className="flex items-center gap-3 bg-warn/5 border border-warn/20 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-warn flex-shrink-0" />
              <p className="text-sm text-warn">
                <strong>{data.byValue[0].percentage}%</strong> of spend (${data.byValue[0].cost.toLocaleString()}) is untagged.
                Tag your resources with <code className="bg-warn/10 px-1.5 py-0.5 rounded text-xs">{tagKey}</code> for better visibility.
              </p>
            </div>
          )}

          {/* Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-ink">Spend by {tagKey}</h2>
              <span className="font-mono text-sm text-ink font-semibold">${data.total.toLocaleString()}</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(200, data.byValue.length * 36)}>
              <BarChart data={data.byValue} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="value"
                  width={140}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(s: string) => s.length > 20 ? s.slice(0, 20) + '…' : s}
                />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {data.byValue.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-5 py-3 font-medium text-ink">{tagKey}</th>
                  <th className="text-right px-5 py-3 font-medium text-ink">Cost</th>
                  <th className="text-right px-5 py-3 font-medium text-ink">%</th>
                  <th className="text-right px-5 py-3 font-medium text-ink">MoM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byValue.map((item, i) => (
                  <tr key={i} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className={clsx('font-mono text-xs', item.value === '(untagged)' ? 'text-warn font-medium' : 'text-ink')}>
                          {item.value}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-ink">${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-muted">{item.percentage}%</td>
                    <td className="px-5 py-3 text-right">
                      <span className={clsx('flex items-center justify-end gap-1 font-mono text-xs', item.monthOverMonthDelta > 0 ? 'text-danger' : 'text-accent')}>
                        {item.monthOverMonthDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {item.monthOverMonthDelta > 0 ? '+' : ''}{item.monthOverMonthDelta}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
