'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cloud, Github, Box, MessageSquare, CheckCircle, AlertCircle, XCircle, ArrowRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface IntegrationStatus {
  type: string
  status: 'connected' | 'disconnected' | 'error'
  metadata?: any
  lastSyncAt?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [k8s, setK8s] = useState<any[]>([])
  const [slack, setSlack] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/v1/integrations`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/v1/integrations/kubernetes`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/v1/slack`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([intData, k8sData, slackData]) => {
      setIntegrations(intData)
      setK8s(k8sData)
      setSlack(slackData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const awsIntegration = integrations.find(i => i.type === 'aws' && i.status === 'connected')
  const githubIntegration = integrations.find(i => i.type === 'github')
  const k8sConnected = k8s.filter(k => k.status === 'connected')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-2">Integrations</h1>
      <p className="text-sm text-muted mb-6">Manage your data sources and connections.</p>

      <div className="grid gap-4">
        {/* AWS */}
        <IntegrationCard
          icon={<Cloud size={20} />}
          iconBg="rgba(255,153,0,0.1)"
          iconColor="#FF9900"
          name="AWS"
          description="IAM role for compliance scans and cost analysis"
          status={awsIntegration ? 'connected' : 'disconnected'}
          detail={awsIntegration?.metadata?.accountId ? `Account: ${awsIntegration.metadata.accountId}` : undefined}
          lastSync={awsIntegration?.lastSyncAt}
          href="/integrations/aws"
        />

        {/* GitHub */}
        <IntegrationCard
          icon={<Github size={20} />}
          iconBg="rgba(51,6,61,0.06)"
          iconColor="#33063D"
          name="GitHub"
          description="Branch protection, secret scanning, CODEOWNERS evidence"
          status={githubIntegration?.status || 'disconnected'}
          detail={githubIntegration?.metadata?.orgLogin ? `Org: ${githubIntegration.metadata.orgLogin}` : undefined}
          lastSync={githubIntegration?.lastSyncAt}
          href="/integrations/github"
        />

        {/* Kubernetes */}
        <IntegrationCard
          icon={<Box size={20} />}
          iconBg="rgba(6,118,71,0.08)"
          iconColor="#067647"
          name="Kubernetes"
          description="Cost allocation by namespace and workload via OpenCost"
          status={k8sConnected.length > 0 ? 'connected' : 'disconnected'}
          detail={k8sConnected.length > 0 ? `${k8sConnected.length} cluster${k8sConnected.length > 1 ? 's' : ''}` : undefined}
          href="/integrations/kubernetes"
          badge="Growth"
        />

        {/* Slack */}
        <IntegrationCard
          icon={<MessageSquare size={20} />}
          iconBg="rgba(138,99,230,0.08)"
          iconColor="#8A63E6"
          name="Slack"
          description="Drift alerts, scan notifications, and anomaly alerts"
          status={slack?.active ? 'connected' : 'disconnected'}
          detail={slack?.teamName ? `Workspace: ${slack.teamName}` : undefined}
          href="/notifications"
          badge="Growth"
        />
      </div>
    </div>
  )
}

function IntegrationCard({
  icon, iconBg, iconColor, name, description, status, detail, lastSync, href, badge
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  detail?: string
  lastSync?: string
  href: string
  badge?: string
}) {
  const statusConfig = {
    connected: { icon: <CheckCircle size={14} />, color: '#067647', label: 'Connected' },
    disconnected: { icon: <XCircle size={14} />, color: 'rgba(51,6,61,0.4)', label: 'Not connected' },
    error: { icon: <AlertCircle size={14} />, color: '#B42318', label: 'Error' },
  }
  const s = statusConfig[status]

  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-card rounded-xl border border-border p-5 hover:border-border-emphasis transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">{name}</h3>
          {badge && (
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: '#DAC0FD', color: '#33063D' }}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5">{description}</p>
        {detail && <p className="text-xs text-muted mt-0.5 font-mono">{detail}</p>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1 text-xs" style={{ color: s.color }}>
          {s.icon} {s.label}
        </span>
        <ArrowRight size={14} className="text-border group-hover:text-muted transition-colors" />
      </div>
    </Link>
  )
}
