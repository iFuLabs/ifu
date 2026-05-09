'use client'
import { useState } from 'react'

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [awsSpend, setAwsSpend] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production: POST to /api/v1/demo-requests
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="section" style={{ paddingTop: 120, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(138,99,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span style={{ fontSize: 24 }}>✓</span>
        </div>
        <h1 className="section-title">We'll be in touch.</h1>
        <p className="section-sub" style={{ margin: '12px auto 0' }}>
          A member of our team will reach out within 24 hours to schedule your demo.
        </p>
      </section>
    )
  }

  return (
    <section className="section" style={{ paddingTop: 80, maxWidth: 520 }}>
      <div className="section-eyebrow">Demo</div>
      <h1 className="section-title">Request a <em>demo.</em></h1>
      <p className="section-sub" style={{ marginBottom: 32 }}>
        For Scale-tier prospects and teams with complex requirements. We'll walk you through Ghara with your own data.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name"
          style={{ padding: '12px 16px', border: '1px solid rgba(51,6,61,0.12)', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Work email"
          style={{ padding: '12px 16px', border: '1px solid rgba(51,6,61,0.12)', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <input
          type="text" required value={company} onChange={e => setCompany(e.target.value)}
          placeholder="Company name"
          style={{ padding: '12px 16px', border: '1px solid rgba(51,6,61,0.12)', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <select
          value={awsSpend} onChange={e => setAwsSpend(e.target.value)}
          style={{ padding: '12px 16px', border: '1px solid rgba(51,6,61,0.12)', borderRadius: 8, fontSize: 14, outline: 'none', color: awsSpend ? '#33063D' : 'rgba(51,6,61,0.5)' }}
        >
          <option value="">Monthly AWS spend (approx)</option>
          <option value="<10k">Under $10k/mo</option>
          <option value="10k-50k">$10k – $50k/mo</option>
          <option value="50k-100k">$50k – $100k/mo</option>
          <option value="100k+">$100k+/mo</option>
        </select>
        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Request demo →
        </button>
      </form>
    </section>
  )
}
