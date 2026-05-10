'use client'
import { useState, useEffect } from 'react'
import { Cloud, ExternalLink, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react'
import { api } from '@/lib/api'

export default function AwsIntegrationPage() {
  const [step, setStep] = useState<'connect' | 'verify'>('connect')
  const [cfnData, setCfnData] = useState<any>(null)
  const [roleArn, setRoleArn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existing, setExisting] = useState<any>(null)

  useEffect(() => {
    // Check for existing AWS integration
    api.integrations.list().then(integrations => {
      const aws = integrations.find(i => i.type === 'aws' && i.status === 'connected')
      if (aws) setExisting(aws)
    }).catch(() => {})

    // Get CloudFormation URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    fetch(`${API_URL}/api/v1/integrations/aws/cloudformation-url`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCfnData(data) })
      .catch(() => {})
  }, [])

  const handleConnect = async () => {
    if (!roleArn.trim() || !roleArn.startsWith('arn:aws:iam::')) {
      setError('Please enter a valid IAM Role ARN')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.integrations.connectAws({
        roleArn: roleArn.trim(),
        externalId: cfnData?.externalId || `ghara-${Date.now()}`,
        product: 'ghara'
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to connect AWS account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-green-light rounded-xl border border-green/20 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">AWS Connected</h2>
          <p className="text-muted text-sm">
            Your AWS account is connected. An initial scan has been queued — findings will appear on your dashboard shortly.
          </p>
        </div>
      </div>
    )
  }

  if (existing) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink mb-2">AWS Integration</h1>
        <div className="bg-card rounded-xl border border-border p-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-light rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green" />
            </div>
            <div>
              <p className="font-medium text-ink">Connected</p>
              <p className="text-sm text-muted">Account: {existing.metadata?.accountId || 'Unknown'}</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Both compliance and cost engines are reading from this connection.
            {existing.lastSyncAt && ` Last synced: ${new Date(existing.lastSyncAt).toLocaleString()}`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
                await fetch(`${API_URL}/api/v1/integrations/${existing.id}/sync`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                alert('Scan triggered. Results will appear on your dashboard in 2-5 minutes.')
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
            >
              Re-sync now
            </button>
            <button
              onClick={async () => {
                if (!confirm('Disconnect AWS? This will stop all scans until you reconnect.')) return
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
                await fetch(`${API_URL}/api/v1/integrations/${existing.id}`, { method: 'DELETE', credentials: 'include' })
                window.location.reload()
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-danger/30 text-danger hover:bg-danger-bg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-2">Connect AWS</h1>
      <p className="text-muted text-sm mb-6">
        Ghara uses a read-only IAM role to scan your AWS account for compliance gaps and cost waste.
        Both engines share one connection.
      </p>

      {/* CloudFormation Quick Launch (default) */}
      <div className="bg-card rounded-xl border border-border p-6 mb-4">
        <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
          <Cloud size={18} />
          Quick Setup via CloudFormation
          <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">Recommended</span>
        </h2>

        <ol className="text-sm text-muted space-y-2 mb-4 list-decimal list-inside">
          <li>Click the button below to open AWS CloudFormation</li>
          <li>Review the read-only IAM role permissions</li>
          <li>Check the acknowledgment box and click "Create stack"</li>
          <li>Copy the Role ARN from the Outputs tab</li>
          <li>Paste it below to finish connecting</li>
        </ol>

        {cfnData && (
          <div className="space-y-3">
            <a
              href={cfnData.cloudFormationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF9900] text-white text-sm font-medium rounded-lg hover:bg-[#EC7211] transition-colors"
            >
              <ExternalLink size={16} />
              Launch in AWS Console
            </a>

            <div className="flex items-center gap-2 text-xs text-muted bg-surface rounded-lg px-3 py-2">
              <span>External ID:</span>
              <code className="font-mono text-ink">{cfnData.externalId}</code>
              <button
                onClick={() => navigator.clipboard.writeText(cfnData.externalId)}
                className="text-brand hover:text-brand-dark"
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role ARN input */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-ink mb-3">Paste your Role ARN</h2>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger-bg rounded-lg px-3 py-2 mb-3">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={roleArn}
            onChange={e => setRoleArn(e.target.value)}
            placeholder="arn:aws:iam::123456789012:role/GharaReadOnlyRole"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !roleArn.trim()}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}
