'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Building2, Cloud, GitBranch, Zap } from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'

// ── Step definitions ───────────────────────────────────────────────────────
const STEPS = [
  { id: 'org',         label: 'Your organisation' },
  { id: 'connect',     label: 'Connect AWS'        },
  { id: 'scan',        label: 'First scan'         },
  { id: 'done',        label: 'You\'re set up'     },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Step 0 — org
  const [orgName,   setOrgName]   = useState('')
  const [orgDomain, setOrgDomain] = useState('')

  // Step 1 — AWS connection
  const [roleArn,    setRoleArn]    = useState('')
  const [externalId]                = useState(() => `ifu-labs-${Math.random().toString(36).slice(2, 10)}`)
  const [connected,  setConnected]  = useState(false)
  const [skipConnect, setSkipConnect] = useState(false)

  // Step 2 — scan
  const [scanStarted, setScanStarted] = useState(false)
  const [scanDone,    setScanDone]    = useState(false)
  const [scanResult,  setScanResult]  = useState<any>(null)

  const next = () => { setError(''); setStep(s => s + 1) }
  const back = () => { setError(''); setStep(s => s - 1) }

  // ── Step handlers ──────────────────────────────────────────────────────

  const handleCreateOrg = async () => {
    if (!orgName.trim()) { setError('Organisation name is required'); return }
    setLoading(true); setError('')
    try {
      await api.auth.onboard({ orgName: orgName.trim(), orgDomain: orgDomain.trim() || undefined })
      next()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAws = async () => {
    if (!roleArn.trim()) { setError('Role ARN is required'); return }
    setLoading(true); setError('')
    try {
      await api.integrations.connectAws({ roleArn: roleArn.trim(), externalId })
      setConnected(true)
      next()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartScan = async () => {
    setScanStarted(true); setError('')
    try {
      const integrations = await api.integrations.list()
      const aws = integrations.find(i => i.type === 'aws')
      if (aws) {
        await api.integrations.sync(aws.id)
        // Poll for scan completion
        await pollScanCompletion()
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const pollScanCompletion = async () => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const scans = await api.scans.list()
        const latest = scans[0]
        if (latest?.status === 'complete') {
          setScanResult(latest)
          setScanDone(true)
          return
        }
        if (latest?.status === 'failed') {
          setError('Scan failed: ' + (latest.error || 'Unknown error'))
          return
        }
      } catch { /* keep polling */ }
    }
    // Timed out — proceed anyway
    setScanDone(true)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
            <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-sm text-ink">iFu Labs · Comply</span>
        </div>
        <span className="text-xs text-muted font-mono">Setup {step + 1} of {STEPS.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-brand transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-0 pt-10 pb-8 px-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                i < step  ? 'bg-brand text-white' :
                i === step ? 'bg-brand text-white ring-4 ring-brand/20' :
                             'bg-border text-muted'
              )}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={clsx(
                'text-xs mt-1.5 whitespace-nowrap',
                i === step ? 'text-ink font-medium' : 'text-muted'
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('w-16 h-0.5 mx-2 mb-5 transition-all', i < step ? 'bg-brand' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-16">
        <div className="w-full max-w-lg">

          {/* ── Step 0: Organisation ─────────────────────────────── */}
          {step === 0 && (
            <StepCard
              icon={<Building2 size={24} className="text-brand" />}
              title="Set up your organisation"
              desc="This creates your team workspace. You can invite team members after setup."
            >
              <div className="space-y-4">
                <Field label="Organisation name *">
                  <input
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                    placeholder="Acme Corp"
                    autoFocus
                    className={inputCls}
                  />
                </Field>
                <Field label="Company domain (optional)">
                  <input
                    value={orgDomain}
                    onChange={e => setOrgDomain(e.target.value)}
                    placeholder="acme.com"
                    className={inputCls}
                  />
                  <p className="text-xs text-muted mt-1">Used to auto-verify teammates who sign up with this email domain.</p>
                </Field>
              </div>
              {error && <ErrorMsg message={error} />}
              <PrimaryButton onClick={handleCreateOrg} loading={loading} label="Create organisation" />
            </StepCard>
          )}

          {/* ── Step 1: Connect AWS ──────────────────────────────── */}
          {step === 1 && (
            <StepCard
              icon={<Cloud size={24} className="text-[#FF9900]" />}
              title="Connect your AWS account"
              desc="We need read-only access to your AWS account to start checking compliance controls. Takes about 5 minutes."
            >
              <div className="bg-brand-light border border-brand/15 rounded-lg p-4 text-xs text-brand space-y-2">
                <p className="font-medium">Create a read-only cross-account IAM role:</p>
                <ol className="list-decimal list-inside space-y-1 text-brand/80">
                  <li>Open AWS IAM → Roles → Create role</li>
                  <li>Select <strong>Another AWS account</strong></li>
                  <li>Enter Account ID: <code className="font-mono bg-brand/10 px-1 rounded">{process.env.NEXT_PUBLIC_AWS_ACCOUNT_ID || '123456789012'}</code></li>
                  <li>Enable <strong>Require external ID</strong>: <code className="font-mono bg-brand/10 px-1 rounded">{externalId}</code></li>
                  <li>Attach policy: <code className="font-mono bg-brand/10 px-1 rounded">SecurityAudit</code></li>
                  <li>Name it anything (e.g. <code className="font-mono bg-brand/10 px-1 rounded">iFuLabsComplyRole</code>)</li>
                  <li>Copy the Role ARN and paste it below</li>
                </ol>
              </div>

              <Field label="Role ARN">
                <input
                  value={roleArn}
                  onChange={e => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/iFuLabsComplyRole"
                  className={inputCls + ' font-mono'}
                />
              </Field>

              {error && <ErrorMsg message={error} />}

              <div className="flex flex-col gap-3">
                <PrimaryButton onClick={handleConnectAws} loading={loading} label="Connect AWS account" />
                <button
                  onClick={() => { setSkipConnect(true); next() }}
                  className="text-xs text-muted hover:text-ink transition-colors text-center"
                >
                  Skip for now — I'll connect later
                </button>
              </div>
            </StepCard>
          )}

          {/* ── Step 2: First scan ───────────────────────────────── */}
          {step === 2 && (
            <StepCard
              icon={<Zap size={24} className="text-brand" />}
              title={scanDone ? 'First scan complete!' : skipConnect ? 'Ready to scan' : 'Run your first scan'}
              desc={
                skipConnect
                  ? 'You skipped AWS connection. Connect an integration from the dashboard to start scanning.'
                  : scanDone
                  ? 'Your compliance baseline has been established. Here\'s what we found:'
                  : 'We\'ll check your AWS environment against 20 SOC 2 controls. Takes about 2 minutes.'
              }
            >
              {/* Scan result summary */}
              {scanDone && scanResult && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-light border border-green/20 rounded-lg p-3 text-center">
                    <div className="font-mono text-xl font-medium text-green">{scanResult.passCount}</div>
                    <div className="text-xs text-muted mt-0.5">Passing</div>
                  </div>
                  <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 text-center">
                    <div className="font-mono text-xl font-medium text-danger">{scanResult.failCount}</div>
                    <div className="text-xs text-muted mt-0.5">Failing</div>
                  </div>
                  <div className="bg-bg border border-border rounded-lg p-3 text-center">
                    <div className="font-mono text-xl font-medium text-ink">{scanResult.totalControls}</div>
                    <div className="text-xs text-muted mt-0.5">Total</div>
                  </div>
                </div>
              )}

              {/* Scan in progress */}
              {scanStarted && !scanDone && (
                <div className="bg-bg border border-border rounded-lg p-4 flex items-center gap-3">
                  <Loader2 size={16} className="text-brand animate-spin flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-ink">Scanning your AWS environment...</div>
                    <div className="text-xs text-muted mt-0.5">Checking IAM, S3, CloudTrail, RDS, GuardDuty, EC2</div>
                  </div>
                </div>
              )}

              {error && <ErrorMsg message={error} />}

              {!skipConnect && !scanStarted && (
                <PrimaryButton onClick={handleStartScan} loading={false} label="Run first scan" />
              )}

              {(scanDone || skipConnect) && (
                <PrimaryButton onClick={next} loading={false} label="Go to dashboard →" />
              )}
            </StepCard>
          )}

          {/* ── Step 3: Done ─────────────────────────────────────── */}
          {step === 3 && (
            <StepCard
              icon={<CheckCircle size={24} className="text-green" />}
              title="You're all set up!"
              desc="Your compliance dashboard is ready. Here's what you can do next:"
            >
              <div className="space-y-3">
                {[
                  { icon: '🛡️', title: 'Review failing controls', desc: 'See what needs fixing and get AI-powered remediation steps', href: '/dashboard/controls?status=fail' },
                  { icon: '📄', title: 'Export evidence pack', desc: 'Generate a PDF audit pack for your SOC 2 review', href: '/dashboard/evidence' },
                  { icon: '🏢', title: 'Add vendors', desc: 'Track third-party vendor certifications and expiry dates', href: '/dashboard/vendors' },
                  { icon: '💰', title: 'Run cost analysis', desc: 'Find AWS waste and savings opportunities', href: '/dashboard/finops' },
                ].map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg hover:border-brand/30 transition-all group"
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{item.title}</div>
                      <div className="text-xs text-muted">{item.desc}</div>
                    </div>
                    <ArrowRight size={14} className="text-muted group-hover:text-brand transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full mt-2 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-mid transition-all"
              >
                Go to dashboard
              </button>
            </StepCard>
          )}

          {/* Back button */}
          {step > 0 && step < 3 && (
            <button
              onClick={back}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mx-auto mt-4"
            >
              <ArrowLeft size={13} /> Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function StepCard({ icon, title, desc, children }: {
  icon: React.ReactNode; title: string; desc: string; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
      <div>
        <div className="w-12 h-12 bg-bg border border-border rounded-xl flex items-center justify-center mb-4">
          {icon}
        </div>
        <h1 className="font-serif text-2xl font-normal text-ink mb-2">{title}</h1>
        <p className="text-sm text-muted leading-relaxed">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-mono uppercase tracking-wider text-muted block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function PrimaryButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-mid transition-all disabled:opacity-60 mt-2"
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {label}
    </button>
  )
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="p-3 bg-danger/5 border border-danger/20 rounded text-xs text-danger">
      {message}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted focus:outline-none focus:border-brand/50 transition-colors'
