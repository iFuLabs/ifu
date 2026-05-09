'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function HomePage() {
  useReveal()

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div>
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            Cloud compliance + cost · by iFU Labs
          </div>
          <h1>
            Know your AWS is<br/>in <em>good shape.</em>
          </h1>
          <p className="hero-sub">
            Ghara watches your cloud for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by the team at iFU Labs.
          </p>
          <div className="hero-actions">
            <a href={`${APP_URL}/signup`} className="btn-primary">
              Start 7-day free trial →
            </a>
            <Link href="/demo" className="btn-secondary">
              Request a demo
            </Link>
          </div>
          <div className="hero-trust">
            {[
              'No credit card required',
              'Full Growth tier access',
              'Connect in under 5 minutes',
            ].map(item => (
              <div key={item} className="trust-item">
                <svg viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="hero-cards">
          {[
            { title: 'Cloud Health Score', desc: 'One number for your CTO — compliance + cost + security', badge: 'Dashboard' },
            { title: 'SOC 2 in 6 weeks', desc: 'Automated evidence, AI remediation, drift alerts', badge: 'Compliance' },
            { title: '$1,247/mo savings', desc: 'Idle resources, rightsizing, anomaly detection', badge: 'Cost' },
            { title: 'Kubernetes cost', desc: 'Cost per namespace via OpenCost — Growth tier', badge: 'New' },
          ].map(card => (
            <div key={card.title} className="hero-card">
              <div>
                <div className="hero-card-title">{card.title}</div>
                <div className="hero-card-desc">{card.desc}</div>
              </div>
              <span className="hero-card-badge">{card.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section reveal">
        <div className="section-eyebrow">What Ghara does</div>
        <h2 className="section-title">Compliance and cost in<br/>one <em>dashboard.</em></h2>
        <p className="section-sub">Stop switching between tools. Ghara merges your compliance posture and cloud spend into a single ranked action queue.</p>

        <div className="features-grid">
          {[
            { icon: '⬡', title: 'Pass audits faster', desc: 'Automated evidence collection for SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS. AI-powered remediation guidance for every failing control.' },
            { icon: '◈', title: 'Cut cloud waste', desc: '8 waste types detected automatically. Rightsizing recommendations. Anomaly alerts. Kubernetes cost via OpenCost. Dollar values on everything.' },
            { icon: '◻', title: 'One score for leadership', desc: 'Cloud Health Score: 40% compliance, 30% cost efficiency, 30% security. Weekly trend. One number your CTO can track.' },
            { icon: '⟳', title: 'Drift alerts', desc: 'Get notified via Slack or email the moment a control flips from pass to fail. Never be surprised in an audit again.' },
            { icon: '⎈', title: 'Kubernetes cost', desc: 'Connect OpenCost and see cost per namespace, per workload. Detect idle pods, oversized requests, and unused PVCs.' },
            { icon: '⬒', title: 'Unified action queue', desc: 'One ranked list of findings from both engines — sorted by impact. Compliance gaps and cost waste, side by side.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="section reveal" id="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Simple, transparent<br/><em>pricing.</em></h2>
        <p className="section-sub">Three tiers based on your AWS spend. Start with a 7-day free trial on the Growth plan.</p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-tier">Starter</div>
            <div className="pricing-name">For small teams</div>
            <div className="pricing-price">$499</div>
            <div className="pricing-period">per month · up to $10k/mo AWS spend</div>
            <p className="pricing-desc">SOC 2 compliance and basic cost waste detection for teams just getting started.</p>
            <ul className="pricing-features">
              <li>SOC 2 framework</li>
              <li>Basic cost waste detection</li>
              <li>Weekly scans</li>
              <li>1 AWS account</li>
              <li>Email support</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start free trial</a>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-tier">Growth · most popular</div>
            <div className="pricing-name">Full platform</div>
            <div className="pricing-price">$1,299</div>
            <div className="pricing-period">per month · up to $100k/mo AWS spend</div>
            <p className="pricing-desc">All frameworks, AI remediation, Kubernetes cost, Slack alerts, and daily scans.</p>
            <ul className="pricing-features">
              <li>All frameworks (SOC 2, ISO, GDPR, HIPAA, PCI)</li>
              <li>AI evidence & remediation</li>
              <li>Vendor risk management</li>
              <li>Anomaly detection & Slack alerts</li>
              <li>Kubernetes cost (OpenCost)</li>
              <li>Daily scans · CSV/JSON export</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start free trial</a>
          </div>

          <div className="pricing-card">
            <div className="pricing-tier">Scale</div>
            <div className="pricing-name">Enterprise</div>
            <div className="pricing-price">Custom</div>
            <div className="pricing-period">unlimited AWS spend</div>
            <p className="pricing-desc">Custom frameworks, multi-account, SSO, auditor roles, and a dedicated CSM.</p>
            <ul className="pricing-features">
              <li>Everything in Growth</li>
              <li>Custom frameworks</li>
              <li>Multi-account AWS</li>
              <li>SSO / SAML</li>
              <li>Auditor read-only role</li>
              <li>Dedicated CSM · priority support</li>
            </ul>
            <Link href="/demo" className="pricing-cta">Talk to us</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-band reveal">
        <h2>Ready to see what's in your AWS?</h2>
        <p>Connect in under 5 minutes. No credit card. Full access for 7 days.</p>
        <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial →</a>
      </div>
    </>
  )
}
