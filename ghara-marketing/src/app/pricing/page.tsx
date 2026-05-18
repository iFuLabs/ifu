'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

const Icons = {
  CheckSm: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
}

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
              <li>{Icons.CheckSm} SOC 2 framework</li>
              <li>{Icons.CheckSm} Basic cost waste detection</li>
              <li>{Icons.CheckSm} Weekly scans</li>
              <li>{Icons.CheckSm} 1 AWS account</li>
              <li>{Icons.CheckSm} 3 team members</li>
              <li>{Icons.CheckSm} Email support</li>
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
              <li>{Icons.CheckSm} All 5 frameworks (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS)</li>
              <li>{Icons.CheckSm} AI evidence & remediation</li>
              <li>{Icons.CheckSm} Trust Center (public compliance page)</li>
              <li>{Icons.CheckSm} Vendor risk management</li>
              <li>{Icons.CheckSm} Anomaly detection</li>
              <li>{Icons.CheckSm} Kubernetes cost (OpenCost)</li>
              <li>{Icons.CheckSm} Slack integration & drift alerts</li>
              <li>{Icons.CheckSm} Custom date ranges</li>
              <li>{Icons.CheckSm} Daily scans</li>
              <li>{Icons.CheckSm} CSV/JSON export</li>
              <li>{Icons.CheckSm} Unlimited team members</li>
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
              <li>{Icons.CheckSm} Everything in Growth</li>
              <li>{Icons.CheckSm} Custom frameworks</li>
              <li>{Icons.CheckSm} Multi-account AWS</li>
              <li>{Icons.CheckSm} SSO / SAML</li>
              <li>{Icons.CheckSm} Auditor read-only role</li>
              <li>{Icons.CheckSm} Dedicated CSM</li>
              <li>{Icons.CheckSm} Priority support</li>
              <li>{Icons.CheckSm} FOCUS export</li>
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
