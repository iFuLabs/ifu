'use client'
import { useState, useEffect, useRef } from 'react'
import { TrendingDown, AlertTriangle, Zap, BarChart2, RefreshCw, ChevronDown, ChevronUp, DollarSign, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import clsx from 'clsx'

interface Finding {
  monthlyCost: number
  forecastedCost: number
  totalMonthlySavings: number
  waste: WasteItem[]
  rightsizing: RightsizingItem[]
  reservations: CoverageItem[]
  savingsPlans: CoverageItem[]
  topServices: ServiceCost[]
  summary: Summary
  aiSummary?: string
  cached?: boolean
}

interface WasteItem {
  type: string
  resourceId: string
  resourceType: string
  description: string
  estimatedMonthlySavings: number
  recommendation: string
  severity: 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
}

interface RightsizingItem {
  resourceId: string
  currentType: string
  targetType: string | null
  action: 'downsize' | 'terminate'
  estimatedMonthlySavings: number
  cpuUtilization: number
  memUtilization: number
  recommendation: string
}

interface CoverageItem {
  service: string
  coveragePercentage: number
  onDemandCost: number
  recommendation: string
}

interface ServiceCost {
  service: string
  cost: number
  unit: string
}

interface Summary {
  wasteItems: number
  rightsizingItems: number
  totalMonthlySavings: number
  totalAnnualSavings: number
  coverageGaps: number
  checkedAt: string
}

export default function FinOpsPage() {
  const [findings, setFindings] = useState<Finding | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'waste' | 'rightsizing' | 'coverage'>('waste')
  const esRef = useRef<EventSource | null>(null)

  // Load cached findings on mount
  useEffect(() => {
    fetch('/api/v1/finops')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setFindings(data) })
      .catch(() => {})
  }, [])

  const runScan = () => {
    setScanning(true)
    setProgress(0)
    setError('')
    setStatusMsg('Connecting to AWS...')

    const es = new EventSource('/api/v1/finops/stream')
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress' || data.type === 'status') {
        setProgress(data.progress || 0)
        setStatusMsg(data.message || '')
      }
      if (data.type === 'complete') {
        setFindings(data.findings)
        setScanning(false)
        setProgress(100)
        es.close()
      }
      if (data.type === 'error') {
        setError(data.message)
        setScanning(false)
        es.close()
      }
    }

    es.onerror = () => {
      setError('Connection lost. Try again.')
      setScanning(false)
      es.close()
    }
  }

  const stopScan = () => {
    esRef.current?.close()
    setScanning(false)
  }

  if (!findings && !scanning) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-normal text-ink">FinOps</h1>
          <p className="text-sm text-muted mt-0.5">Cost optimisation analysis for your AWS account.</p>
        </div>

        <div className="bg-card border border-border rounded-xl px-8 py-16 text-center">
          <div className="w-14 h-14 bg-brand-light rounded-xl flex items-center justify-center mx-auto mb-4">
            <DollarSign size={24} className="text-brand" />
          </div>
          <h2 className="text-lg font-medium text-ink mb-2">No FinOps data yet</h2>
          <p className="text-sm text-muted max-w-sm mx-auto mb-6">
            Run your first cost analysis to find waste, rightsizing opportunities, and coverage gaps in your AWS account.
          </p>
          {error && <p className="text-xs text-danger mb-4">{error}</p>}
          <button
            onClick={runScan}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm rounded-lg hover:bg-brand-mid transition-all"
          >
            <Zap size={15} />
            Run cost analysis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">FinOps</h1>
          {findings?.summary?.checkedAt && (
            <p className="text-xs text-muted mt-0.5 font-mono">
              Last analysed {new Date(findings.summary.checkedAt).toLocaleString()}
              {findings.cached && ' · cached'}
            </p>
          )}
        </div>
        <button
          onClick={scanning ? stopScan : runScan}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 text-sm border rounded transition-all',
            scanning
              ? 'border-danger/30 text-danger hover:bg-danger/5'
              : 'border-border text-muted hover:text-ink hover:bg-bg'
          )}
        >
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Stop scan' : 'Re-analyse'}
        </button>
      </div>

      {/* Scan progress */}
      {scanning && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-ink">{statusMsg}</span>
            <span className="font-mono text-xs text-muted">{progress}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {findings && (
        <>
          {/* AI Summary */}
          {findings.aiSummary && (
            <div className="bg-gradient-to-r from-brand-light to-blue-50 border border-brand/20 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-ink mb-1">AI Insights</h3>
                  <p className="text-sm text-muted leading-relaxed">{findings.aiSummary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Monthly spend"
              value={`$${findings.monthlyCost?.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '—'}`}
              sub={findings.forecastedCost ? `Forecast: $${Math.round(findings.forecastedCost).toLocaleString()}` : undefined}
              icon={<DollarSign size={16} className="text-muted" />}
            />
            <SummaryCard
              label="Monthly savings found"
              value={`$${findings.summary.totalMonthlySavings.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              sub={`$${findings.summary.totalAnnualSavings.toLocaleString()} / year`}
              icon={<TrendingDown size={16} className="text-green" />}
              highlight
            />
            <SummaryCard
              label="Waste items"
              value={String(findings.summary.wasteItems)}
              sub="idle or unused resources"
              icon={<AlertTriangle size={16} className="text-warn" />}
            />
            <SummaryCard
              label="Rightsizing opps"
              value={String(findings.summary.rightsizingItems)}
              sub="oversized instances"
              icon={<BarChart2 size={16} className="text-brand" />}
            />
          </div>

          {/* Top services chart */}
          {findings.topServices?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-ink mb-4">Top AWS services by spend this month</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={findings.topServices.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="service"
                    width={160}
                    tick={{ fontSize: 11 }}
                    tickFormatter={s => s.replace('Amazon ', '').replace('AWS ', '').slice(0, 22)}
                  />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {findings.topServices.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#1B3A5C' : i < 3 ? '#2E5F8A' : '#D1D5DB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
            {(['waste', 'rightsizing', 'coverage'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-1.5 text-xs font-medium rounded transition-all capitalize',
                  activeTab === tab
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                )}
              >
                {tab === 'waste' && `Waste (${findings.waste.length})`}
                {tab === 'rightsizing' && `Rightsizing (${findings.rightsizing.length})`}
                {tab === 'coverage' && `Coverage gaps (${findings.summary.coverageGaps})`}
              </button>
            ))}
          </div>

          {/* Waste tab */}
          {activeTab === 'waste' && (
            <div className="space-y-2">
              {findings.waste.length === 0 ? (
                <EmptyState icon="✓" title="No waste detected" desc="No idle or unattached resources found in your account." />
              ) : (
                findings.waste
                  .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
                  .map((item, i) => <WasteCard key={i} item={item} />)
              )}
            </div>
          )}

          {/* Rightsizing tab */}
          {activeTab === 'rightsizing' && (
            <div className="space-y-2">
              {findings.rightsizing.length === 0 ? (
                <EmptyState icon="✓" title="No rightsizing opportunities" desc="All EC2 instances appear to be appropriately sized." />
              ) : (
                findings.rightsizing
                  .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
                  .map((item, i) => <RightsizingCard key={i} item={item} />)
              )}
            </div>
          )}

          {/* Coverage tab */}
          {activeTab === 'coverage' && (
            <div className="space-y-2">
              {[...findings.reservations, ...findings.savingsPlans].length === 0 ? (
                <EmptyState icon="—" title="No coverage data" desc="Coverage data requires sufficient spend history in Cost Explorer." />
              ) : (
                [...findings.reservations, ...findings.savingsPlans]
                  .sort((a, b) => a.coveragePercentage - b.coveragePercentage)
                  .map((item, i) => <CoverageCard key={i} item={item} />)
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, icon, highlight }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className={clsx('border rounded-xl p-4', highlight ? 'bg-green-light border-green/20' : 'bg-card border-border')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">{label}</span>
        {icon}
      </div>
      <div className={clsx('font-mono text-2xl font-medium', highlight ? 'text-green' : 'text-ink')}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  )
}

function WasteCard({ item }: { item: WasteItem }) {
  const [expanded, setExpanded] = useState(false)
  const severityColor = { high: 'text-danger bg-danger/10', medium: 'text-warn bg-warn/10', low: 'text-muted bg-border' }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-ink">{item.resourceType}</span>
            <span className={clsx('font-mono text-[10px] px-1.5 py-0.5 rounded capitalize', severityColor[item.severity])}>
              {item.severity}
            </span>
          </div>
          <p className="text-sm text-muted truncate">{item.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm font-medium text-green">
            ${item.estimatedMonthlySavings.toFixed(0)}/mo
          </div>
          <div className="text-xs text-muted">${(item.estimatedMonthlySavings * 12).toFixed(0)}/yr</div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-muted flex-shrink-0" />}
      </div>
      {expanded && (
        <div className="px-5 pb-4 border-t border-border bg-bg space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Resource ID</div>
            <code className="text-xs font-mono text-ink">{item.resourceId}</code>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink mb-1">
              <ArrowRight size={12} className="text-green" /> Recommended action
            </div>
            <p className="text-xs text-muted leading-relaxed">{item.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function RightsizingCard({ item }: { item: RightsizingItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted">{item.resourceId}</span>
            <span className={clsx(
              'font-mono text-[10px] px-1.5 py-0.5 rounded',
              item.action === 'terminate' ? 'text-danger bg-danger/10' : 'text-warn bg-warn/10'
            )}>
              {item.action}
            </span>
          </div>
          <p className="text-sm text-ink">
            {item.currentType}
            {item.targetType && <span className="text-muted"> → {item.targetType}</span>}
          </p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-muted font-mono">CPU: {item.cpuUtilization.toFixed(1)}%</span>
            {item.memUtilization > 0 && <span className="text-xs text-muted font-mono">Mem: {item.memUtilization.toFixed(1)}%</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm font-medium text-green">${item.estimatedMonthlySavings.toFixed(0)}/mo</div>
          <div className="text-xs text-muted">${(item.estimatedMonthlySavings * 12).toFixed(0)}/yr</div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-muted flex-shrink-0" />}
      </div>
      {expanded && (
        <div className="px-5 pb-4 border-t border-border bg-bg">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink mb-1">
            <ArrowRight size={12} className="text-green" /> Recommendation
          </div>
          <p className="text-xs text-muted leading-relaxed">{item.recommendation}</p>
        </div>
      )}
    </div>
  )
}

function CoverageCard({ item }: { item: CoverageItem }) {
  const pct = item.coveragePercentage
  const barColor = pct >= 70 ? 'bg-green' : pct >= 50 ? 'bg-warn' : 'bg-danger'

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-ink">{item.service.replace('Amazon ', '').replace('AWS ', '')}</span>
        <span className={clsx('font-mono text-sm font-medium', pct >= 70 ? 'text-green' : pct >= 50 ? 'text-warn' : 'text-danger')}>
          {pct}% covered
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
        <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted leading-relaxed">{item.recommendation}</p>
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-6 py-12 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
    </div>
  )
}
