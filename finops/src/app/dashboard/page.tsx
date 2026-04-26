'use client'
import { useState, useEffect, useRef } from 'react'
import { TrendingDown, AlertTriangle, Zap, BarChart2, RefreshCw, ChevronDown, ChevronUp, DollarSign, ArrowRight, Check, Clock, X, Copy, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
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

type RecommendationState = 'open' | 'snoozed' | 'done' | 'dismissed'

interface RecommendationStateData {
  id: string
  resourceId: string
  category: string
  state: RecommendationState
  notes?: string
  snoozedUntil?: string
  dismissalReason?: string
  dismissalNote?: string
}

export default function FinOpsPage() {
  const [findings, setFindings] = useState<Finding | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'waste' | 'rightsizing' | 'commitments' | 'alerts'>('waste')
  const [states, setStates] = useState<Map<string, RecommendationStateData>>(new Map())
  const [stateFilter, setStateFilter] = useState<RecommendationState | 'all'>('all')
  const esRef = useRef<EventSource | null>(null)

  // F-A3: Anomalies and budgets state
  const [alertAnomalies, setAlertAnomalies] = useState<any[]>([])
  const [alertBudgets, setAlertBudgets] = useState<any[]>([])

  // F-A8: Purchase recommendations
  const [purchaseRecs, setPurchaseRecs] = useState<any>(null)
  useEffect(() => {
    Promise.all([
      fetch('/api/v1/budgets/anomalies?status=open').then(r => r.ok ? r.json() : []),
      fetch('/api/v1/budgets').then(r => r.ok ? r.json() : []),
      fetch('/api/v1/finops/purchase-recommendations').then(r => r.ok ? r.json() : null)
    ]).then(([anomalyData, budgetData, purchaseData]) => {
      setAlertAnomalies(Array.isArray(anomalyData) ? anomalyData : [])
      setAlertBudgets(Array.isArray(budgetData) ? budgetData : [])
      if (purchaseData) setPurchaseRecs(purchaseData)
    }).catch(() => {})
  }, [])

  // F-A2: Trend chart state
  const [trend, setTrend] = useState<any>(null)
  const [trendDays, setTrendDays] = useState<30 | 90 | 180>(90)
  const [trendLoading, setTrendLoading] = useState(false)

  // Load trend data
  useEffect(() => {
    setTrendLoading(true)
    fetch(`/api/v1/finops/trend?days=${trendDays}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTrend(data) })
      .catch(() => {})
      .finally(() => setTrendLoading(false))
  }, [trendDays])

  // Load cached findings and states on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/v1/finops').then(r => r.ok ? r.json() : null),
      fetch('/api/v1/finops/recommendations/states').then(r => r.ok ? r.json() : null)
    ]).then(([findingsData, statesData]) => {
      if (findingsData && !findingsData.error) setFindings(findingsData)
      if (statesData?.states) {
        const stateMap = new Map()
        statesData.states.forEach((s: RecommendationStateData) => {
          stateMap.set(`${s.category}:${s.resourceId}`, s)
        })
        setStates(stateMap)
      }
    }).catch(() => {})
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

  const updateState = async (resourceId: string, category: 'waste' | 'rightsizing', newState: RecommendationState, extra?: { snoozedUntil?: string; dismissalReason?: string; dismissalNote?: string }) => {
    try {
      const response = await fetch(`/api/v1/finops/recommendations/${encodeURIComponent(resourceId)}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, state: newState, ...extra })
      })
      
      if (response.ok) {
        const updated = await response.json()
        setStates(prev => new Map(prev).set(`${category}:${resourceId}`, updated))
      }
    } catch (err) {
      console.error('Failed to update state:', err)
    }
  }

  const getState = (resourceId: string, category: 'waste' | 'rightsizing'): RecommendationState => {
    return states.get(`${category}:${resourceId}`)?.state || 'open'
  }

  const filterItems = <T extends { resourceId: string }>(items: T[], category: 'waste' | 'rightsizing'): T[] => {
    if (stateFilter === 'all') return items
    return items.filter(item => getState(item.resourceId, category) === stateFilter)
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
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs font-mono" style={{ color: 'rgba(51, 6, 61, 0.65)', fontSize: 13 }}>
                Last analysed {new Date(findings.summary.checkedAt).toLocaleString()}
                {findings.cached && ' · cached'}
              </p>
              <button
                onClick={runScan}
                disabled={scanning}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
                style={{ fontSize: 13 }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
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

          {/* F-A2: Cost trend chart */}
          {trend && trend.series?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-medium text-ink">Cost trend</h2>
                  {trend.previousTotal > 0 && (() => {
                    const delta = trend.total - trend.previousTotal
                    const pct = ((delta / trend.previousTotal) * 100).toFixed(1)
                    const isUp = delta > 0
                    return (
                      <p className="text-xs mt-1" style={{ color: isUp ? '#B42318' : '#067647' }}>
                        {isUp ? '↑' : '↓'} ${Math.abs(Math.round(delta)).toLocaleString()} ({isUp ? '+' : ''}{pct}%) vs prior period
                      </p>
                    )
                  })()}
                </div>
                <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
                  {([30, 90, 180] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setTrendDays(d)}
                      className={clsx(
                        'px-3 py-1 text-xs font-medium rounded transition-all',
                        trendDays === d ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                      )}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              {trendLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <RefreshCw size={16} className="animate-spin text-muted" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend.series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      interval={Math.floor(trend.series.length / 6)}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} width={50} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(51,6,61,0.12)' }}
                      formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name.replace('Amazon ', '').replace('AWS ', '')]}
                      labelFormatter={d => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                    />
                    {(trend.topServices || []).map((svc: string, i: number) => {
                      const colors = ['#8A63E6', '#DAC0FD', '#C8F6C0', '#FEDF89', '#FCA5A5']
                      return (
                        <Area
                          key={svc}
                          type="monotone"
                          dataKey={`byService.${svc}`}
                          name={svc}
                          stackId="1"
                          fill={colors[i] || '#D1D5DB'}
                          stroke={colors[i] || '#D1D5DB'}
                          fillOpacity={0.6}
                        />
                      )
                    })}
                    <Area
                      type="monotone"
                      dataKey="byService.Other"
                      name="Other"
                      stackId="1"
                      fill="#D1D5DB"
                      stroke="#D1D5DB"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

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
                      <Cell key={i} fill={i === 0 ? '#8A63E6' : i < 3 ? 'rgba(138, 99, 230, 0.3)' : '#D1D5DB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabs and filter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
              {(['waste', 'rightsizing', 'commitments', 'alerts'] as const).map(tab => (
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
                  {tab === 'waste' && `Waste (${filterItems(findings.waste, 'waste').length})`}
                  {tab === 'rightsizing' && `Rightsizing (${filterItems(findings.rightsizing, 'rightsizing').length})`}
                  {tab === 'commitments' && `Commitments`}
                  {tab === 'alerts' && `Alerts (${alertAnomalies.length})`}
                </button>
              ))}
            </div>

            {(activeTab === 'waste' || activeTab === 'rightsizing') && (
              <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
                {(['all', 'open', 'snoozed', 'done', 'dismissed'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setStateFilter(filter)}
                    className={clsx(
                      'px-3 py-1 text-xs font-medium rounded transition-all capitalize',
                      stateFilter === filter
                        ? 'bg-card text-ink shadow-sm'
                        : 'text-muted hover:text-ink'
                    )}
                  >
                    {filter}{filter === 'done' ? (() => {
                      const doneItems = [...states.values()].filter(s => s.state === 'done')
                      return doneItems.length > 0 ? ` (${doneItems.length})` : ''
                    })() : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Waste tab */}
          {activeTab === 'waste' && (
            <div className="space-y-2">
              {filterItems(findings.waste, 'waste').length === 0 ? (
                <EmptyState 
                  icon={stateFilter === 'all' ? "✓" : "—"} 
                  title={stateFilter === 'all' ? "No waste detected" : `No ${stateFilter} items`}
                  desc={stateFilter === 'all' ? "No idle or unattached resources found in your account." : `No waste items in ${stateFilter} state.`}
                />
              ) : (
                filterItems(findings.waste, 'waste')
                  .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
                  .map((item, i) => (
                    <WasteCard 
                      key={i} 
                      item={item} 
                      state={getState(item.resourceId, 'waste')}
                      onStateChange={(newState, extra) => updateState(item.resourceId, 'waste', newState, extra)}
                    />
                  ))
              )}
            </div>
          )}

          {/* Rightsizing tab */}
          {activeTab === 'rightsizing' && (
            <div className="space-y-2">
              {filterItems(findings.rightsizing, 'rightsizing').length === 0 ? (
                <EmptyState 
                  icon={stateFilter === 'all' ? "✓" : "—"} 
                  title={stateFilter === 'all' ? "No rightsizing opportunities" : `No ${stateFilter} items`}
                  desc={stateFilter === 'all' ? "All EC2 instances appear to be appropriately sized." : `No rightsizing items in ${stateFilter} state.`}
                />
              ) : (
                filterItems(findings.rightsizing, 'rightsizing')
                  .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
                  .map((item, i) => (
                    <RightsizingCard 
                      key={i} 
                      item={item}
                      state={getState(item.resourceId, 'rightsizing')}
                      onStateChange={(newState, extra) => updateState(item.resourceId, 'rightsizing', newState, extra)}
                    />
                  ))
              )}
            </div>
          )}

          {/* Commitments tab (F-A8) — replaces old coverage tab */}
          {activeTab === 'commitments' && (
            <div className="space-y-4">
              {/* Current coverage from existing findings */}
              {[...findings.reservations, ...findings.savingsPlans].length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-ink mb-2">Current coverage</h3>
                  <div className="space-y-2">
                    {[...findings.reservations, ...findings.savingsPlans]
                      .sort((a, b) => a.coveragePercentage - b.coveragePercentage)
                      .map((item, i) => <CoverageCard key={i} item={item} />)}
                  </div>
                </div>
              )}

              {/* Purchase recommendations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-ink">Purchase recommendations</h3>
                  {purchaseRecs?.totalAnnualSavings > 0 && (
                    <span className="font-mono text-sm font-semibold text-green">
                      ${purchaseRecs.totalAnnualSavings.toLocaleString()}/yr potential savings
                    </span>
                  )}
                </div>

                {!purchaseRecs ? (
                  <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
                    <RefreshCw size={20} className="animate-spin text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">Loading recommendations...</p>
                  </div>
                ) : (purchaseRecs.savingsPlans.length === 0 && purchaseRecs.reservations.length === 0) ? (
                  <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
                    <p className="text-sm font-medium text-ink">No purchase recommendations</p>
                    <p className="text-xs text-muted mt-1">Requires sufficient spend history in Cost Explorer</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {purchaseRecs.savingsPlans.map((sp: any, i: number) => (
                      <div key={`sp-${i}`} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">{sp.savingsPlansType} Savings Plan</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-accent">{sp.term} · {sp.paymentOption}</span>
                          </div>
                          <span className="font-mono text-sm font-semibold text-green">${sp.estimatedMonthlySavings}/mo</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs mt-3">
                          <div>
                            <span className="text-muted block">Hourly commitment</span>
                            <span className="font-mono text-ink">${sp.hourlyCommitment}/hr</span>
                          </div>
                          <div>
                            <span className="text-muted block">Upfront cost</span>
                            <span className="font-mono text-ink">${sp.upfrontCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted block">Break-even</span>
                            <span className="font-mono text-ink">{sp.breakEvenMonths} months</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {purchaseRecs.reservations.map((ri: any, i: number) => (
                      <div key={`ri-${i}`} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">RI: {ri.instanceType}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted">{ri.term} · {ri.platform} · {ri.region}</span>
                          </div>
                          <span className="font-mono text-sm font-semibold text-green">${ri.estimatedMonthlySavings}/mo</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs mt-3">
                          <div>
                            <span className="text-muted block">Quantity</span>
                            <span className="font-mono text-ink">{ri.recommendedCount}</span>
                          </div>
                          <div>
                            <span className="text-muted block">Upfront</span>
                            <span className="font-mono text-ink">${ri.upfrontCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted block">Monthly</span>
                            <span className="font-mono text-ink">${ri.recurringMonthlyCost}</span>
                          </div>
                          <div>
                            <span className="text-muted block">Break-even</span>
                            <span className="font-mono text-ink">{ri.breakEvenMonths}mo</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts tab (F-A3) */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Open anomalies */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-2">Cost anomalies</h3>
                {alertAnomalies.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
                    <CheckIcon />
                    <p className="text-sm font-medium text-ink mt-2">No anomalies detected</p>
                    <p className="text-xs text-muted mt-1">We check daily for unusual spend spikes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alertAnomalies.map((a: any) => (
                      <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                          background: a.severity === 'critical' ? '#FEF3F2' : a.severity === 'high' ? '#FEF3F2' : '#FFFAEB'
                        }}>
                          <AlertTriangle size={16} style={{
                            color: a.severity === 'critical' ? '#B42318' : a.severity === 'high' ? '#B42318' : '#B54708'
                          }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{(a.scopeValue || '').replace('Amazon ', '').replace('AWS ', '')}</p>
                          <p className="text-xs text-muted">
                            ${parseFloat(a.observedCost).toFixed(0)} yesterday vs ${parseFloat(a.baselineCost).toFixed(0)} baseline (+{parseFloat(a.deltaPct).toFixed(0)}%)
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch(`/api/v1/budgets/anomalies/${a.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'acknowledged' })
                            })
                            setAlertAnomalies(prev => prev.filter(x => x.id !== a.id))
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-surface hover:bg-border text-muted hover:text-ink transition-all"
                        >
                          Acknowledge
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Budgets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-ink">Budgets</h3>
                </div>
                {alertBudgets.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl px-6 py-8 text-center">
                    <p className="text-sm text-muted">No budgets configured</p>
                    <p className="text-xs text-muted mt-1">Set up budgets to get alerted when spend exceeds thresholds</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alertBudgets.map((b: any) => {
                      const pct = b.lastNotifiedThreshold || 0
                      return (
                        <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-ink">{b.name}</span>
                            <span className="font-mono text-xs text-muted">${parseFloat(b.monthlyAmount).toLocaleString()}/mo</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(51, 6, 61, 0.08)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                background: pct >= 100 ? '#B42318' : pct >= 80 ? '#B54708' : '#8A63E6'
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>{b.scope === 'org' ? 'All services' : b.scopeValue}</span>
                            <span>{pct > 0 ? `${pct}% used` : 'Under threshold'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
    <div className={clsx('border rounded-xl p-6', highlight ? 'bg-green-light border-green/20' : 'bg-card border-border')}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(51, 6, 61, 0.65)' }}>{label}</span>
        {icon}
      </div>
      <div className={clsx('font-mono font-semibold', highlight ? 'text-green' : 'text-ink')} style={{ fontSize: 24 }}>{value}</div>
      {sub && <div className="text-xs mt-2" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>{sub}</div>}
    </div>
  )
}

function WasteCard({ item, state, onStateChange }: { 
  item: WasteItem
  state: RecommendationState
  onStateChange: (state: RecommendationState, extra?: { snoozedUntil?: string; dismissalReason?: string; dismissalNote?: string }) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const severityColor = { high: 'text-danger bg-danger/10', medium: 'text-warn bg-warn/10', low: 'text-muted bg-border' }

  // Extract region from metadata or resourceId (e.g., arn:aws:ec2:us-east-1:...)
  const region = item.metadata?.region || item.resourceId?.match(/arn:aws:[^:]+:([^:]+)/)?.[1] || null

  // Calculate age from metadata.createTime or firstDetectedAt
  const detectedDate = item.metadata?.createTime || item.metadata?.startTime
  const ageInDays = detectedDate ? Math.floor((Date.now() - new Date(detectedDate).getTime()) / (1000 * 60 * 60 * 24)) : item.metadata?.ageInDays || null

  // Extract CLI command from recommendation text
  const cliMatch = item.recommendation?.match(/(aws\s+\S+\s+\S+.*?)$/m)
  const cliCommand = cliMatch?.[1]

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cliCommand) {
      await navigator.clipboard.writeText(cliCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={clsx(
      'bg-card border rounded-xl overflow-hidden transition-all',
      state === 'done' ? 'border-green/30 opacity-60' : 'border-border'
    )}>
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
            <StateIndicator state={state} />
            {region && (
              <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted">
                <MapPin size={9} />
                {region}
              </span>
            )}
            {ageInDays !== null && (
              <span className="font-mono text-[10px] text-muted">{ageInDays}d ago</span>
            )}
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
            <div className="flex items-start gap-2">
              <p className="text-xs text-muted leading-relaxed flex-1">{item.recommendation}</p>
              {cliCommand && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-surface hover:bg-border text-muted hover:text-ink transition-all flex-shrink-0"
                  title="Copy CLI command"
                >
                  <Copy size={10} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          <StateButtons currentState={state} onChange={onStateChange} />
        </div>
      )}
    </div>
  )
}

function RightsizingCard({ item, state, onStateChange }: { 
  item: RightsizingItem
  state: RecommendationState
  onStateChange: (state: RecommendationState, extra?: { snoozedUntil?: string; dismissalReason?: string; dismissalNote?: string }) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const cliMatch = item.recommendation?.match(/(aws\s+\S+\s+\S+.*?)$/m)
  const cliCommand = cliMatch?.[1]

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cliCommand) {
      await navigator.clipboard.writeText(cliCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={clsx(
      'bg-card border rounded-xl overflow-hidden transition-all',
      state === 'done' ? 'border-green/30 opacity-60' : 'border-border'
    )}>
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
            <StateIndicator state={state} />
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
        <div className="px-5 pb-4 border-t border-border bg-bg space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink mb-1">
            <ArrowRight size={12} className="text-green" /> Recommendation
          </div>
          <div className="flex items-start gap-2">
            <p className="text-xs text-muted leading-relaxed flex-1">{item.recommendation}</p>
            {cliCommand && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-surface hover:bg-border text-muted hover:text-ink transition-all flex-shrink-0"
                title="Copy CLI command"
              >
                <Copy size={10} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <StateButtons currentState={state} onChange={onStateChange} />
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

function CheckIcon() {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto" style={{ background: '#ECFDF3' }}>
      <Check size={18} style={{ color: '#067647' }} />
    </div>
  )
}

function StateIndicator({ state }: { state: RecommendationState }) {
  const config = {
    open: { icon: null, color: '' },
    snoozed: { icon: Clock, color: 'text-warn bg-warn/10' },
    done: { icon: Check, color: 'text-green bg-green/10' },
    dismissed: { icon: X, color: 'text-muted bg-border' }
  }
  
  const { icon: Icon, color } = config[state]
  if (!Icon) return null
  
  return (
    <span className={clsx('flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded capitalize', color)}>
      <Icon size={10} />
      {state}
    </span>
  )
}

function StateButtons({ currentState, onChange }: { 
  currentState: RecommendationState
  onChange: (state: RecommendationState, extra?: { snoozedUntil?: string; dismissalReason?: string; dismissalNote?: string }) => void
}) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState<string>('cost_acceptable')

  const snoozePresets = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
  ]

  const dismissReasons = [
    { value: 'business_critical', label: 'Business critical' },
    { value: 'cost_acceptable', label: 'Cost acceptable' },
    { value: 'pending_approval', label: 'Pending approval' },
    { value: 'wont_fix', label: "Won't fix" },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted">Status:</span>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onChange('open') }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all',
              currentState === 'open'
                ? 'bg-brand text-white'
                : 'bg-surface text-muted hover:text-ink hover:bg-border'
            )}
          >
            Open
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSnooze(!showSnooze); setShowDismiss(false) }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all',
              currentState === 'snoozed'
                ? 'bg-warn text-white'
                : 'bg-surface text-muted hover:text-ink hover:bg-border'
            )}
          >
            <Clock size={10} />
            Snooze
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onChange('done') }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all',
              currentState === 'done'
                ? 'bg-green text-white'
                : 'bg-surface text-muted hover:text-ink hover:bg-border'
            )}
          >
            <Check size={10} />
            Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDismiss(!showDismiss); setShowSnooze(false) }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all',
              currentState === 'dismissed'
                ? 'bg-muted text-white'
                : 'bg-surface text-muted hover:text-ink hover:bg-border'
            )}
          >
            <X size={10} />
            Dismiss
          </button>
        </div>
      </div>

      {showSnooze && (
        <div className="flex items-center gap-2 pl-12" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-muted">Snooze for:</span>
          {snoozePresets.map(p => (
            <button
              key={p.days}
              onClick={() => {
                const until = new Date(Date.now() + p.days * 24 * 60 * 60 * 1000).toISOString()
                onChange('snoozed', { snoozedUntil: until })
                setShowSnooze(false)
              }}
              className="px-2 py-1 text-[10px] font-medium rounded bg-warn/10 text-warn hover:bg-warn/20 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {showDismiss && (
        <div className="flex items-center gap-2 pl-12 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-muted">Reason:</span>
          <select
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            className="text-[10px] px-2 py-1 rounded border border-border bg-card text-ink"
          >
            {dismissReasons.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              onChange('dismissed', { dismissalReason: dismissReason })
              setShowDismiss(false)
            }}
            className="px-2 py-1 text-[10px] font-medium rounded bg-muted/10 text-muted hover:bg-muted/20 transition-all"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}
