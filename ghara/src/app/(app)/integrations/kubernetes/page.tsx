'use client'
import { useState, useEffect } from 'react'
import { Box, CheckCircle, AlertCircle, Loader2, Copy, Terminal } from 'lucide-react'

export default function KubernetesIntegrationPage() {
  const [connectionType, setConnectionType] = useState<'opencost' | 'eks_container_insights'>('opencost')
  const [clusterName, setClusterName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [bearerToken, setBearerToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existing, setExisting] = useState<any[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  useEffect(() => {
    fetch(`${API_URL}/api/v1/integrations/kubernetes`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setExisting(data))
      .catch(() => {})
  }, [API_URL])

  const handleConnect = async () => {
    if (!clusterName.trim()) { setError('Cluster name is required'); return }
    if (connectionType === 'opencost' && !endpointUrl.trim()) { setError('OpenCost endpoint URL is required'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/integrations/kubernetes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterName: clusterName.trim(),
          connectionType,
          endpointUrl: endpointUrl.trim() || undefined,
          bearerToken: bearerToken.trim() || undefined,
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || `HTTP ${res.status}`)
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to connect cluster')
    } finally {
      setLoading(false)
    }
  }

  const helmCommand = `helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm install opencost opencost/opencost \\
  --namespace opencost --create-namespace \\
  --set opencost.exporter.defaultClusterId="${clusterName || 'my-cluster'}" \\
  --set service.type=ClusterIP`

  const kubectlCommand = `kubectl port-forward -n opencost svc/opencost 9003:9003`

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-green-light rounded-xl border border-green/20 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">Cluster Connected</h2>
          <p className="text-muted text-sm">
            Kubernetes cost data will appear in your Cost dashboard after the next scan cycle.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-2">Kubernetes Integration</h1>
      <p className="text-muted text-sm mb-6">
        Connect your Kubernetes clusters to see cost allocation by namespace, workload, and detect idle resources.
        <span className="ml-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Growth tier</span>
      </p>

      {/* Existing clusters */}
      {existing.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-medium text-ink">Connected clusters</h2>
          {existing.filter(k => k.status === 'connected').map(k => (
            <div key={k.id} className="flex items-center gap-3 bg-card rounded-lg border border-border px-4 py-3">
              <Box size={16} className="text-brand" />
              <span className="text-sm text-ink font-medium">{k.clusterName}</span>
              <span className="text-xs text-muted ml-auto">{k.connectionType}</span>
              <CheckCircle size={14} className="text-green" />
            </div>
          ))}
        </div>
      )}

      {/* Connection type selector */}
      <div className="bg-card rounded-xl border border-border p-6 mb-4">
        <h2 className="font-semibold text-ink mb-3">Connection Method</h2>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setConnectionType('opencost')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              connectionType === 'opencost'
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-border text-muted hover:border-border-emphasis'
            }`}
          >
            OpenCost
            <span className="block text-xs font-normal mt-0.5 opacity-70">Any K8s cluster</span>
          </button>
          <button
            onClick={() => setConnectionType('eks_container_insights')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              connectionType === 'eks_container_insights'
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-border text-muted hover:border-border-emphasis'
            }`}
          >
            EKS Container Insights
            <span className="block text-xs font-normal mt-0.5 opacity-70">AWS EKS only</span>
          </button>
        </div>

        {connectionType === 'opencost' && (
          <>
            {/* Deploy OpenCost instructions */}
            <div className="bg-surface rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
                <Terminal size={14} />
                Deploy OpenCost (if not already running)
              </h3>
              <pre className="text-xs text-muted font-mono whitespace-pre-wrap bg-bg rounded p-3 border border-border overflow-x-auto">
                {helmCommand}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(helmCommand)}
                className="mt-2 text-xs text-brand hover:underline flex items-center gap-1"
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Cluster name</label>
                <input
                  type="text"
                  value={clusterName}
                  onChange={e => setClusterName(e.target.value)}
                  placeholder="production-us-east-1"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">OpenCost API endpoint</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={e => setEndpointUrl(e.target.value)}
                  placeholder="https://opencost.your-cluster.example.com:9003"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Bearer token (optional)</label>
                <input
                  type="password"
                  value={bearerToken}
                  onChange={e => setBearerToken(e.target.value)}
                  placeholder="Optional — for authenticated endpoints"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
            </div>
          </>
        )}

        {connectionType === 'eks_container_insights' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Uses your existing AWS connection to read cost data from CloudWatch Container Insights.
              Less granular than OpenCost but requires no extra setup.
            </p>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">EKS cluster name</label>
              <input
                type="text"
                value={clusterName}
                onChange={e => setClusterName(e.target.value)}
                placeholder="my-eks-cluster"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger-bg rounded-lg px-3 py-2 mt-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-4 w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Connect Cluster
        </button>
      </div>
    </div>
  )
}
