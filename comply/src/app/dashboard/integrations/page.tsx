'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'

// Type definition
type Integration = any
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Cloud, GitBranch, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

export default function IntegrationsPage() {
  const { data: integrations, mutate } = useSWR('integrations', api.integrations.list)
  const [showAwsForm,    setShowAwsForm]    = useState(false)
  const [showGithubForm, setShowGithubForm] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [autoConnecting, setAutoConnecting] = useState(false)
  const [autoConnectError, setAutoConnectError] = useState('')
  const [slackStatus, setSlackStatus] = useState<any>(null)
  const [slackLoading, setSlackLoading] = useState(true)
  const searchParams = useSearchParams()

  const awsIntegration    = integrations?.find(i => i.type === 'aws')
  const githubIntegration = integrations?.find(i => i.type === 'github')

  // Auto-connect GitHub when redirected from GitHub App install
  useEffect(() => {
    const installationId = searchParams.get('installation_id')
    if (installationId && !githubIntegration && !autoConnecting) {
      // First check if user is authenticated
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/me`, { credentials: 'include' })
        .then(r => {
          if (!r.ok) {
            // Not authenticated — redirect to login with return URL
            const returnUrl = encodeURIComponent(`/dashboard/integrations?installation_id=${installationId}`)
            window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}/login?redirect=${returnUrl}`
            return
          }
          // Authenticated — proceed with auto-connect
          setAutoConnecting(true)
          api.integrations.connectGithub({ installationId: parseInt(installationId, 10) })
            .then(() => {
              mutate()
              window.history.replaceState({}, '', '/dashboard/integrations')
            })
            .catch((err: any) => {
              setAutoConnectError(err.message || 'Failed to connect GitHub')
            })
            .finally(() => setAutoConnecting(false))
        })
        .catch(() => {
          const returnUrl = encodeURIComponent(`/dashboard/integrations?installation_id=${installationId}`)
          window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}/login?redirect=${returnUrl}`
        })
    }
  }, [searchParams, githubIntegration])

  // Load Slack status
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/slack`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setSlackStatus(data))
      .catch(() => {})
      .finally(() => setSlackLoading(false))
  }, [])

  const handleSlackConnect = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/slack/install`, { credentials: 'include' })
      if (res.ok) {
        const { installUrl } = await res.json()
        window.location.href = installUrl
      }
    } catch (err) {
      console.error('Failed to start Slack install:', err)
    }
  }

  const handleSlackDisconnect = async () => {
    if (!confirm('Disconnect Slack? You will stop receiving notifications.')) return
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/slack`, {
      method: 'DELETE',
      credentials: 'include'
    })
    setSlackStatus(null)
    window.location.reload()
  }

  const handleSync = async (id: string) => {
    setSyncing(id)
    try { await api.integrations.sync(id); mutate() }
    finally { setSyncing(null) }
  }

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this integration? Scan history will be preserved.')) return
    await api.integrations.disconnect(id)
    mutate()
    window.location.reload()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Integrations</h1>
        <p className="text-sm text-muted mt-0.5">Connect your cloud accounts to start automated compliance scanning.</p>
      </div>

      {/* Auto-connect status */}
      {autoConnecting && (
        <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-xl text-sm">
          <RefreshCw size={14} className="animate-spin text-accent" />
          <span className="text-ink">Connecting your GitHub organisation...</span>
        </div>
      )}
      {autoConnectError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#FEF3F2', border: '1px solid rgba(180, 35, 24, 0.2)' }}>
          <AlertCircle size={14} style={{ color: '#B42318' }} />
          <span style={{ color: '#B42318' }}>{autoConnectError}</span>
        </div>
      )}

      {/* AWS */}
      <IntegrationCard
        logo={<span className="text-xl">☁️</span>}
        logoBg="bg-[#FF9900]/10"
        name="Amazon Web Services"
        desc="IAM, S3, CloudTrail, RDS, GuardDuty, EC2 — 20 automated controls"
        integration={awsIntegration}
        onConnect={() => setShowAwsForm(true)}
        onReconnect={awsIntegration?.status === 'error' ? () => setShowAwsForm(true) : undefined}
        onSync={() => awsIntegration && handleSync(awsIntegration.id)}
        onDisconnect={() => awsIntegration && handleDisconnect(awsIntegration.id)}
        syncing={syncing === awsIntegration?.id}
        connectLabel="Connect AWS"
        connectColor="bg-accent hover:bg-accent/90 text-white"
        metaFields={[
          { label: 'Account ID', value: awsIntegration?.metadata?.accountId },
          { label: 'Alias',      value: awsIntegration?.metadata?.alias },
        ]}
      >
        {showAwsForm && (
          <AwsConnectForm
            existingIntegration={awsIntegration}
            onSuccess={() => { setShowAwsForm(false); mutate() }}
            onCancel={() => setShowAwsForm(false)}
          />
        )}
      </IntegrationCard>

      {/* GitHub */}
      <IntegrationCard
        logo={<GitBranch size={18} className="text-ink" />}
        logoBg="bg-border/60"
        name="GitHub"
        desc="Branch protection, 2FA enforcement, secret scanning, Dependabot, PR reviews — 6 controls"
        integration={githubIntegration}
        onConnect={() => window.location.href = 'https://github.com/apps/ifu-labs/installations/new'}
        onReconnect={githubIntegration?.status === 'error' ? () => window.location.href = 'https://github.com/apps/ifu-labs/installations/new' : undefined}
        onSync={() => githubIntegration && handleSync(githubIntegration.id)}
        onDisconnect={() => githubIntegration && handleDisconnect(githubIntegration.id)}
        syncing={syncing === githubIntegration?.id}
        connectLabel="Connect GitHub"
        connectColor="bg-ink hover:bg-ink/80 text-white"
        metaFields={[
          { label: 'Organisation', value: githubIntegration?.metadata?.orgLogin },
          { label: 'Repo access',  value: githubIntegration?.metadata?.repoSelection },
        ]}
      >
        {showGithubForm && (
          <GitHubConnectForm
            onSuccess={() => { setShowGithubForm(false); mutate() }}
            onCancel={() => setShowGithubForm(false)}
          />
        )}
      </IntegrationCard>

      {/* Slack */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 bg-[#4A154B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare size={18} style={{ color: '#4A154B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-ink">Slack</h2>
            <p className="text-xs text-muted mt-0.5 truncate">Real-time compliance and cost alerts in your Slack workspace</p>
          </div>
          {slackStatus?.connected ? (
            <span className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded text-accent bg-accent-light flex-shrink-0">
              <CheckCircle size={12} /> Connected
            </span>
          ) : (
            <button
              onClick={handleSlackConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all flex-shrink-0"
              style={{ background: '#4A154B', color: '#fff' }}
            >
              <Plus size={12} /> Add to Slack
            </button>
          )}
        </div>

        {slackStatus?.connected && (
          <div className="px-6 py-4">
            <div className="flex items-center gap-6 text-xs font-mono mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Workspace</div>
                <div className="text-ink">{slackStatus.teamName}</div>
              </div>
              {slackStatus.channelName && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Channel</div>
                  <div className="text-ink">#{slackStatus.channelName}</div>
                </div>
              )}
            </div>
            <button
              onClick={handleSlackDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:border-danger/30 hover:text-danger transition-all text-muted"
            >
              <Trash2 size={12} /> Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Coming soon */}
      {[
        { name: 'Okta',             desc: 'SSO policies, MFA enforcement, user lifecycle' },
        { name: 'Google Workspace', desc: 'Admin policies, 2FA enforcement, Drive sharing settings' },
      ].map(item => (
        <div key={item.name} className="bg-card border border-border rounded-xl flex items-center gap-4 px-6 py-5 opacity-50">
          <div className="w-10 h-10 bg-border/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Cloud size={18} className="text-muted" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-ink">{item.name}</h2>
            <p className="text-xs text-muted mt-0.5">{item.desc}</p>
          </div>
          <span className="font-mono text-[10px] text-muted bg-border px-2 py-1 rounded uppercase tracking-wider">Coming soon</span>
        </div>
      ))}
    </div>
  )
}

// ── Reusable integration card ──────────────────────────────────────────────

function IntegrationCard({
  logo, logoBg, name, desc, integration,
  onConnect, onSync, onDisconnect,
  syncing, connectLabel, connectColor, metaFields, children, onReconnect
}: {
  logo: React.ReactNode
  logoBg: string
  name: string
  desc: string
  integration?: Integration
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
  onReconnect?: () => void
  syncing: boolean
  connectLabel: string
  connectColor: string
  metaFields: { label: string; value?: string }[]
  children?: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', logoBg)}>
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-ink">{name}</h2>
          <p className="text-xs text-muted mt-0.5 truncate">{desc}</p>
        </div>
        {integration
          ? <StatusBadge status={integration.status} />
          : (
            <button
              onClick={onConnect}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all flex-shrink-0', connectColor)}
            >
              <Plus size={12} /> {connectLabel}
            </button>
          )
        }
      </div>

      {integration && (
        <div className="px-6 py-4">
          <div className="flex items-center gap-6 text-xs font-mono mb-4 flex-wrap">
            {metaFields.filter(f => f.value).map(f => (
              <div key={f.label}>
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{f.label}</div>
                <div className="text-ink capitalize">{f.value}</div>
              </div>
            ))}
            {integration.lastSyncAt && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Last scanned</div>
                <div className="text-ink">{formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}</div>
              </div>
            )}
          </div>

          {integration.lastError && (
            <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger mb-4">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{integration.lastError}</div>
                {onReconnect && (
                  <button onClick={onReconnect} className="text-danger underline mt-1 font-medium">
                    Reconnect →
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded bg-bg hover:bg-border/50 transition-all text-muted hover:text-ink disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Scanning...' : 'Scan now'}
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:border-danger/30 hover:text-danger transition-all text-muted"
            >
              <Trash2 size={12} /> Disconnect
            </button>
          </div>
        </div>
      )}

      {children && (
        <div className="px-6 py-5 border-t border-border bg-bg">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Integration['status'] }) {
  const config = {
    connected:    { icon: <CheckCircle size={12} />, label: 'Connected',    color: 'text-accent bg-accent-light' },
    disconnected: { icon: <XCircle size={12} />,     label: 'Disconnected', color: 'text-muted bg-border' },
    error:        { icon: <AlertCircle size={12} />, label: 'Error',        color: 'text-danger bg-danger/10' },
  }
  const c = config[status]
  return (
    <span className={clsx('flex items-center gap-1 font-mono text-xs px-2 py-1 rounded flex-shrink-0', c.color)}>
      {c.icon} {c.label}
    </span>
  )
}

// ── AWS connect form ───────────────────────────────────────────────────────

function AwsConnectForm({ existingIntegration, onSuccess, onCancel }: { 
  existingIntegration?: Integration
  onSuccess: () => void
  onCancel: () => void 
}) {
  const [roleArn,    setRoleArn] = useState('')
  // Use existing external ID if reconnecting, otherwise generate new one
  const [externalId] = useState(() => 
    existingIntegration?.metadata?.externalId || `ifu-labs-${Math.random().toString(36).slice(2, 10)}`
  )
  const [awsAccountId, setAwsAccountId] = useState('385936845264')
  const [loading, setLoading]    = useState(false)
  const [error, setError]        = useState('')

  const isReconnecting = !!existingIntegration

  // Fetch AWS account ID on mount
  useState(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/integrations/aws/setup-info`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setAwsAccountId(data.accountId))
      .catch(err => console.error('Failed to load AWS account ID:', err))
  })

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      await api.integrations.connectAws({ roleArn, externalId })
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-ink">
        {isReconnecting ? 'Reconnect AWS Account' : 'Connect AWS Account'}
      </h3>

      {isReconnecting ? (
        <div className="bg-accent-light border border-accent/20 rounded p-4 text-xs text-accent space-y-1.5">
          <p className="font-medium">Update your IAM role credentials:</p>
          <ol className="list-decimal list-inside space-y-1 text-accent/80">
            <li>Your existing External ID is preserved: <code className="font-mono bg-accent/10 px-1 rounded">{externalId}</code></li>
            <li>No need to update your IAM role trust policy</li>
            <li>Just paste the Role ARN below to reconnect</li>
          </ol>
        </div>
      ) : (
        <div className="bg-accent-light border border-accent/20 rounded p-4 text-xs text-accent space-y-1.5">
          <p className="font-medium">Create a read-only cross-account IAM role:</p>
          <ol className="list-decimal list-inside space-y-1 text-accent/80">
            <li>IAM → Roles → Create role → Another AWS account</li>
            <li>Account ID: <code className="font-mono bg-accent/10 px-1 rounded">{awsAccountId}</code></li>
            <li>Require external ID: <code className="font-mono bg-accent/10 px-1 rounded">{externalId}</code></li>
            <li>Attach the <code className="font-mono bg-accent/10 px-1 rounded">SecurityAudit</code> managed policy</li>
            <li>Paste the Role ARN below</li>
          </ol>
        </div>
      )}

      <div>
        <label className="text-xs text-muted font-mono uppercase tracking-wider block mb-1.5">Role ARN</label>
        <input
          value={roleArn}
          onChange={e => setRoleArn(e.target.value)}
          placeholder="arn:aws:iam::123456789012:role/iFuLabsComplyRole"
          className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono"
        />
      </div>

      {error && <ErrorBox message={error} />}

      <FormActions
        onSubmit={handleSubmit} onCancel={onCancel}
        disabled={!roleArn || loading}
        submitLabel={loading ? 'Validating...' : isReconnecting ? 'Reconnect' : 'Connect'}
      />
    </div>
  )
}

// ── GitHub connect form ────────────────────────────────────────────────────

function GitHubConnectForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [installationId, setInstallationId] = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  const handleSubmit = async () => {
    const id = parseInt(installationId, 10)
    if (isNaN(id)) { setError('Installation ID must be a number'); return }
    setLoading(true); setError('')
    try {
      await api.integrations.connectGithub({ installationId: id })
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-ink">Connect GitHub Organisation</h3>

      <div className="bg-surface border border-border rounded p-4 text-xs space-y-1.5">
        <p className="font-medium text-ink">Install the iFu Labs GitHub App:</p>
        <ol className="list-decimal list-inside space-y-1" style={{ color: 'rgba(51, 6, 61, 0.65)' }}>
          <li>
            <a href="https://github.com/apps/ifu-labs" target="_blank" rel="noopener noreferrer"
              className="text-accent underline">
              Click here to install the GitHub App
            </a>
            {' '}and select your organisation
          </li>
          <li>Grant access to all repositories (or selected ones)</li>
          <li>After install, find the Installation ID in the URL:</li>
        </ol>
        <code className="block font-mono bg-surface px-3 py-2 rounded text-muted mt-2">
          github.com/settings/installations/<strong className="text-ink">12345678</strong>
        </code>
      </div>

      <div>
        <label className="text-xs text-muted font-mono uppercase tracking-wider block mb-1.5">
          Installation ID
        </label>
        <input
          value={installationId}
          onChange={e => setInstallationId(e.target.value)}
          placeholder="12345678"
          className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono"
        />
      </div>

      {error && <ErrorBox message={error} />}

      <FormActions
        onSubmit={handleSubmit} onCancel={onCancel}
        disabled={!installationId || loading}
        submitLabel={loading ? 'Validating...' : 'Connect'}
        submitColor="bg-ink hover:bg-ink/80 text-white"
      />
    </div>
  )
}

// ── Micro components ───────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger">
      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {message}
    </div>
  )
}

function FormActions({ onSubmit, onCancel, disabled, submitLabel, submitColor = 'bg-accent hover:bg-accent/90 text-white' }: {
  onSubmit: () => void; onCancel: () => void
  disabled: boolean; submitLabel: string; submitColor?: string
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onSubmit} disabled={disabled}
        className={clsx('px-4 py-2 text-xs rounded transition-all disabled:opacity-50', submitColor)}>
        {submitLabel}
      </button>
      <button onClick={onCancel}
        className="px-4 py-2 text-xs border border-border rounded text-muted hover:text-ink transition-all">
        Cancel
      </button>
    </div>
  )
}
