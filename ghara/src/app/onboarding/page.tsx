'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, CheckCircle, ArrowRight, Loader2, ExternalLink, Copy, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [cfnData, setCfnData] = useState<any>(null)
  const [roleArn, setRoleArn] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResults, setScanResults] = useState<any>(null)
  const [error, setError] = useState('')

  // Fetch CloudFormation URL on mount
  useEffect(() => {
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

    setConnecting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/integrations/aws`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleArn: roleArn.trim(),
          externalId: cfnData?.externalId || `ghara-onboarding`,
          product: 'ghara'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to connect')
      }

      setStep(2) // Move to scanning step
      startScanPolling()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const startScanPolling = () => {
    setScanning(true)
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        // Fetch actual results
        fetchResults()
      }
      setScanProgress(Math.min(progress, 99))
    }, 800)

    // Also poll the actual scan status
    const pollScans = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/scans`, { credentials: 'include' })
        if (res.ok) {
          const scans = await res.json()
          const latest = scans[0]
          if (latest?.status === 'complete') {
            clearInterval(pollScans)
            clearInterval(interval)
            setScanProgress(100)
            fetchResults()
          }
        }
      } catch {}
    }, 3000)

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(interval)
      clearInterval(pollScans)
      if (!scanResults) {
        setScanProgress(100)
        fetchResults()
      }
    }, 120000)
  }

  const fetchResults = async () => {
    try {
      const [scoreRes, finopsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/controls/score`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch(`${API_URL}/api/v1/finops/summary`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      ])

      setScanResults({
        complianceScore: scoreRes?.overall || 0,
        criticalGaps: scoreRes?.frameworks?.soc2?.fail || 0,
        monthlySavings: finopsRes?.totalMonthlySavings || 0,
        securityFindings: (scoreRes?.frameworks?.soc2?.fail || 0) + (scoreRes?.frameworks?.iso27001?.fail || 0),
      })
      setScanning(false)
      setStep(3)
    } catch {
      setScanResults({ complianceScore: 0, criticalGaps: 0, monthlySavings: 0, securityFindings: 0 })
      setScanning(false)
      setStep(3)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <img src="/brand/logo.svg" alt="Ghara" className="h-7" />
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-8 h-1 rounded-full transition-colors"
              style={{ background: i <= step ? '#8A63E6' : 'rgba(51,6,61,0.1)' }}
            />
          ))}
        </div>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(138,99,230,0.1)' }}>
                <Cloud size={32} style={{ color: '#8A63E6' }} />
              </div>
              <h1 className="text-2xl font-semibold text-ink mb-2">Let's connect your AWS account</h1>
              <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
                Ghara uses a read-only IAM role to scan for compliance gaps and cost waste. Takes about 3 minutes.
              </p>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: '#33063D' }}
              >
                Connect AWS
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1: AWS Connection */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-semibold text-ink mb-2">Connect AWS</h1>
              <p className="text-muted text-sm mb-6">
                Create a read-only IAM role in your AWS account, then paste the Role ARN below.
              </p>

              {/* CloudFormation Quick Launch */}
              <div className="bg-card rounded-xl border border-border p-5 mb-4">
                <h2 className="text-sm font-medium text-ink mb-3 flex items-center gap-2">
                  <Sparkles size={14} style={{ color: '#8A63E6' }} />
                  Quick Setup (recommended)
                </h2>
                <p className="text-xs text-muted mb-3">
                  Click below to auto-create the IAM role via CloudFormation. Then copy the Role ARN from the Outputs tab.
                </p>

                {cfnData && (
                  <>
                    <a
                      href={cfnData.cloudFormationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9900] text-white text-sm font-medium rounded-lg hover:bg-[#EC7211] transition-colors"
                    >
                      <ExternalLink size={14} />
                      Launch in AWS Console
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted mt-3 bg-surface rounded-lg px-3 py-2">
                      <span>External ID:</span>
                      <code className="font-mono text-ink">{cfnData.externalId}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(cfnData.externalId)}
                        className="text-accent hover:text-ink"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Role ARN input */}
              <div className="bg-card rounded-xl border border-border p-5">
                <label className="block text-sm font-medium text-ink mb-2">Paste your Role ARN</label>

                {error && (
                  <div className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2 mb-3">{error}</div>
                )}

                <input
                  type="text"
                  value={roleArn}
                  onChange={e => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/GharaReadOnlyRole"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-3"
                />

                <button
                  onClick={handleConnect}
                  disabled={connecting || !roleArn.trim()}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#33063D' }}
                >
                  {connecting && <Loader2 size={16} className="animate-spin" />}
                  {connecting ? 'Connecting...' : 'Connect & Start Scan'}
                </button>
              </div>

              <button
                onClick={() => { setStep(3); setScanResults({ complianceScore: 0, criticalGaps: 0, monthlySavings: 0, securityFindings: 0 }) }}
                className="block mx-auto mt-4 text-xs text-muted hover:text-ink"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* Step 2: Scanning */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(138,99,230,0.1)' }}>
                <Loader2 size={32} style={{ color: '#8A63E6' }} className="animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold text-ink mb-2">Scanning your AWS account</h1>
              <p className="text-muted text-sm mb-6">
                Checking compliance controls, cost waste, and security posture...
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(51,6,61,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${scanProgress}%`, background: '#8A63E6' }}
                />
              </div>
              <p className="text-xs text-muted">{Math.round(scanProgress)}% complete</p>
            </div>
          )}

          {/* Step 3: Results (the "wow" moment) */}
          {step === 3 && scanResults && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(138,99,230,0.1)' }}>
                <CheckCircle size={32} style={{ color: '#8A63E6' }} />
              </div>
              <h1 className="text-2xl font-semibold text-ink mb-2">Here's what we found</h1>
              <p className="text-muted text-sm mb-6">Your AWS account scan is complete.</p>

              {/* Results grid */}
              <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                <ResultCard
                  label="SOC 2 Readiness"
                  value={`${scanResults.complianceScore}%`}
                  color="#8A63E6"
                />
                <ResultCard
                  label="Critical Gaps"
                  value={scanResults.criticalGaps}
                  color="#B42318"
                />
                <ResultCard
                  label="Cost Waste Detected"
                  value={scanResults.monthlySavings > 0 ? `$${Math.round(scanResults.monthlySavings).toLocaleString()}/mo` : '$0/mo'}
                  color="#067647"
                />
                <ResultCard
                  label="Security Findings"
                  value={scanResults.securityFindings}
                  color="#B54708"
                />
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: '#33063D' }}
              >
                Show me the details
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
          <img src="/brand/ifulabs-logo.svg" alt="iFU Labs" className="h-3 opacity-50 hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  )
}

function ResultCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className="font-mono text-xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}
