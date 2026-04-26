'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { AiInsightCard } from '@/components/AiInsightCard'
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from 'recharts'
import { Shield, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight, Zap, TrendingDown, DollarSign, Lock, CheckCircle2, AlertCircle, MoonStar } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import React from 'react'

export default function DashboardPage() {
  const { data: score, isLoading: scoreLoading, mutate: mutateScore } = useSWR<any>('score', api.controls.score, { refreshInterval: 30000 })
  const { data: controls, mutate: mutateControls } = useSWR<any[]>('controls', api.controls.list, { refreshInterval: 10000 })
  const { data: scans, mutate: mutateScans } = useSWR<any[]>('scans', api.scans.list, { refreshInterval: 3000 })
  const { data: planFeatures } = useSWR<any>('plan-features', api.plan.features)
  const { data: integrations } = useSWR<any[]>('integrations', api.integrations.list)
  const [isScanning, setIsScanning] = React.useState(false)
  const [lastScanTime, setLastScanTime] = React.useState<number>(0)

  const { data: finopsSummary } = useSWR<any>('finops-summary', async () => {
    // Auth cookie is sent automatically
    return fetch('/api/v1/finops/summary', {
      credentials: 'include'
    }).then(r => r.json()).catch(() => null)
  })
  const failingControls = controls?.filter(c => c.status === 'fail') || []
  const latestScan = scans?.[0]
  const hasRunningScan = scans?.some(s => s.status === 'running' || s.status === 'pending')
  
  // Show scanning indicator if scan was triggered recently (within 30 seconds) or if there's an active scan
  const showScanningIndicator = hasRunningScan || (Date.now() - lastScanTime < 30000)
  
  // Refresh score and controls when scan completes
  React.useEffect(() => {
    if (latestScan?.status === 'complete') {
      mutateScore()
      mutateControls()
    }
  }, [latestScan?.status, mutateScore, mutateControls])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* T1: Integration error banner */}
      {(() => {
        const dismissed = typeof window !== 'undefined' && sessionStorage.getItem('comply.banner.integrations-dismissed')
        const hasError = integrations?.some(i => i.status === 'error' || i.status === 'disconnected')
        if (hasError && !dismissed) {
          return (
            <div
              style={{ background: '#FFFAEB', border: '1px solid #FEDF89', borderRadius: 12, padding: '12px 16px' }}
              className="flex items-center gap-3"
            >
              <AlertTriangle size={16} style={{ color: '#B54708', flexShrink: 0 }} />
              <p style={{ color: '#B54708', fontSize: 14, flex: 1 }}>
                AWS integration is disconnected. Reconnect to resume scans.
              </p>
              <Link
                href="/dashboard/integrations"
                style={{ color: '#B54708', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'underline' }}
              >
                Reconnect
              </Link>
              <button
                onClick={() => { sessionStorage.setItem('comply.banner.integrations-dismissed', '1'); window.location.reload() }}
                style={{ color: '#B54708', opacity: 0.6, padding: 4 }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )
        }
        return null
      })()}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Overview</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)', fontSize: 13 }}>
              {score ? `Last updated ${formatDistanceToNow(new Date(score.lastUpdated), { addSuffix: true })}` : 'Loading...'}
            </p>
            {score && (
              <button
                onClick={() => { mutateScore(); mutateControls(); mutateScans() }}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
                style={{ fontSize: 13 }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            )}
          </div>
          {showScanningIndicator && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
              <RefreshCw size={12} className="animate-spin" />
              <span className="font-medium">Scan in progress...</span>
              <span className="text-accent/70">This may take a few minutes</span>
            </div>
          )}
        </div>
        <button
          onClick={async () => {
            setIsScanning(true)
            setLastScanTime(Date.now())
            try {
              const connectedIntegrations = await api.integrations.list()
              const connected = connectedIntegrations.filter(i => i.status === 'connected')
              
              if (connected.length === 0) {
                alert('No integrations connected. Please connect AWS or GitHub first.')
                return
              }
              
              // Trigger scan for all connected integrations
              await Promise.all(connected.map(i => api.integrations.sync(i.id)))
              
              // Refresh scans list immediately
              mutateScans()
              
              // Show success message
              setTimeout(() => {
                mutateScans()
              }, 2000)
            } catch (error: any) {
              console.error('Scan error:', error)
              alert(error.message || 'Failed to start scan')
            } finally {
              setIsScanning(false)
            }
          }}
          disabled={isScanning || showScanningIndicator}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg bg-card hover:bg-bg transition-all text-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
        >
          <RefreshCw size={14} className={isScanning || showScanningIndicator ? 'animate-spin' : ''} />
          <span className="whitespace-nowrap font-medium">
            {isScanning ? 'Starting...' : showScanningIndicator ? 'Scanning...' : 'Run scan'}
          </span>
        </button>
      </div>

      {/* Score + framework cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Overall score — radial chart */}
        <Link
          href={failingControls.length > 0 ? '/dashboard/controls?status=fail&severity=critical' : '/dashboard/controls'}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-iris/40 focus:ring-offset-2"
          role="link"
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(51, 6, 61, 0.65)' }} className="mb-2">Overall Score</p>
          <div className="relative w-36 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="70%" outerRadius="90%"
                startAngle={90} endAngle={-270}
                data={[{ value: score?.overall || 0 }]}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: '#F8F7FA' }}
                >
                  <Cell fill="#8A63E6" />
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-ink" style={{ fontSize: 48, fontWeight: 600 }}>{score?.overall ?? '—'}%</span>
            </div>
          </div>
          {failingControls.length > 0 ? (
            <div className="mt-3 text-center">
              <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>{failingControls.length} control{failingControls.length !== 1 ? 's' : ''} failing</p>
              <p className="text-sm font-medium text-ink mt-1">Fix top critical →</p>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5">
              <CheckCircle size={14} style={{ color: '#067647' }} />
              <span className="text-sm font-medium" style={{ color: '#067647' }}>All controls passing</span>
            </div>
          )}
        </Link>

        {/* Framework scores */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {score && Object.entries(score.frameworks).map(([fw, data]) => (
            <FrameworkCard key={fw} framework={fw} data={data} planFeatures={planFeatures} />
          ))}
          {scoreLoading && [1,2,3,4].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Passing"
          value={controls?.filter(c => c.status === 'pass').length ?? '—'}
          icon={<CheckCircle size={16} className="text-accent" />}
          color="text-accent"
        />
        <StatCard
          label="Failing"
          value={failingControls.length}
          icon={<AlertTriangle size={16} className="text-danger" />}
          color="text-danger"
        />
        <StatCard
          label="Needs Review"
          value={controls?.filter(c => c.status === 'review').length ?? '—'}
          icon={<Clock size={16} className="text-warn" />}
          color="text-warn"
        />
        <StatCard
          label="Total Controls"
          value={controls?.length ?? '—'}
          icon={<Shield size={16} className="text-muted" />}
          color="text-ink"
        />
      </div>

      {/* AI Insight - only show if user has Growth plan */}
      {planFeatures?.features?.aiInsights && <AiInsightCard framework="soc2" />}

      {/* FinOps summary card — only shown if data exists */}
      {finopsSummary?.available && (
        <Link href="/dashboard/finops" className="block bg-card border border-border rounded-xl p-5 hover:border-green/30 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingDown size={16} className="text-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">FinOps — Cost savings found</p>
                <p className="text-xs text-muted mt-0.5">
                  {finopsSummary.wasteItems} waste item{finopsSummary.wasteItems !== 1 ? 's' : ''} · {finopsSummary.rightsizingItems} rightsizing opportunit{finopsSummary.rightsizingItems !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-lg font-medium text-green">
                  ${finopsSummary.totalMonthlySavings?.toLocaleString('en', { maximumFractionDigits: 0 })}/mo
                </div>
                <div className="text-xs text-muted">${finopsSummary.totalAnnualSavings?.toLocaleString('en', { maximumFractionDigits: 0 })}/yr potential savings</div>
              </div>
              <ChevronRight size={16} className="text-border group-hover:text-muted transition-colors" />
            </div>
          </div>
        </Link>
      )}

      {/* Two column: failing controls + recent scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Failing controls */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-ink flex items-center gap-2">
              <AlertTriangle size={14} className="text-danger" />
              Failing Controls
              {failingControls.length > 0 && (
                <span className="font-mono text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded">
                  {failingControls.length}
                </span>
              )}
            </h2>
            <Link href="/dashboard/controls?status=fail" className="text-xs text-muted hover:text-ink transition-colors">
              View all
            </Link>
          </div>

          {failingControls.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={28} className="text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-ink">All controls passing</p>
              <p className="text-xs text-muted mt-1">Run a scan to check for issues</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {failingControls.slice(0, 6).map(control => (
                <ControlRow key={control.id} control={control} />
              ))}
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-ink flex items-center gap-2">
              <Zap size={14} className="text-accent" />
              Recent Scans
            </h2>
            <Link href="/dashboard/scans" className="text-xs text-muted hover:text-ink transition-colors">
              View all
            </Link>
          </div>

          {!scans || scans.length === 0 ? (
            <div className="px-5 py-10 text-center">
              {hasRunningScan ? (
                <>
                  <RefreshCw size={28} className="text-accent mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-medium text-ink">Scan in progress...</p>
                  <p className="text-xs text-muted mt-1">This may take a few minutes</p>
                </>
              ) : integrations && integrations.some(i => i.status === 'connected') ? (
                <>
                  <Zap size={28} style={{ color: 'rgba(51, 6, 61, 0.2)' }} className="mx-auto mb-2" />
                  <p className="text-sm font-medium text-ink">No scans yet</p>
                  <button
                    onClick={async () => {
                      setIsScanning(true)
                      setLastScanTime(Date.now())
                      try {
                        const connected = (await api.integrations.list()).filter(i => i.status === 'connected')
                        await Promise.all(connected.map(i => api.integrations.sync(i.id)))
                        mutateScans()
                      } catch (e) { console.error(e) }
                      finally { setIsScanning(false) }
                    }}
                    className="text-xs text-accent hover:underline mt-2 inline-block font-medium"
                  >
                    Run scan →
                  </button>
                </>
              ) : (
                <>
                  <Zap size={28} style={{ color: 'rgba(51, 6, 61, 0.2)' }} className="mx-auto mb-2" />
                  <p className="text-sm font-medium text-ink">No scans yet</p>
                  <p className="text-xs text-muted mt-1">Connect an integration to start.</p>
                  <Link href="/dashboard/integrations" className="text-xs text-accent hover:underline mt-2 inline-block font-medium">
                    Connect AWS →
                  </Link>
                </>
              )}
            </div>
          ) : (() => {
            // T10: Collapse failed scans from errored integrations
            const erroredIntegrationIds = new Set(
              integrations?.filter(i => i.status === 'error' || i.status === 'disconnected').map(i => i.id) || []
            )
            const recentScans = scans.slice(0, 6)
            const erroredScans = recentScans.filter(s => s.status === 'failed' && erroredIntegrationIds.has(s.integrationId))
            const normalScans = recentScans.filter(s => !(s.status === 'failed' && erroredIntegrationIds.has(s.integrationId)))

            return (
              <div className="divide-y divide-border">
                {erroredScans.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <AlertCircle size={14} style={{ color: '#B54708' }} />
                    <span className="text-sm" style={{ color: '#B54708' }}>
                      AWS scans paused — integration disconnected
                    </span>
                    <Link href="/dashboard/integrations" className="ml-auto text-xs font-medium" style={{ color: '#B54708' }}>
                      Reconnect →
                    </Link>
                  </div>
                )}
                {normalScans.length > 0 ? (
                  normalScans.map(scan => <ScanRow key={scan.id} scan={scan} />)
                ) : erroredScans.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Zap size={28} style={{ color: 'rgba(51, 6, 61, 0.2)' }} className="mx-auto mb-2" />
                    <p className="text-sm font-medium text-ink">No recent scans</p>
                  </div>
                ) : null}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return null
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk'
  const style = score >= 90
    ? { color: '#067647', background: '#ECFDF3' }
    : score >= 70
    ? { color: '#B54708', background: '#FFFAEB' }
    : { color: '#B42318', background: '#FEF3F2' }
  return (
    <span className="font-mono text-xs px-2 py-0.5 mt-2" style={{ ...style, borderRadius: 6 }}>{label}</span>
  )
}

function FrameworkCard({ framework, data, planFeatures }: { framework: string; data: any; planFeatures?: any }) {
  const labels: Record<string, string> = {
    soc2: 'SOC 2', iso27001: 'ISO 27001', gdpr: 'GDPR', hipaa: 'HIPAA', pci_dss: 'PCI-DSS'
  }
  
  // Check if framework is locked
  const isLocked = planFeatures && !planFeatures.features.frameworks.includes(framework)
  
  const scoreColor = data.score >= 80 ? '#067647' : data.score >= 60 ? '#B54708' : '#B42318'
  const barColor = data.score >= 80 ? '#8A63E6' : data.score >= 60 ? '#B54708' : '#B42318'

  if (isLocked) {
    return (
      <Link 
        href="/dashboard/billing"
        className="bg-card border border-border rounded-xl p-6 hover:bg-surface-hover transition-colors relative overflow-hidden group"
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-semibold text-ink">{labels[framework] || framework}</span>
            <Lock size={14} style={{ color: 'rgba(51, 6, 61, 0.65)' }} />
          </div>
          <p className="text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Growth plan required</p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/dashboard/controls?framework=${framework}`}
      className="bg-card border border-border rounded-xl p-6 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold text-ink">{labels[framework] || framework}</span>
        <span className="font-mono" style={{ fontSize: 16, fontWeight: 600, color: scoreColor }}>{data.score}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(51, 6, 61, 0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${data.score}%`, background: barColor }} />
      </div>
      <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
        <div className="flex items-center gap-3 font-mono">
          <span style={{ color: '#067647' }}>↑ {data.pass}</span>
          <span style={{ color: '#B42318' }}>↓ {data.fail}</span>
          <span>{data.pending} pending</span>
        </div>
        <span className="font-medium text-ink">View →</span>
      </div>
    </Link>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(51, 6, 61, 0.65)' }}>{label}</span>
        {icon}
      </div>
      <span className={clsx('font-mono', color)} style={{ fontSize: 24, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function ControlRow({ control }: { control: any }) {
  return (
    <Link
      href={`/dashboard/controls/${control.controlId}`}
      className="flex items-start gap-3 px-5 py-3 hover:bg-bg transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[10px] text-muted">{control.controlId}</span>
          <SeverityBadge severity={control.severity} />
        </div>
        <p className="text-sm text-ink truncate">{control.title}</p>
        {control.evidence?.detail && (
          <p className="text-xs text-muted mt-0.5 truncate">{control.evidence.detail}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-border group-hover:text-muted transition-colors mt-0.5 flex-shrink-0" />
    </Link>
  )
}

function ScanRow({ scan }: { scan: any }) {
  const statusConfig = {
    complete: { 
      label: 'Complete', 
      style: { color: '#067647', background: '#ECFDF3', border: '1px solid rgba(6, 118, 71, 0.2)' },
      icon: <CheckCircle2 size={12} style={{ color: '#067647' }} />
    },
    running: { 
      label: 'Running', 
      style: { color: '#B54708', background: '#FFFAEB', border: '1px solid rgba(181, 71, 8, 0.2)' },
      icon: <RefreshCw size={12} style={{ color: '#B54708' }} className="animate-spin" />
    },
    pending: { 
      label: 'Pending', 
      style: { color: '#B54708', background: '#FFFAEB', border: '1px solid rgba(181, 71, 8, 0.2)' },
      icon: <Clock size={12} style={{ color: '#B54708' }} />
    },
    failed: { 
      label: 'Failed', 
      style: { color: '#B42318', background: '#FEF3F2', border: '1px solid rgba(180, 35, 24, 0.2)' },
      icon: <AlertCircle size={12} style={{ color: '#B42318' }} />
    },
  }
  const config = statusConfig[scan.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-ink capitalize font-medium">{scan.integrationType}</span>
          <span style={{ color: 'rgba(51, 6, 61, 0.65)' }} className="text-xs">·</span>
          <span className="text-xs" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>{scan.triggeredBy}</span>
        </div>
        {scan.status === 'complete' && (
          <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
            <span style={{ color: '#067647' }} className="font-medium">{scan.passCount} passed</span>
            {scan.failCount > 0 && (
              <> · <span style={{ color: '#B42318' }} className="font-medium">{scan.failCount} failed</span></>
            )}
          </p>
        )}
        {scan.status === 'running' && (
          <p className="text-sm" style={{ color: '#B54708' }}>Scanning your infrastructure...</p>
        )}
        {scan.status === 'pending' && (
          <p className="text-sm" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>Waiting to start...</p>
        )}
        {scan.status === 'failed' && (
          <p className="text-sm truncate" style={{ color: '#B42318' }}>{scan.error || 'Scan failed'}</p>
        )}
        <p className="text-xs mt-1" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
          {scan.completedAt
            ? formatDistanceToNow(new Date(scan.completedAt), { addSuffix: true })
            : formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1"
        style={{ ...config.style, borderRadius: 6, fontWeight: 500, height: 24 }}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    critical: 'bg-danger/10 text-danger',
    high:     'bg-orange-50 text-orange-600',
    medium:   'bg-warn/10 text-warn',
    low:      'bg-border text-muted',
  }
  return (
    <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider', config[severity as keyof typeof config])}>
      {severity}
    </span>
  )
}
