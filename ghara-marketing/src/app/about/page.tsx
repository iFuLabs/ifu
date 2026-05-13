'use client'
import { useEffect } from 'react'

const APP_URL = 'https://app.ghara.ifulabs.com'

const Icons = {
  Dashboard: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  Gauge: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>,
  Clock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Cube: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Sparkle: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8L19.5 10l-5.6 1.2L12 17l-1.9-5.8L4.5 10l5.6-1.2L12 3z"/></svg>,
  Tool: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
}

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
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          About Ghara
        </div>
        <h1>
          Compliance and cost,<br/>finally in <em>one place.</em>
        </h1>
        <p className="page-hero-sub">
          Ghara is a cloud intelligence product built by iFU Labs — the AWS consultancy that's helped startups pass audits, cut waste, and ship faster since 2024.
        </p>
      </section>

      {/* ── Stats row ───────────────────────────────────────────────── */}
      <section className="section reveal" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-num">5</div>
            <div className="stat-card-label">Compliance frameworks — SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num">8</div>
            <div className="stat-card-label">AWS waste types detected — plus rightsizing &amp; anomaly detection</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num">0–100</div>
            <div className="stat-card-label">Cloud Health Score — one number across compliance, cost, security</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num">7 days</div>
            <div className="stat-card-label">Free Growth-tier trial — full feature access, cancel anytime</div>
          </div>
        </div>
      </section>

      {/* ── Story ───────────────────────────────────────────────────── */}
      <section className="section reveal" style={{ paddingTop: 24 }}>
        <div className="story-grid">
          <div className="story-panel">
            <h2>Why we built Ghara</h2>
            <p>
              Every startup we worked with had the same problem: compliance lived in one tool, cost lived in another, and the CTO had no single view of their cloud health. They'd pass a SOC 2 audit but miss $2,000/month in idle resources. Or they'd cut costs but break a compliance control in the process.
            </p>
            <p>
              Ghara solves this by putting compliance and cost in one dashboard with one score and one action queue. When a finding affects both engines — like GuardDuty being disabled (SOC 2 fail + security risk) — you see it once, fix it once.
            </p>
          </div>
          <div className="story-panel tinted">
            <h2>Built by iFU Labs</h2>
            <p>
              iFU Labs is an AWS consultancy that delivers cost optimisation, compliance, migration, and DevOps services to startups. We're AWS Partner Network members with deep expertise across the stack.
            </p>
            <p>
              Ghara is our consultancy experience packaged into a product. The same checks we run manually for clients — automated, continuous, and available to any team for a fraction of the cost.
            </p>
            <a className="story-link" href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
              Learn more about iFU Labs →
            </a>
          </div>
        </div>
      </section>

      {/* ── Differentiators ─────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">What's different</div>
        <h2 className="section-title">What makes Ghara <em>different.</em></h2>
        <div className="features-grid">
          {[
            { icon: Icons.Dashboard, title: 'One dashboard, not two', desc: 'Compliance and cost findings in a single ranked action queue. No more switching between tools.' },
            { icon: Icons.Gauge,     title: 'Cloud Health Score',    desc: 'A composite 0–100 score your CTO can track weekly. 40% compliance, 30% cost, 30% security.' },
            { icon: Icons.Clock,     title: '7-day free trial',      desc: 'Full Growth-tier access for 7 days. Card on file, charged on day 8. Cancel anytime — no charge.' },
            { icon: Icons.Cube,      title: 'Kubernetes cost',       desc: 'Not just AWS. Connect OpenCost and see cost per namespace, per workload, across any K8s cluster.' },
            { icon: Icons.Sparkle,   title: 'AI remediation',        desc: 'Claude-powered fix suggestions for every failing control. IaC snippets, plain-English explanations.' },
            { icon: Icons.Tool,      title: 'Built by practitioners',desc: 'Every check in Ghara comes from real audit experience. Not a checkbox product — a practitioner tool.' },
          ].map(d => (
            <div key={d.title} className="feature-card">
              <div className="feature-icon">{d.icon}</div>
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Band ────────────────────────────────────────────────── */}
      <div className="cta-band reveal">
        <h2>Ready to try Ghara?</h2>
        <p>7-day free trial. Full Growth-tier access. Cancel anytime — no charge.</p>
        <div className="cta-band-actions">
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial →</a>
        </div>
      </div>
    </>
  )
}
