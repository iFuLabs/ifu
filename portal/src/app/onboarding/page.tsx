'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Cloud, CheckCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'

const STEPS = [
  { id: 'signup', label: 'Sign Up' },
  { id: 'org', label: 'Organization' },
  { id: 'aws', label: 'Connect AWS' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirm', label: 'Confirm' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const urlProduct = searchParams.get('product')
  const urlPlan = searchParams.get('plan')
  const urlStep = searchParams.get('step')

  useEffect(() => {
    if (urlStep) {
      setStep(parseInt(urlStep))
    }
  }, [urlStep])

  const [orgName, setOrgName] = useState('')
  const [orgDomain, setOrgDomain] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [externalId] = useState(() => `ifu-${Math.random().toString(36).slice(2, 10)}`)
  const [awsAccountId, setAwsAccountId] = useState('123456789012')
  const [skipAws, setSkipAws] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('comply-starter')
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  useEffect(() => {
    if (urlProduct) {
      setSelectedProducts([urlProduct])
      // Set default plan based on product from URL
      if (urlProduct === 'comply' && urlPlan === 'growth') {
        setSelectedPlan('comply-growth')
      } else if (urlProduct === 'comply') {
        setSelectedPlan('comply-starter')
      } else if (urlProduct === 'finops') {
        setSelectedPlan('finops')
      }
    }
    
    // Restore plan from localStorage if returning from payment failure
    const savedPlan = localStorage.getItem('onboarding_plan')
    if (savedPlan && !urlProduct) {
      setSelectedPlan(savedPlan)
      const savedProduct = localStorage.getItem('onboarding_product')
      if (savedProduct) {
        setSelectedProducts([savedProduct])
      }
    }
  }, [urlProduct, urlPlan])

  // Fetch AWS setup info when component mounts
  useEffect(() => {
    api.integrations.getAwsSetupInfo()
      .then(info => setAwsAccountId(info.accountId))
      .catch(err => console.error('Failed to fetch AWS setup info:', err))
  }, [])

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('All fields are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    
    try {
      // In development, just move to next step
      // In production, this would call Auth0 signup
      setStep(1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }
    setLoading(true)
    setError('')
    
    try {
      const response = await api.auth.onboard({ 
        name: name.trim(),
        email: email.trim(),
        password: password,
        orgName: orgName.trim(), 
        orgDomain: orgDomain.trim() || undefined 
      })
      
      // Cookie is set by the backend via Set-Cookie header.
      setStep(2)
    } catch (err: any) {
      setError(err.message)
      // If user already onboarded, skip to AWS step
      if (err.message.includes('already onboarded')) {
        setStep(2)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAws = async () => {
    if (!skipAws && !roleArn.trim()) {
      setError('Role ARN is required')
      return
    }
    setLoading(true)
    setError('')
    
    if (!skipAws) {
      try {
        await api.integrations.connectAws({ 
          roleArn: roleArn.trim(), 
          externalId 
        })
        setStep(3) // Go to payment
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
      setStep(3) // Go to payment
    }
  }

  const handlePayment = async () => {
    setPaymentProcessing(true)
    setError('')
    
    // Save plan to localStorage before redirecting to Paystack
    localStorage.setItem('onboarding_plan', selectedPlan)
    if (selectedProducts.length > 0) {
      localStorage.setItem('onboarding_product', selectedProducts[0])
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: selectedPlan })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Failed to initialize payment')
      }

      const data = await response.json()
      
      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl
    } catch (err: any) {
      setError(err.message)
      setPaymentProcessing(false)
    }
  }

  const handleFinish = () => {
    // Clear localStorage after successful onboarding
    localStorage.removeItem('onboarding_plan')
    localStorage.removeItem('onboarding_product')
    
    if (selectedProducts.includes('comply')) {
      window.location.href = process.env.NEXT_PUBLIC_COMPLY_URL + '/dashboard'
    } else if (selectedProducts.includes('finops')) {
      window.location.href = process.env.NEXT_PUBLIC_FINOPS_URL + '/dashboard'
    } else {
      // Default to Comply if no product selected
      window.location.href = process.env.NEXT_PUBLIC_COMPLY_URL + '/dashboard'
    }
  }

  const productName = urlProduct === 'comply' ? 'Comply' : urlProduct === 'finops' ? 'FinOps' : null
  const planName = urlPlan ? urlPlan.charAt(0).toUpperCase() + urlPlan.slice(1) : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      
      <div style={{ maxWidth: '540px', width: '100%' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: '#1B3A5C',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            color: '#1A1917', 
            marginBottom: '8px',
            fontFamily: "'Fraunces', serif",
            letterSpacing: '-0.02em'
          }}>
            Welcome to iFu Labs
          </h1>
          {productName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#EEF3F9',
              border: '1px solid #E0DDD5',
              borderRadius: '20px',
              fontSize: '13px',
              color: '#1B3A5C',
              fontWeight: '500',
              marginTop: '8px'
            }}>
              <Sparkles size={14} />
              {productName} {planName && `· ${planName}`}
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '40px'
        }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              flex: 1,
              height: '4px',
              background: i <= step ? '#1B3A5C' : '#E0DDD5',
              borderRadius: '2px',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          border: '1px solid #E0DDD5',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>

          {/* Step 0: Sign Up */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#EEF3F9',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B3A5C" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1A1917', 
                  marginBottom: '8px',
                  fontFamily: "'Fraunces', serif"
                }}>
                  Create your account
                </h2>
                <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
                  Get started with your free trial. No credit card required.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Full name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1B3A5C'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0DDD5'
                    e.target.style.background = '#FAFAF8'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Email address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1B3A5C'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0DDD5'
                    e.target.style.background = '#FAFAF8'
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1B3A5C'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0DDD5'
                    e.target.style.background = '#FAFAF8'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#9C9890', marginTop: '6px' }}>
                  Must be at least 8 characters
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#991B1B',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSignup}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#6B685F' : '#1B3A5C',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                ) : (
                  <>Continue <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          )}

          {/* Step 1: Organization */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#EEF3F9',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Building2 size={24} style={{ color: '#1B3A5C' }} />
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1A1917', 
                  marginBottom: '8px',
                  fontFamily: "'Fraunces', serif"
                }}>
                  Create your organization
                </h2>
                <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
                  This creates your team workspace. You can invite team members later.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Organization name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
                  placeholder="Acme Corp"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1B3A5C'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0DDD5'
                    e.target.style.background = '#FAFAF8'
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Company domain (optional)
                </label>
                <input
                  type="text"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  placeholder="acme.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1B3A5C'
                    e.target.style.background = 'white'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0DDD5'
                    e.target.style.background = '#FAFAF8'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#9C9890', marginTop: '6px' }}>
                  Auto-verify teammates with this email domain
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#991B1B',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateOrg}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#6B685F' : '#1B3A5C',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating...</>
                ) : (
                  <>Continue <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          )}

          {/* Step 2: AWS */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#FDF3E7',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Cloud size={24} style={{ color: '#D4790A' }} />
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1A1917', 
                  marginBottom: '8px',
                  fontFamily: "'Fraunces', serif"
                }}>
                  Connect your AWS account
                </h2>
                <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
                  We need read-only access to scan your AWS environment. Takes about 5 minutes.
                </p>
              </div>

              <div style={{
                background: '#EEF3F9',
                border: '1px solid #C8C4BB',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '13px',
                color: '#1B3A5C',
                lineHeight: '1.7'
              }}>
                <p style={{ fontWeight: '600', marginBottom: '10px' }}>Quick setup:</p>
                <ol style={{ marginLeft: '18px', lineHeight: '1.8' }}>
                  <li>Open AWS IAM → Roles → Create role</li>
                  <li>Select "Another AWS account"</li>
                  <li>Account ID: <code style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontFamily: "'DM Mono', monospace" }}>{awsAccountId}</code></li>
                  <li>External ID: <code style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontFamily: "'DM Mono', monospace" }}>{externalId}</code></li>
                  <li>Attach policy: SecurityAudit</li>
                  <li>Copy the Role ARN</li>
                </ol>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#1A1917', 
                  marginBottom: '8px' 
                }}>
                  Role ARN
                </label>
                <input
                  type="text"
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/iFuLabsRole"
                  disabled={skipAws}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontFamily: "'DM Mono', monospace",
                    background: skipAws ? '#F4F3EF' : '#FAFAF8',
                    border: '1px solid #E0DDD5',
                    borderRadius: '8px',
                    color: skipAws ? '#9C9890' : '#1A1917',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => !skipAws && (e.target.style.borderColor = '#1B3A5C', e.target.style.background = 'white')}
                  onBlur={(e) => (e.target.style.borderColor = '#E0DDD5', e.target.style.background = '#FAFAF8')}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#991B1B',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectAws}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#6B685F' : '#1B3A5C',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#2E5F8A')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#1B3A5C')}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Connecting...</>
                ) : (
                  <>Connect AWS <ArrowRight size={18} /></>
                )}
              </button>

              <button
                onClick={() => { setSkipAws(true); setStep(3) }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  color: '#6B685F',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#1A1917'}
                onMouseOut={(e) => e.currentTarget.style.color = '#6B685F'}
              >
                Skip for now — I'll connect later
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#F3E8FF',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1A1917', 
                  marginBottom: '8px',
                  fontFamily: "'Fraunces', serif"
                }}>
                  Add payment method
                </h2>
                <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
                  Start your 3-day free trial. Your card will be charged after the trial ends.
                </p>
              </div>

              {urlProduct && urlPlan ? (
                // Show selected plan from website
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    padding: '20px',
                    background: '#EEF3F9',
                    border: '2px solid #1B3A5C',
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: '#1A1917' }}>
                        {selectedPlan === 'comply-starter' ? 'Comply Starter' : 
                         selectedPlan === 'comply-growth' ? 'Comply Growth' : 'FinOps'}
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: '700', color: '#1B3A5C' }}>
                        {selectedPlan === 'comply-starter' ? '$299' : 
                         selectedPlan === 'comply-growth' ? '$799' : '$199'}
                        <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B685F' }}>/mo</span>
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6B685F', margin: 0 }}>
                      {selectedPlan === 'comply-starter' ? 'Essential compliance monitoring' : 
                       selectedPlan === 'comply-growth' ? 'Advanced compliance features' : 'AWS cost optimization'}
                    </p>
                  </div>
                </div>
              ) : (
                // Show plan selection if no plan from URL
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#1A1917', 
                    marginBottom: '12px' 
                  }}>
                    Select your plan
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { id: 'comply-starter', name: 'Comply Starter', price: '$299', desc: 'Essential compliance monitoring' },
                      { id: 'comply-growth', name: 'Comply Growth', price: '$799', desc: 'Advanced compliance features' },
                      { id: 'finops', name: 'FinOps', price: '$199', desc: 'AWS cost optimization' }
                    ].map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{
                          padding: '16px',
                          background: selectedPlan === plan.id ? '#EEF3F9' : '#FAFAF8',
                          border: selectedPlan === plan.id ? '2px solid #1B3A5C' : '1px solid #E0DDD5',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1A1917' }}>{plan.name}</span>
                          <span style={{ fontSize: '18px', fontWeight: '700', color: '#1B3A5C' }}>{plan.price}<span style={{ fontSize: '14px', fontWeight: '400', color: '#6B685F' }}>/mo</span></span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#6B685F', margin: 0 }}>{plan.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                padding: '16px',
                background: '#F3E8FF',
                border: '1px solid #C4B5FD',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '13px',
                color: '#5B21B6',
                lineHeight: '1.6'
              }}>
                <strong>3-day free trial</strong> — Your card will be charged after the trial period ends. Cancel anytime.
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#991B1B',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={paymentProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: paymentProcessing ? '#6B685F' : '#1B3A5C',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !paymentProcessing && (e.currentTarget.style.background = '#2E5F8A')}
                onMouseOut={(e) => !paymentProcessing && (e.currentTarget.style.background = '#1B3A5C')}
              >
                {paymentProcessing ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing...</>
                ) : (
                  <>Continue to payment <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#EAF3EE',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <CheckCircle size={24} style={{ color: '#1D6648' }} />
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1A1917', 
                  marginBottom: '8px',
                  fontFamily: "'Fraunces', serif"
                }}>
                  You're all set!
                </h2>
                <p style={{ fontSize: '15px', color: '#6B685F', lineHeight: '1.6' }}>
                  {productName 
                    ? `Your ${productName} ${planName ? planName + ' ' : ''}account is ready.`
                    : 'Your account is ready.'
                  }
                </p>
              </div>

              {productName && (
                <div style={{
                  padding: '20px',
                  background: '#EEF3F9',
                  border: '1px solid #C8C4BB',
                  borderRadius: '12px',
                  marginBottom: '28px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '28px' }}>
                      {productName === 'Comply' ? '🛡️' : '💰'}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1A1917', fontFamily: "'Fraunces', serif" }}>
                        {productName}
                      </div>
                      {planName && (
                        <div style={{ fontSize: '13px', color: '#6B685F' }}>
                          {planName} Plan
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6B685F', lineHeight: '1.6', margin: 0 }}>
                    {productName === 'Comply' 
                      ? 'Automated compliance monitoring for SOC 2, ISO 27001, and GDPR'
                      : 'AWS cost optimization and waste detection'
                    }
                  </p>
                </div>
              )}

              <button
                onClick={handleFinish}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#1B3A5C',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#2E5F8A'}
                onMouseOut={(e) => e.currentTarget.style.background = '#1B3A5C'}
              >
                {productName ? `Open ${productName}` : 'Go to dashboard'} <ArrowRight size={20} />
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '13px', color: '#9C9890' }}>
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
