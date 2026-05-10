'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

export default function PricingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) } })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section className="section" style={{ paddingTop: 80 }}>
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">One product. Three <em>tiers.</em></h2>
        <p className="section-sub">Start with a 7-day free trial on the Growth plan — full access. Card required, first charge on day 8.</p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-tier">Starter</div>
            <div className="pricing-name">For small teams</div>
            <div className="pricing-price">$499</div>
            <div className="pricing-period">per month · up to $10k/mo AWS spend</div>
            <p className="pricing-desc">SOC 2 compliance and basic cost waste detection.</p>
            <ul className="pricing-features">
              <li>SOC 2 framework</li>
              <li>Basic cost waste detection</li>
              <li>Weekly scans</li>
              <li>1 AWS account</li>
              <li>3 team members</li>
              <li>Email support</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start free trial</a>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-tier">Growth · most popular</div>
            <div className="pricing-name">Full platform</div>
            <div className="pricing-price">$1,299</div>
            <div className="pricing-period">per month · up to $100k/mo AWS spend</div>
            <p className="pricing-desc">All frameworks, AI, K8s cost, Slack, daily scans.</p>
            <ul className="pricing-features">
              <li>All frameworks (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS)</li>
              <li>AI evidence & remediation</li>
              <li>Vendor risk management</li>
              <li>Anomaly detection</li>
              <li>Kubernetes cost (OpenCost)</li>
              <li>Slack integration & drift alerts</li>
              <li>Custom date ranges</li>
              <li>Daily scans</li>
              <li>CSV/JSON export</li>
              <li>Unlimited team members</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start free trial</a>
          </div>

          <div className="pricing-card">
            <div className="pricing-tier">Scale</div>
            <div className="pricing-name">Enterprise</div>
            <div className="pricing-price">Custom</div>
            <div className="pricing-period">unlimited AWS spend</div>
            <p className="pricing-desc">Custom frameworks, multi-account, SSO, dedicated CSM.</p>
            <ul className="pricing-features">
              <li>Everything in Growth</li>
              <li>Custom frameworks</li>
              <li>Multi-account AWS</li>
              <li>SSO / SAML</li>
              <li>Auditor read-only role</li>
              <li>Dedicated CSM</li>
              <li>Priority support</li>
              <li>FOCUS export</li>
            </ul>
            <Link href="/demo" className="pricing-cta">Talk to us</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section reveal">
        <h2 className="section-title">Frequently <em>asked.</em></h2>
        <div style={{ marginTop: 32, maxWidth: 640 }}>
          {[
            { q: 'How does the 7-day trial work?', a: "Sign up with your email and a credit card. We don\u2019t charge during the 7-day trial. On day 8, your card is charged your selected plan price. Cancel any time during the trial with one click \u2014 no charge." },
            { q: 'What counts as AWS spend?', a: 'Your monthly AWS bill as reported by Cost Explorer. We use this to determine your tier. If you\'re between tiers, you\'re on the lower one until you cross the threshold.' },
            { q: 'Do you support Kubernetes?', a: 'Yes — Growth tier includes Kubernetes cost visibility via OpenCost. Works on EKS, GKE, AKS, or self-managed clusters.' },
            { q: 'What about existing Comply or FinOps customers?', a: 'You\'re grandfathered at your current price. Your features and billing stay the same. You\'ll see the new unified dashboard automatically.' },
            { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade anytime from the billing page. Changes take effect immediately.' },
            { q: 'Is there a contract?', a: 'No. Month-to-month billing. Cancel anytime from the billing page.' },
          ].map(faq => (
            <div key={faq.q} style={{ borderBottom: '1px solid rgba(51,6,61,0.08)', paddingBottom: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#33063D', marginBottom: 6 }}>{faq.q}</h3>
              <p style={{ fontSize: 14, color: 'rgba(51,6,61,0.65)', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
