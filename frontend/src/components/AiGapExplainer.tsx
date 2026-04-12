'use client'
import { useState } from 'react'
import { Sparkles, Clock, Zap, AlertTriangle, ChevronDown, ChevronUp, Terminal, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface AiExplanation {
  summary: string
  businessImpact: string
  steps: { order: number; title: string; detail: string; effort: string }[]
  priority: 'immediate' | 'this week' | 'this month'
  estimatedEffort: string
  automationTip?: string
  cached?: boolean
}

const PRIORITY_CONFIG = {
  immediate:    { label: 'Fix immediately', color: 'text-danger bg-danger/10', icon: <AlertTriangle size={12} /> },
  'this week':  { label: 'Fix this week',   color: 'text-warn bg-warn/10',   icon: <Clock size={12} /> },
  'this month': { label: 'Fix this month',  color: 'text-muted bg-border',   icon: <Clock size={12} /> },
}

export function AiGapExplainer({ controlId }: { controlId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [data, setData] = useState<AiExplanation | null>(null)
  const [error, setError] = useState('')
  const [showAutomation, setShowAutomation] = useState(false)

  const handleExplain = async () => {
    setState('loading')
    setError('')

    try {
      const res = await fetch(`/api/v1/ai/explain/${controlId}`, { method: 'POST' })

      if (!res.ok) {
        const err = await res.json()
        // Graceful fallback — show built-in guidance if AI unavailable
        if (err.fallback) {
          setData(err.fallback)
          setState('done')
          return
        }
        throw new Error(err.message || 'Failed to generate explanation')
      }

      const explanation = await res.json()
      setData(explanation)
      setState('done')
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  // Idle state — show the button
  if (state === 'idle') {
    return (
      <button
        onClick={handleExplain}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-accent/30 rounded-xl text-sm text-accent hover:bg-accent-light transition-all group"
      >
        <Sparkles size={15} className="group-hover:animate-pulse" />
        Explain this failure with AI
      </button>
    )
  }

  // Loading
  if (state === 'loading') {
    return (
      <div className="border border-accent/20 rounded-xl p-5 bg-accent-light/30">
        <div className="flex items-center gap-2 text-sm text-accent">
          <Loader2 size={15} className="animate-spin" />
          Analysing your infrastructure and generating explanation...
        </div>
      </div>
    )
  }

  // Error
  if (state === 'error') {
    return (
      <div className="border border-border rounded-xl p-4 space-y-2">
        <p className="text-sm text-danger">{error}</p>
        <button onClick={handleExplain} className="text-xs text-accent hover:underline">Try again</button>
      </div>
    )
  }

  // Done — show full explanation
  if (!data) return null

  const priorityConfig = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG['this week']

  return (
    <div className="border border-accent/25 rounded-xl overflow-hidden bg-accent-light/20">

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-accent/15 bg-accent-light/40">
        <Sparkles size={14} className="text-accent" />
        <span className="text-sm font-medium text-accent">AI Analysis</span>
        {data.cached && (
          <span className="font-mono text-[10px] text-accent/60 ml-auto">cached</span>
        )}
        <span className={clsx('flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded ml-auto', priorityConfig.color)}>
          {priorityConfig.icon}
          {priorityConfig.label}
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* Summary */}
        <div>
          <p className="text-sm text-ink leading-relaxed">{data.summary}</p>
        </div>

        {/* Business impact */}
        {data.businessImpact && (
          <div className="flex gap-3 p-3 bg-danger/5 border border-danger/15 rounded-lg">
            <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-ink leading-relaxed">{data.businessImpact}</p>
          </div>
        )}

        {/* Steps */}
        {data.steps?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-accent" />
              <span className="text-xs font-medium text-ink uppercase tracking-wider">Fix it — {data.estimatedEffort}</span>
            </div>
            <div className="space-y-2">
              {data.steps.map((step) => (
                <div key={step.order} className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center font-mono text-[10px] font-medium mt-0.5">
                    {step.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-ink">{step.title}</span>
                      <span className="font-mono text-[10px] text-muted bg-border px-1.5 py-0.5 rounded">{step.effort}</span>
                    </div>
                    {/* Detect if detail contains a command */}
                    {step.detail.includes('aws ') || step.detail.includes('terraform') || step.detail.includes('$') ? (
                      <div className="bg-ink rounded p-2.5 mt-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Terminal size={10} className="text-muted/60" />
                          <span className="font-mono text-[9px] text-muted/60 uppercase tracking-wider">command</span>
                        </div>
                        <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                          {step.detail}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-xs text-muted leading-relaxed">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automation tip */}
        {data.automationTip && (
          <div>
            <button
              onClick={() => setShowAutomation(!showAutomation)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              <Terminal size={12} />
              Automation tip — prevent regression
              {showAutomation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showAutomation && (
              <div className="bg-ink rounded p-3 mt-2">
                <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                  {data.automationTip}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Regenerate */}
        <button
          onClick={() => { setState('idle'); setData(null) }}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          Regenerate explanation
        </button>
      </div>
    </div>
  )
}
