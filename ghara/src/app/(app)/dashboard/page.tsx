'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { Shield, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Clock, RefreshCw, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

export default function DashboardPage() {
  const { data: score } = useSWR('score', api.controls.score, { refreshInterval: 30000 })
  const { data: controls } = useSWR('controls', api.controls.list, { refreshInterval: 30000 })
  const { data: finops } = useSWR('finops', () => api.finops.get(), { refreshInterval: 60000 })
  const { data: scans } = useSWR('scans', api.scans.list, { refreshInterval: 10000 })

  // Compute Cloud Health Score
  const complianceScore = score?.overall || 0
  const wasteRatio = finops?.summary ? (finops.summary.totalMonthlySavings || 0) / Math.max(finops.monthlyCost || 1, 1) : 0
  const costScore = Math.round(Math.max(0, (1 - wasteRatio) * 100))
  const failingControls = controls?.filter((c: any) => c.status === 'fail') || []
  const criticalCount = failingControls.filter((c: any) => c.severity === 'critical' || c.severity === 'high').length
  const securityScore = Math.round(Math.max(0, 100 - criticalCount * 8))
  const healthScore = Math.round(complianceScore * 0.4 + costScore * 0.3 + securityScore * 0.3)

  // Build unified action queue
  const actionQueue = buildActionQueue(failingControls, finops)
  const latestScan = scans?.[0]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            {latestScan?.completedAt
              ? `Last scan ${formatDistanceToNow(new Date(latestScan.completedAt), { addSuffix: true })}`
              : 'Waiting for first scan...'}
          </p>
        </div>
      </div>

      {/* Cloud Health Score */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Cloud Health</p>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(51,6,61,0.06)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="#8A63E6" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${healthScore * 2.64} 264`}
                />
              </svg>
              <span className="font-mono text-3xl font-semibold text-ink">{healthScore || '—'}</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <ScoreBreakdown label="Compliance" score={complianceScore} weight="40%" color="#8A63E6" />
            <ScoreBreakdown label="Cost Efficiency" score={costScore} weight="30%" color="#067647" />
            <ScoreBreakdown label="Security" score={securityScore} weight="30%" color="#33063D" />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="SOC 2 Readiness"
          value={`${complianceScore}%`}
          icon={<Shield size={16} style={{ color: '#8A63E6' }} />}
        />
        <KpiCard
          label="Detected Savings"
          value={finops?.summary ? `$${Math.round(finops.summary.totalMonthlySavings || 0).toLocaleString()}/mo` : '—'}
          icon={<DollarSign size={16} style={{ color: '#067647' }} />}
        />
        <KpiCard
          label="Open Findings"
          value={actionQueue.length}
          icon={<AlertTriangle size={16} style={{ color: '#B42318' }} />}
        />
        <KpiCard
          label="Last Scan"
          value={latestScan?.completedAt ? formatDistanceToNow(new Date(latestScan.completedAt), { addSuffix: true }) : 'Never'}
          icon={<Clock size={16} className="text-muted" />}
        />
      </div>

      {/* Unified Action Queue */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-ink flex items-center gap-2">
            <Zap size={14} style={{ color: '#8A63E6' }} />
            Action Queue
            {actionQueue.length > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(138,99,230,0.1)', color: '#8A63E6' }}>
                {actionQueue.length}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <FilterPill label="All" active />
            <FilterPill label="Compliance" />
            <FilterPill label="Cost" />
          </div>
        </div>

        {actionQueue.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CheckCircle size={32} style={{ color: '#8A63E6' }} className="mx-auto mb-3" />
            <p className="text-sm font-medium text-ink">No open findings</p>
            <p className="text-xs text-muted mt-1">Connect AWS and run a scan to see findings here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actionQueue.slice(0, 20).map((item, i) => (
              <ActionRow key={i} item={item} />
            ))}
            {actionQueue.length > 20 && (
              <div className="px-5 py-3 text-center">
                <span className="text-xs text-muted">Showing 20 of {actionQueue.length} findings</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildActionQueue(failingControls: any[], finops: any) {
  const items: ActionItem[] = []

  // Add compliance findings
  for (const control of failingControls) {
    items.push({
      type: 'Compliance',
      severity: control.severity || 'medium',
      title: control.title,
      detail: control.controlId,
      dollarValue: null,
      framework: control.framework,
      href: `/compliance`,
    })
  }

  // Add cost findings (waste)
  if (finops?.waste) {
    for (const w of finops.waste) {
      items.push({
        type: 'Cost',
        severity: w.estimatedMonthlySavings > 100 ? 'high' : 'medium',
        title: w.recommendation || `${w.type}: ${w.resourceId}`,
        detail: w.resourceId,
        dollarValue: w.estimatedMonthlySavings,
        framework: null,
        href: `/cost`,
      })
    }
  }

  // Add rightsizing findings
  if (finops?.rightsizing) {
    for (const r of finops.rightsizing) {
      items.push({
        type: 'Cost',
        severity: 'medium',
        title: `Rightsize ${r.instanceId || r.resourceId}`,
        detail: r.instanceType ? `${r.instanceType} → ${r.recommendedType}` : r.resourceId,
        dollarValue: r.estimatedMonthlySavings,
        framework: null,
        href: `/cost`,
      })
    }
  }

  // Sort by impact: critical first, then by dollar value
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  items.sort((a, b) => {
    const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
    if (rankDiff !== 0) return rankDiff
    return (b.dollarValue || 0) - (a.dollarValue || 0)
  })

  return items
}

interface ActionItem {
  type: 'Compliance' | 'Cost' | 'Security' | 'Both'
  severity: string
  title: string
  detail: string
  dollarValue: number | null
  framework: string | null
  href: string
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreBreakdown({ label, score, weight, color }: { label: string; score: number; weight: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs text-muted">{weight}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(51,6,61,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="font-mono text-sm font-medium text-ink">{score}%</span>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        {icon}
      </div>
      <span className="font-mono text-xl font-semibold text-ink">{value}</span>
    </div>
  )
}

function FilterPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={clsx(
        'text-xs px-2.5 py-1 rounded-full transition-colors',
        active
          ? 'font-medium text-ink'
          : 'text-muted hover:text-ink'
      )}
      style={active ? { background: '#DAC0FD', color: '#33063D' } : undefined}
    >
      {label}
    </button>
  )
}

function ActionRow({ item }: { item: ActionItem }) {
  const severityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#FEF3F2', text: '#B42318' },
    high: { bg: '#FEF3F2', text: '#B42318' },
    medium: { bg: '#FFFAEB', text: '#B54708' },
    low: { bg: '#F8F7FA', text: 'rgba(51,6,61,0.65)' },
  }
  const typeColors: Record<string, { bg: string; text: string }> = {
    Compliance: { bg: 'rgba(138,99,230,0.1)', text: '#8A63E6' },
    Cost: { bg: '#ECFDF3', text: '#067647' },
    Security: { bg: 'rgba(51,6,61,0.08)', text: '#33063D' },
    Both: { bg: '#FFFAEB', text: '#B54708' },
  }
  const sev = severityColors[item.severity] || severityColors.medium
  const typ = typeColors[item.type] || typeColors.Compliance

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-5 py-3 hover:bg-surface transition-colors group"
    >
      {/* Severity badge */}
      <span
        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: sev.bg, color: sev.text }}
      >
        {item.severity}
      </span>

      {/* Title + detail */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{item.title}</p>
        <p className="text-xs text-muted truncate">{item.detail}</p>
      </div>

      {/* Type tag */}
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: typ.bg, color: typ.text }}
      >
        {item.type}
      </span>

      {/* Dollar value */}
      {item.dollarValue && (
        <span className="font-mono text-xs font-medium text-green flex-shrink-0">
          ${Math.round(item.dollarValue).toLocaleString()}/mo
        </span>
      )}

      <ChevronRight size={14} className="text-border group-hover:text-muted transition-colors flex-shrink-0" />
    </Link>
  )
}
