'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 'org', label: 'Organization' },
  { id: 'aws', label: 'Connect AWS' },
  { id: 'products', label: 'Choose Products' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 0
  const [orgName, setOrgName] = useState('')
  const [orgDomain, setOrgDomain] = useState('')

  // Step 1
  const [roleArn, setRoleArn] = useState('')
  const [externalId] = useState(() => `ifu-${Math.random().toString(36).slice(2, 10)}`)
  const [skipAws, setSkipAws] = useState(false)

  // Step 2
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }
    setLoading(true)
    setError('')
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setStep(1)
    }, 1000)
  }

  const handleConnectAws = async () => {
    if (!skipAws && !roleArn.trim()) {
      setError('Role ARN is required')
      return
    }
    setLoading(true)
    setError('')
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setStep(2)
    }, 1000)
  }

  const handleFinish = () => {
    // Redirect to first selected product or back to portal
    if (selectedProducts.includes('comply')) {
      window.location.href = 'http://localhost:3001/dashboard'
    } else if (selectedProducts.includes('finops')) {
      window.location.href = 'http://localhost:3002/dashboard'
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B3A5C 0%, #2E5F8A 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'white',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="#1B3A5C" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="#1B3A5C"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
            Welcome to iFu Labs
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step].label}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '32px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'white',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>

          {/* Step 0: Organization */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                  Create your organization
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  This creates your team workspace for iFu Labs products.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Organization name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1B3A5C'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Company domain (optional)
                </label>
                <input
                  type="text"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  placeholder="acme.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1B3A5C'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                />
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Used to auto-verify teammates with this email domain
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#991B1B',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateOrg}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#1B3A5C',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Creating...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 1: AWS Connection */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                  Connect your AWS account
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  We need read-only access to scan your AWS environment for compliance and cost optimization.
                </p>
              </div>

              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1E40AF'
              }}>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Quick setup:</p>
                <ol style={{ marginLeft: '20px', lineHeight: '1.6' }}>
                  <li>Open AWS IAM → Roles → Create role</li>
                  <li>Select "Another AWS account"</li>
                  <li>Account ID: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>123456789012</code></li>
                  <li>External ID: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{externalId}</code></li>
                  <li>Attach policy: SecurityAudit</li>
                  <li>Copy the Role ARN</li>
                </ol>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
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
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none',
                    opacity: skipAws ? 0.5 : 1
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1B3A5C'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#991B1B',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectAws}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#1B3A5C',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginBottom: '12px'
                }}
              >
                {loading ? 'Connecting...' : 'Connect AWS'}
              </button>

              <button
                onClick={() => { setSkipAws(true); setStep(2) }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  color: '#6B7280',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Skip for now — I'll connect later
              </button>
            </div>
          )}

          {/* Step 2: Choose Products */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                  Choose your products
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  Select which iFu Labs products you want to use. You can add more later.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {/* Comply */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: selectedProducts.includes('comply') ? '2px solid #1B3A5C' : '2px solid #E5E7EB',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes('comply')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts([...selectedProducts, 'comply'])
                      } else {
                        setSelectedProducts(selectedProducts.filter(p => p !== 'comply'))
                      }
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      🛡️ Comply
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                      SOC 2, ISO 27001, and GDPR compliance automation with automated evidence collection
                    </div>
                    <div style={{ fontSize: '12px', color: '#1B3A5C', fontWeight: '500', marginTop: '6px' }}>
                      From $299/month
                    </div>
                  </div>
                </label>

                {/* FinOps */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: selectedProducts.includes('finops') ? '2px solid #1B3A5C' : '2px solid #E5E7EB',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes('finops')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts([...selectedProducts, 'finops'])
                      } else {
                        setSelectedProducts(selectedProducts.filter(p => p !== 'finops'))
                      }
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                      💰 FinOps
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                      AWS cost optimization and waste detection with savings recommendations
                    </div>
                    <div style={{ fontSize: '12px', color: '#1B3A5C', fontWeight: '500', marginTop: '6px' }}>
                      $199/month
                    </div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleFinish}
                disabled={selectedProducts.length === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedProducts.length > 0 ? '#1B3A5C' : '#D1D5DB',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedProducts.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {selectedProducts.length > 0 ? 'Get started →' : 'Select at least one product'}
              </button>

              <button
                onClick={() => router.push('/')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  color: '#6B7280',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                I'll choose later
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
