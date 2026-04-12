'use client'
import useSWR from 'swr'
import { Sparkles, AlertTriangle, Zap, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const RISK_COLORS = {
  low:      'text-accent bg-accent-light border-accent/20',
  medium:   'text-warn bg-warn/10 border-warn/20',
  high:     'text-danger bg-danger/10 border-danger/20',
  critical: 'text-danger bg-danger/10 border-danger/30',
}

export function AiInsightCard({ framework = 'soc2' }: { framework?: string }) {
  const { data, isLoading, error } = useSWR(
    `ai-summary-${framework}`,
    () => fetch(`/api/v1/ai/summary?framework=${framework}`).then(r => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 60 * 60 * 1000 } // don't re-fetch for 1 hour
  )

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
        <Loader2 size={16} className="text-muted animate-spin" />
        <span className="text-sm text-muted">Generating AI compliance insight...</span>
      </div>
    )
  }

  if (error || !data || data.error) return null

  const riskColor = RISK_COLORS[data.riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.medium

  return (
    <div className={clsx('border rounded-xl overflow-hidden', riskColor)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-current/10">
        <Sparkles size={14} />
        <span className="text-xs font-medium uppercase tracking-wider">AI Insight</span>
        <span className={clsx('font-mono text-[10px] px-2 py-0.5 rounded ml-auto capitalize border', riskColor)}>
          {data.riskLevel} risk
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Headline */}
        <p className="text-sm font-medium text-ink leading-snug">{data.headline}</p>

        {/* Top priority */}
        {data.topPriority && (
          <div className="flex gap-2.5">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-current opacity-70" />
            <p className="text-sm text-ink leading-relaxed">{data.topPriority}</p>
          </div>
        )}

        {/* Insight */}
        {data.insight && (
          <p className="text-xs text-muted leading-relaxed border-t border-current/10 pt-3">
            {data.insight}
          </p>
        )}

        {/* Quick wins */}
        {data.quickWins?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={12} className="text-current opacity-70" />
              <span className="text-xs font-medium text-ink">Quick wins</span>
            </div>
            <ul className="space-y-1.5">
              {data.quickWins.map((win: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted">
                  <span className="font-mono text-[10px] mt-0.5 opacity-60">→</span>
                  {win}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/dashboard/controls?status=fail"
          className="flex items-center gap-1 text-xs font-medium text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          View all failing controls <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
