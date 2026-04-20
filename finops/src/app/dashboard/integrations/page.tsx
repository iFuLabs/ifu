'use client'
import { useState, useEffect } from 'react'
import { Cloud, CheckCircle, AlertCircle, RefreshCw, Plus } from 'lucide-react'
import clsx from 'clsx'

interface Integration {
  id: string
  type: 'aws' | 'github'
  status: 'connected' | 'disconnected' | 'error'
  metadata?: { accountId?: string; alias?: string }
  lastSyncAt?: string
  lastError?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showAwsForm, setShowAwsForm] = useState(false)
  const [roleArn, setRoleArn] = useState('')
  const [externalId] = useState(() => `ifu-${Math.random().toString(36).slice(2, 10)}`)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
      }
    } catch (err) {
      console.error('Failed to load integrations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAws = async () => {
    if (!roleArn.trim()) {
      setError('Role ARN is required')
      return
    }
    setConnecting(true)
    setError('')
    
    try {
      const res = await fetch('/api/v1/integrations/aws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleArn: roleArn.trim(), externalId })
      })
      
      if (res.ok) {
        setShowAwsForm(false)
        setRoleArn('')
        loadIntegrations()
      } else {
        const data = await res.json()
        setError(data.message || 'Failed to connect AWS')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const awsIntegration = integrations.find(i => i.type === 'aws')

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-border rounded w-48 mb-6"></div>
          <div className="h-32 bg-border rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-normal text-ink">Integrations</h1>
        <p className="text-sm text-muted mt-0.5">Connect your AWS account to enable cost analysis</p>
      </div>

      {/* AWS Integration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FF9900]/10 rounded-lg flex items-center justify-center">
              <Cloud size={24} className="text-[#FF9900]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-ink">AWS</h2>
              <p className="text-xs text-muted">Amazon Web Services</p>
            </div>
          </div>
          
          {awsIntegration ? (
            <div className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              awsIntegration.status === 'connected' ? 'bg-green-light text-green' :
              awsIntegration.status === 'error' ? 'bg-danger/10 text-danger' :
              'bg-border text-muted'
            )}>
              {awsIntegration.status === 'connected' ? (
                <><CheckCircle size={12} /> Connected</>
              ) : awsIntegration.status === 'error' ? (
                <><AlertCircle size={12} /> Error</>
              ) : (
                <>Disconnected</>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-border text-muted">
              Not connected
            </div>
          )}
        </div>

        {awsIntegration ? (
          <div className="space-y-3">
            {awsIntegration.metadata?.accountId && (
              <div className="text-sm">
                <span className="text-muted">Account ID:</span>{' '}
                <span className="font-mono text-ink">{awsIntegration.metadata.accountId}</span>
              </div>
            )}
            {awsIntegration.lastSyncAt && (
              <div className="text-sm text-muted">
                Last synced: {new Date(awsIntegration.lastSyncAt).toLocaleString()}
              </div>
            )}
            {awsIntegration.lastError && (
              <div className="text-xs text-danger bg-danger/5 border border-danger/20 rounded p-2">
                {awsIntegration.lastError}
              </div>
            )}
            <button
              onClick={loadIntegrations}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-ink border border-border rounded transition-all"
            >
              <RefreshCw size={14} />
              Refresh status
            </button>
          </div>
        ) : (
          <>
            {!showAwsForm ? (
              <div>
                <p className="text-sm text-muted mb-4">
                  Connect your AWS account to enable cost analysis and waste detection.
                </p>
                <button
                  onClick={() => setShowAwsForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-mid transition-all"
                >
                  <Plus size={16} />
                  Connect AWS account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-brand-light border border-brand/15 rounded-lg p-4 text-xs text-brand space-y-2">
                  <p className="font-medium">Create a read-only cross-account IAM role:</p>
                  <ol className="list-decimal list-inside space-y-1 text-brand/80">
                    <li>Open AWS IAM → Roles → Create role</li>
                    <li>Select <strong>Another AWS account</strong></li>
                    <li>Enter Account ID: <code className="font-mono bg-brand/10 px-1 rounded">{process.env.NEXT_PUBLIC_AWS_ACCOUNT_ID || '123456789012'}</code></li>
                    <li>Enable <strong>Require external ID</strong>: <code className="font-mono bg-brand/10 px-1 rounded">{externalId}</code></li>
                    <li>Attach managed policy: <code className="font-mono bg-brand/10 px-1 rounded">ViewOnlyAccess</code></li>
                    <li>Add inline policy for Cost Explorer (see below)</li>
                    <li>Name it (e.g. <code className="font-mono bg-brand/10 px-1 rounded">iFuLabsFinOpsRole</code>)</li>
                    <li>Copy the Role ARN</li>
                  </ol>
                  
                  <details className="mt-3">
                    <summary className="cursor-pointer font-medium text-brand hover:text-brand-mid">
                      📋 Cost Explorer inline policy (click to expand)
                    </summary>
                    <pre className="mt-2 p-2 bg-brand/10 rounded text-[10px] overflow-x-auto">
{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ce:GetCostAndUsage",
      "ce:GetCostForecast",
      "ce:GetReservationCoverage",
      "ce:GetSavingsPlansCoverage",
      "ce:GetRightsizingRecommendation"
    ],
    "Resource": "*"
  }]
}`}
                    </pre>
                  </details>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-muted block mb-1.5">
                    Role ARN
                  </label>
                  <input
                    type="text"
                    value={roleArn}
                    onChange={(e) => setRoleArn(e.target.value)}
                    placeholder="arn:aws:iam::123456789012:role/iFuLabsRole"
                    className="w-full px-3 py-2.5 text-sm font-mono border border-border rounded-lg bg-bg text-ink placeholder:text-muted focus:outline-none focus:border-brand/50 transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleConnectAws}
                    disabled={connecting}
                    className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-mid transition-all disabled:opacity-60"
                  >
                    {connecting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => { setShowAwsForm(false); setError('') }}
                    className="px-4 py-2 text-sm text-muted hover:text-ink border border-border rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info box */}
      <div className="bg-bg border border-border rounded-lg p-4">
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-ink">Required permissions:</strong> FinOps needs <code className="font-mono bg-surface px-1 rounded">ViewOnlyAccess</code> (AWS managed policy) 
          plus Cost Explorer API access to analyze spending, detect waste, and provide optimization recommendations. 
          All credentials are encrypted and never shared.
        </p>
      </div>
    </div>
  )
}
