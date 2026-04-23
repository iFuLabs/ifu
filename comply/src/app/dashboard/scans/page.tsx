'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { ArrowLeft, CheckCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

export default function ScansPage() {
  const { data: scans } = useSWR<any[]>('scans', api.scans.list, { refreshInterval: 5000 })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={14} />
        Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Scan History</h1>
        <p className="text-sm text-muted mt-0.5">
          {scans ? `${scans.length} scan${scans.length !== 1 ? 's' : ''} total` : 'Loading...'}
        </p>
      </div>

      {/* Scans list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {!scans ? (
          <div className="p-5 text-center text-muted">Loading scans...</div>
        ) : scans.length === 0 ? (
          <div className="p-10 text-center">
            <RefreshCw size={32} className="text-muted opacity-30 mx-auto mb-3" />
            <p className="text-sm text-muted">No scans yet</p>
          </div>
        ) : (
          scans.map(scan => <ScanRow key={scan.id} scan={scan} />)
        )}
      </div>
    </div>
  )
}

function ScanRow({ scan }: { scan: any }) {
  const statusConfig = {
    complete: { 
      label: 'Complete', 
      color: 'text-accent bg-accent-light border-accent/20',
      icon: <CheckCircle size={12} className="text-accent" />
    },
    running: { 
      label: 'Running', 
      color: 'text-warn bg-warn/10 border-warn/20',
      icon: <RefreshCw size={12} className="text-warn animate-spin" />
    },
    pending: { 
      label: 'Pending', 
      color: 'text-muted bg-border/50 border-border',
      icon: <Clock size={12} className="text-muted" />
    },
    failed: { 
      label: 'Failed', 
      color: 'text-danger bg-danger/10 border-danger/20',
      icon: <AlertTriangle size={12} className="text-danger" />
    },
  }
  const config = statusConfig[scan.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-ink capitalize font-medium">{scan.integrationType}</span>
            <span className="text-muted text-xs">·</span>
            <span className="text-xs text-muted">{scan.triggeredBy}</span>
          </div>
          {scan.status === 'complete' && (
            <p className="text-sm text-muted">
              <span className="text-accent font-medium">{scan.passCount} passed</span>
              {scan.failCount > 0 && (
                <> · <span className="text-danger font-medium">{scan.failCount} failed</span></>
              )}
              {scan.reviewCount > 0 && (
                <> · <span className="text-warn font-medium">{scan.reviewCount} review</span></>
              )}
            </p>
          )}
          {scan.status === 'running' && (
            <p className="text-sm text-warn">Scanning your infrastructure...</p>
          )}
          {scan.status === 'pending' && (
            <p className="text-sm text-muted">Waiting to start...</p>
          )}
          {scan.status === 'failed' && (
            <p className="text-sm text-danger">{scan.error || 'Scan failed'}</p>
          )}
        </div>
        <div className={clsx('flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full border', config.color)}>
          {config.icon}
          <span className="font-medium">{config.label}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted font-mono">
        <div>
          <span className="text-[10px] uppercase tracking-wider">Started</span>
          <div className="text-ink mt-0.5">{format(new Date(scan.createdAt), 'MMM d, yyyy HH:mm')}</div>
        </div>
        {scan.completedAt && (
          <div>
            <span className="text-[10px] uppercase tracking-wider">Completed</span>
            <div className="text-ink mt-0.5">{format(new Date(scan.completedAt), 'MMM d, yyyy HH:mm')}</div>
          </div>
        )}
        <div className="ml-auto">
          <span className="text-[10px] uppercase tracking-wider">Duration</span>
          <div className="text-ink mt-0.5">
            {scan.completedAt 
              ? `${Math.round((new Date(scan.completedAt).getTime() - new Date(scan.createdAt).getTime()) / 1000)}s`
              : formatDistanceToNow(new Date(scan.createdAt))}
          </div>
        </div>
      </div>
    </div>
  )
}
