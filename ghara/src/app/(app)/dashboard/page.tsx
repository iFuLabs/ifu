'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { Shield, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Clock, ChevronRight, Zap, Cloud, ArrowRight, Users, MessageSquare, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const GREEN = '#067647'

export default function DashboardPage() {
  const { data: score } = useSWR('score', api.controls.score, { refreshInterval: 30000 })
  const { data: controls } = useSWR('controls', api.controls.list, { refreshInterval: 30000 })
  const { data: finops } = useSWR('finops', () => api.finops.get(), { refreshInterval: 60000 })
  const { data: scans } = useSWR('scans', api.scans.list, { refreshInterval: 10000 })
  const { data: integrations } = useSWR('integrations', api.integrations.list)
  const { data: me } = useSWR('me', api.auth.me)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const latestScan = scans?.[0]
  const hasData = latestScan?.status === 'complete'
  const hasAwsConnected = integrations?.some((i: any) => i.type === 'aws' && i.status === 'connected')
  const userName = me?.user?.name?.split(' ')[0] || ''

  // Scores
  const complianceScore = hasData ? (score?.overall || 0) : null
  const failingControls = controls?.filter((c: any) => c.status === 'fail') || []
  const wasteRatio = finops?.summary ? (finops.summary.totalMonthlySavings || 0) / Math.max(finops.monthlyCost || 1, 1) : 0
  const costScore = hasData ? Math.round(Math.max(0, (1 - wasteRatio) * 100)) : null
  const criticalCount = failingControls.filter((c: any) => c.severity === 'critical' || c.severity === 'high').length
  const securityScore = hasData ? Math.round(Math.max(0, 100 - criticalCount * 8)) : null
  const healthScore = (complianceScore !== null && costScore !== null && securityScore !== null)
    ? Math.round(complianceScore * 0.4 + costScore * 0.3 + securityScore * 0.3) : null

  const actionQueue = hasData ? buildActionQueue(failingControls, finops) : []

  // Empty state
  if (!hasData) {
    // AWS connected but scan hasn't completed — show waiting state
    if (hasAwsConnected) {
      return (
        <div style={{ padding: '48px 32px', maxWidth: 860, margin: '0 auto', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          <GreetingHeader name={userName} />
          <div style={{
            background: `linear-gradient(135deg, #FFFFFF 0%, rgba(218,192,253,0.12) 100%)`,
            border: '1px solid rgba(51,6,61,0.08)', borderRadius: 20,
            padding: '64px 48px', textAlign: 'center',
            boxShadow: '0 12px 48px rgba(51,6,61,0.06)', marginTop: 28,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: `linear-gradient(135deg, ${LAVENDER} 0%, rgba(138,99,230,0.2) 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', boxShadow: '0 8px 24px rgba(138,99,230,0.15)',
            }}>
              <Zap size={36} style={{ color: IRIS }} />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 400, color: PLUM, fontFamily: "'PP Fragment', serif", marginBottom: 12 }}>
              AWS connected — scanning
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(51,6,61,0.6)', maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.7 }}>
              Your first scan is being processed. Results will appear here shortly.
            </p>
            <button
              onClick={async (e) => {
                const btn = e.currentTarget
                btn.textContent = 'Starting scan...'
                btn.disabled = true
                btn.style.opacity = '0.6'
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
                try {
                  const intRes = await fetch(`${API_URL}/api/v1/integrations`, { credentials: 'include' })
                  if (intRes.ok) {
                    const ints = await intRes.json()
                    const connected = ints.filter((i: any) => i.status === 'connected' && i.type === 'aws')
                    for (const i of connected) {
                      await fetch(`${API_URL}/api/v1/integrations/${i.id}/sync`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                    }
                    btn.textContent = '✓ Scan queued — refreshing in 30s...'
                    btn.style.background = '#067647'
                    setTimeout(() => window.location.reload(), 30000)
                  } else {
                    btn.textContent = 'Failed — try again'
                    btn.disabled = false
                    btn.style.opacity = '1'
                  }
                } catch {
                  btn.textContent = 'Failed — try again'
                  btn.disabled = false
                  btn.style.opacity = '1'
                }
              }}
              style={{ padding: '14px 28px', background: PLUM, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(51,6,61,0.2)', transition: 'all 0.2s' }}
            >
              Run scan now
            </button>
            <div style={{ width: 200, height: 4, borderRadius: 2, background: 'rgba(51,6,61,0.06)', margin: '24px auto 0', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', width: '40%', height: '100%', borderRadius: 2, background: IRIS, animation: 'scanPulse 2s ease-in-out infinite' }} />
            </div>
          </div>
          <style>{`@keyframes scanPulse { 0% { left: -40%; } 100% { left: 100%; } }`}</style>
        </div>
      )
    }

    // Not connected — show connect CTA
    return (
      <div style={{ padding: '48px 32px', maxWidth: 860, margin: '0 auto', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <GreetingHeader name={userName} />

        {/* Hero empty state card */}
        <div style={{
          background: `linear-gradient(135deg, #FFFFFF 0%, rgba(218,192,253,0.12) 100%)`,
          border: '1px solid rgba(51,6,61,0.08)',
          borderRadius: 20, padding: '64px 48px', textAlign: 'center',
          boxShadow: '0 12px 48px rgba(51,6,61,0.06)', marginTop: 28,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: `linear-gradient(135deg, ${LAVENDER} 0%, rgba(138,99,230,0.2) 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px', boxShadow: '0 8px 24px rgba(138,99,230,0.15)',
          }}>
            <Cloud size={36} style={{ color: IRIS }} />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 400, color: PLUM, fontFamily: "'PP Fragment', serif", marginBottom: 12 }}>
            Your Cloud Health Score awaits
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(51,6,61,0.6)', maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Connect your AWS account and Ghara will scan for compliance gaps, cost waste, and security issues — all summarized in one score.
          </p>
          <Link href="/integrations/aws" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 32px', background: PLUM, color: '#fff',
            borderRadius: 12, fontSize: 15, fontWeight: 600,
            textDecoration: 'none', boxShadow: '0 8px 24px rgba(51,6,61,0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            Connect AWS <ArrowRight size={16} />
          </Link>
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
            {['Read-only access only', '3-minute setup', 'CloudFormation one-click'].map(t => (
              <span key={t} style={{ fontSize: 12, color: 'rgba(51,6,61,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={12} style={{ color: IRIS }} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Setup checklist */}
        <div style={{ marginTop: 24, background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 16, padding: '24px 28px', boxShadow: '0 4px 16px rgba(51,6,61,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(51,6,61,0.5)', marginBottom: 16 }}>Setup checklist</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ChecklistItem label="Connect AWS" href="/integrations/aws" done={false} icon={<Cloud size={14} />} />
            <ChecklistItem label="Invite your team" href="/team" done={false} icon={<Users size={14} />} />
            <ChecklistItem label="Connect Slack" href="/notifications" done={false} icon={<MessageSquare size={14} />} />
            <ChecklistItem label="Connect GitHub" href="/integrations/github" done={false} icon={<GitBranch size={14} />} />
          </div>
        </div>
      </div>
    )
  }

  // Data state
  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto', opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <GreetingHeader name={userName} subtitle={latestScan?.completedAt ? `Last scan ${formatDistanceToNow(new Date(latestScan.completedAt), { addSuffix: true })}` : undefined} />

      {/* Cloud Health Score */}
      <div style={{
        background: `linear-gradient(135deg, #FFFFFF 0%, rgba(218,192,253,0.06) 100%)`,
        border: '1px solid rgba(51,6,61,0.08)', borderRadius: 20,
        padding: '36px 40px', marginTop: 24,
        boxShadow: '0 8px 32px rgba(51,6,61,0.04)',
        display: 'grid', gridTemplateColumns: '160px 1fr', gap: 48, alignItems: 'center',
      }}>
        {/* Animated ring */}
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(51,6,61,0.03)" strokeWidth="7" />
            <circle
              cx="50" cy="50" r="38" fill="none"
              stroke={`url(#scoreGradient)`} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={mounted ? `${(healthScore || 0) * 2.39} 239` : '0 239'}
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={IRIS} />
                <stop offset="100%" stopColor={LAVENDER} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatedNumber value={healthScore || 0} />
            <span style={{ fontSize: 9, color: 'rgba(51,6,61,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 2 }}>Health</span>
          </div>
        </div>

        {/* Score breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(51,6,61,0.45)' }}>Cloud Health Score</div>
          <ScoreBar label="Compliance" score={complianceScore!} weight="40%" color={IRIS} />
          <ScoreBar label="Cost Efficiency" score={costScore!} weight="30%" color={GREEN} />
          <ScoreBar label="Security" score={securityScore!} weight="30%" color={PLUM} />
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
        <KpiCard label="SOC 2 Readiness" value={`${complianceScore}%`} icon={<Shield size={15} />} color={IRIS} trend={complianceScore! > 50 ? '+3%' : undefined} />
        <KpiCard label="Detected Savings" value={finops?.summary ? `$${Math.round(finops.summary.totalMonthlySavings || 0).toLocaleString()}/mo` : '—'} icon={<DollarSign size={15} />} color={GREEN} />
        <KpiCard label="Open Findings" value={String(actionQueue.length)} icon={<AlertTriangle size={15} />} color="#B42318" />
        <KpiCard label="Last Scan" value={latestScan?.completedAt ? formatDistanceToNow(new Date(latestScan.completedAt), { addSuffix: true }).replace('about ', '') : 'Never'} icon={<Clock size={15} />} color="rgba(51,6,61,0.4)" />
      </div>

      {/* Action Queue */}
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)',
        borderRadius: 16, marginTop: 20, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(51,6,61,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(51,6,61,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(138,99,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={12} style={{ color: IRIS }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>Action Queue</span>
            {actionQueue.length > 0 && (
              <span style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(138,99,230,0.06)', color: IRIS, fontWeight: 500 }}>{actionQueue.length}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <FilterPill label="All" active />
            <FilterPill label="Compliance" />
            <FilterPill label="Cost" />
          </div>
        </div>

        {actionQueue.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(6,118,71,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={22} style={{ color: GREEN }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: PLUM }}>All clear</p>
            <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.5)', marginTop: 4 }}>No open findings. Your cloud is in good shape.</p>
          </div>
        ) : (
          <div>
            {actionQueue.slice(0, 12).map((item, i) => (
              <ActionRow key={i} item={item} index={i} />
            ))}
            {actionQueue.length > 12 && (
              <Link href="/compliance" style={{ display: 'block', padding: '14px 24px', textAlign: 'center', borderTop: '1px solid rgba(51,6,61,0.05)', fontSize: 13, color: IRIS, textDecoration: 'none', fontWeight: 500 }}>
                View all {actionQueue.length} findings →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildActionQueue(failingControls: any[], finops: any) {
  const items: any[] = []
  for (const control of failingControls) {
    items.push({ type: 'Compliance', severity: control.severity || 'medium', title: control.title, detail: control.controlId, dollarValue: null, href: '/compliance' })
  }
  if (finops?.waste) {
    for (const w of finops.waste) {
      items.push({ type: 'Cost', severity: w.estimatedMonthlySavings > 100 ? 'high' : 'medium', title: w.recommendation || `${w.type}: ${w.resourceId}`, detail: w.resourceId, dollarValue: w.estimatedMonthlySavings, href: '/cost' })
    }
  }
  if (finops?.rightsizing) {
    for (const r of finops.rightsizing) {
      items.push({ type: 'Cost', severity: 'medium', title: `Rightsize ${r.instanceId || r.resourceId}`, detail: r.instanceType ? `${r.instanceType} → ${r.recommendedType}` : r.resourceId, dollarValue: r.estimatedMonthlySavings, href: '/cost' })
    }
  }
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  items.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0) || (b.dollarValue || 0) - (a.dollarValue || 0))
  return items
}

// ── Sub-components ─────────────────────────────────────────────────────────

function GreetingHeader({ name, subtitle }: { name?: string; subtitle?: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 400, color: PLUM, fontFamily: "'PP Fragment', serif" }}>
        {greeting}{name ? `, ${name}` : ''}
      </h1>
      {subtitle && <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.45)', marginTop: 4 }}>{subtitle}</p>}
    </div>
  )
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 1200
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    animate()
  }, [value])
  return <span style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 38, fontWeight: 600, color: PLUM, lineHeight: 1 }}>{display}</span>
}

function ScoreBar({ label, score, weight, color }: { label: string; score: number; weight: string; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { setTimeout(() => setWidth(score), 100) }, [score])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 13, color: 'rgba(51,6,61,0.65)', width: 120 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(51,6,61,0.03)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${width}%`, background: color, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
      <span style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 13, fontWeight: 500, color: PLUM, width: 36, textAlign: 'right' }}>{score}%</span>
      <span style={{ fontSize: 10, color: 'rgba(51,6,61,0.35)', width: 28 }}>{weight}</span>
    </div>
  )
}

function KpiCard({ label, value, icon, color, trend }: { label: string; value: string; icon: React.ReactNode; color: string; trend?: string }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.06)',
      borderRadius: 14, padding: '22px 20px',
      boxShadow: '0 2px 12px rgba(51,6,61,0.02)',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(51,6,61,0.45)' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 22, fontWeight: 600, color: PLUM }}>{value}</span>
        {trend && <span style={{ fontSize: 11, color: GREEN, fontWeight: 500 }}>{trend}</span>}
      </div>
    </div>
  )
}

function FilterPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <button style={{
      padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
      background: active ? LAVENDER : 'transparent',
      color: active ? PLUM : 'rgba(51,6,61,0.45)',
    }}>
      {label}
    </button>
  )
}

function ChecklistItem({ label, href, done, icon }: { label: string; href: string; done: boolean; icon: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderRadius: 10, textDecoration: 'none',
      background: done ? 'rgba(6,118,71,0.04)' : 'rgba(51,6,61,0.02)',
      border: `1px solid ${done ? 'rgba(6,118,71,0.12)' : 'rgba(51,6,61,0.06)'}`,
      transition: 'background 0.15s',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: done ? 'rgba(6,118,71,0.08)' : 'rgba(138,99,230,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? GREEN : IRIS }}>
        {done ? <CheckCircle size={14} /> : icon}
      </div>
      <span style={{ fontSize: 13, color: done ? GREEN : PLUM, fontWeight: 500, flex: 1 }}>{label}</span>
      {done ? (
        <span style={{ fontSize: 11, color: GREEN, fontWeight: 500 }}>Done</span>
      ) : (
        <ChevronRight size={14} style={{ color: 'rgba(51,6,61,0.2)' }} />
      )}
    </Link>
  )
}

function ActionRow({ item, index }: { item: any; index: number }) {
  const sevColors: Record<string, { bg: string; text: string; dot: string }> = {
    critical: { bg: '#FEF3F2', text: '#B42318', dot: '#B42318' },
    high: { bg: '#FEF3F2', text: '#B42318', dot: '#DC6803' },
    medium: { bg: '#FFFAEB', text: '#B54708', dot: '#E8B547' },
    low: { bg: 'rgba(51,6,61,0.03)', text: 'rgba(51,6,61,0.55)', dot: 'rgba(51,6,61,0.3)' },
  }
  const typeColors: Record<string, { bg: string; text: string }> = {
    Compliance: { bg: 'rgba(138,99,230,0.06)', text: IRIS },
    Cost: { bg: 'rgba(6,118,71,0.06)', text: GREEN },
  }
  const sev = sevColors[item.severity] || sevColors.medium
  const typ = typeColors[item.type] || typeColors.Compliance

  return (
    <Link href={item.href} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px',
      borderBottom: '1px solid rgba(51,6,61,0.04)', textDecoration: 'none',
      transition: 'background 0.15s',
      animationDelay: `${index * 30}ms`,
    }}>
      {/* Priority dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sev.dot, flexShrink: 0 }} />

      {/* Severity badge */}
      <span style={{
        fontFamily: "'Aeonik Fono', monospace", fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.04em', padding: '3px 7px', borderRadius: 4,
        background: sev.bg, color: sev.text, fontWeight: 600, flexShrink: 0,
      }}>{item.severity}</span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: PLUM, fontWeight: 450, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
        <p style={{ fontSize: 11, color: 'rgba(51,6,61,0.45)', marginTop: 2, fontFamily: "'Aeonik Fono', monospace" }}>{item.detail}</p>
      </div>

      {/* Type tag */}
      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 10, background: typ.bg, color: typ.text, flexShrink: 0 }}>{item.type}</span>

      {/* Dollar value */}
      {item.dollarValue && (
        <span style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 12, fontWeight: 600, color: GREEN, flexShrink: 0 }}>
          ${Math.round(item.dollarValue).toLocaleString()}/mo
        </span>
      )}

      <ChevronRight size={14} style={{ color: 'rgba(51,6,61,0.12)', flexShrink: 0 }} />
    </Link>
  )
}
