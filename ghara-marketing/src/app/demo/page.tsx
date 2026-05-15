'use client'
import { useState } from 'react'

const Icons = {
  Check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckLg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Gauge: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>,
  Layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
}

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [awsSpend, setAwsSpend] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('https://api.ifulabs.com/api/v1/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, role, awsSpend }),
      })
    } catch {}
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="page-hero" style={{ textAlign: 'center', paddingTop: 120, paddingBottom: 120 }}>
        <div className="success-mark">{Icons.CheckLg}</div>
        <h1 style={{ margin: '0 auto' }}>We'll be in <em>touch.</em></h1>
        <p className="page-hero-sub" style={{ margin: '20px auto 0' }}>
          A member of our team will reach out within 24 hours to schedule your demo.
        </p>
      </section>
    )
  }

  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 16 }}>
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          Demo
        </div>
        <h1>Request a <em>demo.</em></h1>
        <p className="page-hero-sub">
          For Scale-tier prospects and teams with complex requirements. We'll walk you through Ghara with your own data.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 24, paddingBottom: 96 }}>
        <div className="demo-layout">
          {/* Left — what to expect + proof */}
          <div>
            <div className="section-eyebrow">What to expect</div>
            <ul className="demo-expect">
              <li>
                <span className="demo-expect-icon">{Icons.Gauge}</span>
                <div>
                  <strong>A live look at Ghara against your AWS account</strong>
                  <span>Connect via read-only CloudFormation — nothing in your account changes. See real findings, not a canned tour.</span>
                </div>
              </li>
              <li>
                <span className="demo-expect-icon">{Icons.Shield}</span>
                <div>
                  <strong>Cloud Health Score across compliance + cost</strong>
                  <span>SOC 2 / ISO 27001 / PCI evidence and AWS waste in one ranked action queue — the way your CTO would want to see it.</span>
                </div>
              </li>
              <li>
                <span className="demo-expect-icon">{Icons.Layers}</span>
                <div>
                  <strong>Scale-tier scoping</strong>
                  <span>Multi-account, SSO/SAML, custom frameworks, auditor role — we'll work through what you need and what you don't.</span>
                </div>
              </li>
            </ul>

            <div className="demo-proof">
              <div className="demo-proof-row">
                <div className="demo-proof-brand">
                  <img src="/brand/ghara-mark.svg" alt="Ghara" className="demo-proof-mark" />
                  <span className="demo-proof-name">Ghara</span>
                  <span className="demo-proof-built">Built by</span>
                  <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" className="demo-proof-partner" aria-label="iFU Labs">
                    <img src="/logos/plum.svg" alt="iFU Labs" />
                  </a>
                </div>
              </div>
              <div className="demo-proof-stats">
                <div><strong>77</strong> automated controls</div>
                <div><strong>5</strong> compliance frameworks</div>
                <div><strong>Read-only</strong> AWS access</div>
              </div>
            </div>
          </div>

          {/* Right — form card */}
          <div className="form-card tinted">
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-name">Your name</label>
                <input
                  id="demo-name" className="form-input"
                  type="text" required value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-email">Work email</label>
                <input
                  id="demo-email" className="form-input"
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-company">Company name</label>
                <input
                  id="demo-company" className="form-input"
                  type="text" required value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-role">Your role</label>
                <select
                  id="demo-role" className="form-select"
                  value={role} onChange={e => setRole(e.target.value)}
                  style={{ color: role ? 'var(--ink)' : 'var(--subtle)' }}
                >
                  <option value="">Select role</option>
                  <option value="engineering">Engineering / DevOps</option>
                  <option value="security">Security / Compliance</option>
                  <option value="finance">Finance / FinOps</option>
                  <option value="leadership">Founder / CTO / Leadership</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-spend">Monthly AWS spend (approx)</label>
                <select
                  id="demo-spend" className="form-select"
                  value={awsSpend} onChange={e => setAwsSpend(e.target.value)}
                  style={{ color: awsSpend ? 'var(--ink)' : 'var(--subtle)' }}
                >
                  <option value="">Select range</option>
                  <option value="<10k">Under $10k/mo</option>
                  <option value="10k-50k">$10k – $50k/mo</option>
                  <option value="50k-100k">$50k – $100k/mo</option>
                  <option value="100k+">$100k+/mo</option>
                </select>
              </div>
              <button type="submit" className="btn-primary form-submit">
                Request demo →
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
