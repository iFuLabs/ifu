'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

export default function AboutPage() {
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
        <div className="section-eyebrow">About Ghara</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}>
          Compliance and cost,<br/>finally in <em>one place.</em>
        </h1>
        <p className="section-sub" style={{ maxWidth: 640, marginTop: 20 }}>
          Ghara is a cloud intelligence product built by iFU Labs — the AWS consultancy that's helped startups pass audits, cut waste, and ship faster since 2024.
        </p>
      </section>

      <section className="section reveal" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Why we built Ghara</h2>
            <p style={{ fontSize: 15, color: 'rgba(51,6,61,0.7)', lineHeight: 1.7 }}>
              Every startup we worked with had the same problem: compliance lived in one tool, cost lived in another, and the CTO had no single view of their cloud health. They'd pass a SOC 2 audit but miss $2,000/month in idle resources. Or they'd cut costs but break a compliance control in the process.
            </p>
            <p style={{ fontSize: 15, color: 'rgba(51,6,61,0.7)', lineHeight: 1.7, marginTop: 16 }}>
              Ghara solves this by putting compliance and cost in one dashboard with one score and one action queue. When a finding affects both engines — like GuardDuty being disabled (SOC 2 fail + security risk) — you see it once, fix it once.
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Built by iFU Labs</h2>
            <p style={{ fontSize: 15, color: 'rgba(51,6,61,0.7)', lineHeight: 1.7 }}>
              iFU Labs is an AWS consultancy that delivers cost optimisation, compliance, migration, and DevOps services to startups. We're AWS Partner Network members with deep expertise across the stack.
            </p>
            <p style={{ fontSize: 15, color: 'rgba(51,6,61,0.7)', lineHeight: 1.7, marginTop: 16 }}>
              Ghara is our consultancy experience packaged into a product. The same checks we run manually for clients — automated, continuous, and available to any team for a fraction of the cost.
            </p>
            <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 16, fontSize: 14, color: '#8A63E6', textDecoration: 'none' }}>
              Learn more about iFU Labs →
            </a>
          </div>
        </div>
      </section>

      <section className="section reveal">
        <h2 className="section-title">What makes Ghara <em>different.</em></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 40 }}>
          {[
            { title: 'One dashboard, not two', desc: 'Compliance and cost findings in a single ranked action queue. No more switching between tools.' },
            { title: 'Cloud Health Score', desc: 'A composite 0–100 score your CTO can track weekly. 40% compliance, 30% cost, 30% security.' },
            { title: 'No credit card trial', desc: '7 days of full Growth-tier access. Connect AWS, see your findings, decide if it\u2019s worth it.' },
            { title: 'Kubernetes cost', desc: 'Not just AWS. Connect OpenCost and see cost per namespace, per workload, across any K8s cluster.' },
            { title: 'AI remediation', desc: 'Claude-powered fix suggestions for every failing control. IaC snippets, plain-English explanations.' },
            { title: 'Built by practitioners', desc: 'Every check in Ghara comes from real audit experience. Not a checkbox product — a practitioner tool.' },
          ].map(d => (
            <div key={d.title} className="feature-card">
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="cta-band reveal">
        <h2>Ready to try Ghara?</h2>
        <p>7-day free trial. No credit card. Full Growth-tier access.</p>
        <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial →</a>
      </div>
    </>
  )
}
