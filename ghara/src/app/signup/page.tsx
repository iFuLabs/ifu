'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, CheckCircle, CreditCard } from 'lucide-react'

const PLUM = '#33063D'
const IRIS = '#8A63E6'
const LAVENDER = '#DAC0FD'
const BORDER = 'rgba(51, 6, 61, 0.2)'
const MUTED = 'rgba(51, 6, 61, 0.7)'
const SUBTLE = 'rgba(51, 6, 61, 0.5)'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const inputStyle = {
  width: '100%', padding: '14px 16px', fontSize: '15px',
  background: '#FFFFFF', border: `1px solid ${BORDER}`,
  borderRadius: '10px', color: PLUM, outline: 'none',
  transition: 'all 0.2s', fontFamily: "'Aeonik', sans-serif"
}
const labelStyle = {
  display: 'block' as const, fontSize: '13px', fontWeight: '500' as const,
  color: PLUM, marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' as const
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState('')
  const [plan, setPlan] = useState('ghara-growth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const planPrice = plan === 'ghara-growth' ? '$1,299' : '$499'

  const handleContinueToCard = async () => {
    if (!email.trim() || !password.trim() || !orgName.trim()) {
      setError('Email, password, and company name are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError('')
    setStep(2)
  }

  const handlePaystackRedirect = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboard-tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, orgName: orgName.trim(), role: role || undefined, plan })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Signup failed')
      }
      const data = await res.json()
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${LAVENDER} 0%, #FFFFFF 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Aeonik', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
            <img src="/brand/logo.svg" alt="Ghara" style={{ height: 48 }} />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 500, color: PLUM, marginBottom: 8, fontFamily: "'PP Fragment', serif", letterSpacing: '-0.02em' }}>
            {step === 1 ? 'Start your free trial' : 'Choose your plan'}
          </h1>
          <p style={{ fontSize: 15, color: MUTED }}>
            {step === 1 ? '7 days free. Cancel anytime.' : `Card required for verification — first charge on ${trialEndDate}.`}
          </p>
        </div>

        {/* Step 1: Account info */}
        {step === 1 && (
          <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Work email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Company name</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Inc" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = IRIS; e.target.style.boxShadow = '0 0 0 3px rgba(138,99,230,0.15)' }}
                onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Your role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, color: role ? PLUM : SUBTLE }}>
                <option value="">Select...</option>
                <option value="cto">CTO / VP Engineering</option>
                <option value="engineering">Engineering</option>
                <option value="compliance">Compliance / GRC</option>
                <option value="founder">Founder / CEO</option>
                <option value="other">Other</option>
              </select>
            </div>

            {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, fontSize: 14, color: '#B91C1C', marginBottom: 20 }}>{error}</div>}

            <button onClick={handleContinueToCard} style={{ width: '100%', padding: 14, background: PLUM, color: '#fff', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 16px rgba(51,6,61,0.22)' }}
              onMouseOver={e => e.currentTarget.style.background = IRIS} onMouseOut={e => e.currentTarget.style.background = PLUM}>
              Continue <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 14, color: MUTED }}>Already have an account? </span>
              <a href="/login" style={{ fontSize: 14, color: PLUM, textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
            </div>
          </div>
        )}

        {/* Step 2: Plan selection + card capture */}
        {step === 2 && (
          <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, boxShadow: '0 12px 48px rgba(51,6,61,0.12)' }}>

            {/* Plan cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <PlanCard
                name="Growth"
                price="$1,299"
                features="All frameworks, AI, K8s, Slack"
                spend="Up to $100k/mo AWS"
                selected={plan === 'ghara-growth'}
                popular
                onClick={() => setPlan('ghara-growth')}
              />
              <PlanCard
                name="Starter"
                price="$499"
                features="SOC 2, basic cost detection"
                spend="Up to $10k/mo AWS"
                selected={plan === 'ghara-starter'}
                onClick={() => setPlan('ghara-starter')}
              />
            </div>

            {/* Charge info */}
            <div style={{ background: 'rgba(138,99,230,0.04)', border: '1px solid rgba(138,99,230,0.12)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CreditCard size={14} style={{ color: IRIS }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: PLUM }}>No charge today</span>
              </div>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                Your 7-day trial starts now. First charge of {planPrice}/mo on {trialEndDate}. Cancel anytime before then — no charge.
              </p>
            </div>

            {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, fontSize: 14, color: '#B91C1C', marginBottom: 20 }}>{error}</div>}

            <button onClick={handlePaystackRedirect} disabled={loading} style={{ width: '100%', padding: 14, background: loading ? '#F4F4F4' : PLUM, color: loading ? MUTED : '#fff', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 6px 16px rgba(51,6,61,0.22)', transition: 'all 0.2s' }}
              onMouseOver={e => !loading && (e.currentTarget.style.background = IRIS)} onMouseOut={e => !loading && (e.currentTarget.style.background = PLUM)}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Connecting...</> : <>Continue to Paystack <ArrowRight size={18} /></>}
            </button>

            <button onClick={() => setStep(1)} style={{ display: 'block', margin: '16px auto 0', fontSize: 13, color: SUBTLE, background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Back
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(51,6,61,0.4)', marginTop: 16 }}>
              Need enterprise (custom frameworks, SSO, multi-account)? <a href="/demo" style={{ color: IRIS, textDecoration: 'none' }}>Talk to sales →</a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
            <img src="/brand/ifulabs-logo.svg" alt="iFU Labs" style={{ height: 14, opacity: 0.4 }} />
          </a>
        </div>
      </div>
      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function PlanCard({ name, price, features, spend, selected, popular, onClick }: {
  name: string; price: string; features: string; spend: string; selected: boolean; popular?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      background: '#FFFFFF', border: `2px solid ${selected ? IRIS : 'rgba(51,6,61,0.1)'}`,
      borderRadius: 12, padding: '16px', textAlign: 'left', cursor: 'pointer',
      position: 'relative', transition: 'border-color 0.2s',
    }}>
      {popular && <span style={{ position: 'absolute', top: -8, right: 12, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: LAVENDER, color: PLUM, padding: '2px 8px', borderRadius: 4 }}>Popular</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? IRIS : 'rgba(51,6,61,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: IRIS }} />}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: PLUM }}>{name}</span>
      </div>
      <div style={{ fontFamily: "'Aeonik Fono', monospace", fontSize: 20, fontWeight: 600, color: PLUM }}>{price}<span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>/mo</span></div>
      <p style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{spend}</p>
      <p style={{ fontSize: 11, color: SUBTLE, marginTop: 4 }}>{features}</p>
    </button>
  )
}
