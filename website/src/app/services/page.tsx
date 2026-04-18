'use client'
import '../globals.css'
import { useEffect } from 'react'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const SERVICES = [
  {
    slug: 'cost-optimisation',
    num: '01',
    label: 'FinOps',
    name: 'Cost Optimisation',
    desc: 'We audit your AWS spend, identify waste, and implement Savings Plans. Average client saves 25–40% within 30 days.',
    items: [
      'Full spend audit & waste report',
      'Rightsizing recommendations',
      'RI & Savings Plan strategy',
      'Cost anomaly monitoring setup',
    ],
  },
  {
    slug: 'compliance-security',
    num: '02',
    label: 'Compliance',
    name: 'Compliance & Security',
    desc: 'SOC 2, ISO 27001, GDPR, and HIPAA readiness — evidence collection, gap remediation, and audit preparation end-to-end.',
    items: [
      'Gap assessment & risk report',
      'Control remediation delivery',
      'Evidence pack preparation',
      'Auditor liaison support',
    ],
  },
  {
    slug: 'cloud-migration',
    num: '03',
    label: 'Migration',
    name: 'Cloud Migration',
    desc: 'On-premise to AWS, workload re-platforming, or cross-cloud migrations. Zero surprise downtime.',
    items: [
      'Discovery & dependency mapping',
      'Migration wave planning',
      'Lift-and-shift or re-architect',
      'AWS MAP program support',
    ],
  },
  {
    slug: 'eks-ecs',
    num: '04',
    label: 'Containers',
    name: 'EKS & ECS Engineering',
    desc: 'We design, build, and secure Kubernetes clusters on AWS — from architecture to production-grade operations.',
    items: [
      'Cluster design & provisioning',
      'Helm chart & manifest reviews',
      'RBAC & network policy hardening',
      'Observability stack setup',
    ],
  },
  {
    slug: 'devops-cicd',
    num: '05',
    label: 'DevOps',
    name: 'DevOps & CI/CD',
    desc: 'Infrastructure as code, deployment pipelines, and platform engineering. Fast, reliable, and auditable delivery.',
    items: [
      'Terraform & CDK implementation',
      'GitHub Actions / CodePipeline',
      'Blue/green & canary deployments',
      'Developer platform setup',
    ],
  },
  {
    slug: 'managed-services',
    num: '06',
    label: 'Managed Services',
    name: 'Ongoing AWS Support',
    desc: 'Retainer-based support. We act as your embedded cloud team — monitoring, incident response, and quarterly reviews.',
    items: [
      'Dedicated solutions engineer',
      '24/7 incident response SLA',
      'Monthly cost & security reviews',
      'Quarterly roadmap planning',
    ],
  },
]

export default function ServicesPage() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))

    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1))
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Info Bar */}
      <div className="info-bar">
        <div className="info-bar-inner">
          <div className="info-bar-left">
            <a href="mailto:info@ifulabs.com" className="info-bar-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1 4L6 7L11 4" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              info@ifulabs.com
            </a>
            <div className="info-bar-sep" />
            <a href="https://aws.amazon.com/partners/" target="_blank" rel="noopener" className="info-bar-item">
              AWS Partner Network Member
            </a>
          </div>
          <div className="info-bar-right">
            <a href={PORTAL_URL} className="info-bar-item">Client portal →</a>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav>
        <a href="/" className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="logo-name">iFu Labs</span>
        </a>

        <ul className="nav-links">
          <li><a href="/services">Services</a></li>
          <li><a href="/#methodology">Methodology</a></li>
          <li><a href="/#products">Products</a></li>
          <li><a href="/for-startups">For Startups</a></li>
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
        </ul>

        <div className="nav-actions">
          <a href="/schedule-consultation" className="btn-outline">Talk to us</a>
          <a href={PORTAL_URL} className="btn-solid">Client portal →</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="services-hero">
        <div className="services-hero-inner">
          <div className="section-eyebrow">Consultancy Services</div>
          <h1 className="services-hero-title">
            Expert-led services across<br/>
            your entire <em>AWS stack.</em>
          </h1>
          <p className="services-hero-sub">
            iFu Labs engineers embed with your team, deliver measurable outcomes, and leave you self-sufficient.
          </p>
          <div className="services-hero-nav">
            {SERVICES.map(s => (
              <a key={s.slug} href={`#${s.slug}`} className="services-hero-chip">
                <span className="services-hero-chip-num">{s.num}</span>
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Service sections */}
      {SERVICES.map((s, idx) => (
        <section
          key={s.slug}
          id={s.slug}
          className="service-detail reveal"
          style={{ background: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface)' }}
        >
          <div className="service-detail-inner">
            <div className="service-detail-left">
              <div className="service-detail-num">{s.num}</div>
              <div className="service-detail-label">{s.label}</div>
              <h2 className="service-detail-title">{s.name}</h2>
              <p className="service-detail-desc">{s.desc}</p>
              <div className="service-detail-actions">
                <a href="/schedule-consultation" className="btn-cta primary">
                  Book a free discovery call
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </a>
                <a href="/#pricing" className="btn-cta ghost">See pricing</a>
              </div>
            </div>
            <div className="service-detail-right">
              <div className="service-detail-deliverables">
                <div className="service-detail-deliverables-head">What we deliver</div>
                <ul>
                  {s.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA Band */}
      <section className="section reveal" style={{ paddingBottom: '120px' }}>
        <div className="services-cta">
          <h2 className="section-title">Let&apos;s talk about your<br/>AWS infrastructure.</h2>
          <p className="section-sub">Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.</p>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: '32px' }}>
            <a href="/schedule-consultation" className="btn-cta primary">
              Book a free discovery call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
            <a href="mailto:info@ifulabs.com" className="btn-cta ghost">Email us directly</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-new">
        <div className="footer-main-inner">
          <div className="footer-brand">
            <a href="/" className="footer-logo">
              <div className="footer-logo-mark">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
                  <circle cx="9" cy="9" r="2.5" fill="white"/>
                </svg>
              </div>
              iFu Labs
            </a>
            <p className="footer-tagline">AWS cloud consultancy and SaaS products for engineering teams that mean business.</p>
          </div>
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                {SERVICES.map(s => <li key={s.slug}><a href={`/services#${s.slug}`}>{s.name}</a></li>)}
              </ul>
            </div>
            <div className="footer-col">
              <h4>Products</h4>
              <ul>
                <li><a href={`${PORTAL_URL}/onboarding?product=comply&plan=starter`}>iFu Comply</a></li>
                <li><a href={`${PORTAL_URL}/onboarding?product=finops&plan=starter`}>iFu Costless</a></li>
                <li><a href={`${PORTAL_URL}/login`}>Client portal</a></li>
                <li><a href={`${API_URL}/docs`}>API Documentation</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/for-startups">For Startups</a></li>
                <li><a href="https://aws.amazon.com/partners/" target="_blank" rel="noopener">AWS Partnership</a></li>
                <li><a href="/schedule-consultation">Schedule consultation</a></li>
                <li><a href="mailto:info@ifulabs.com">info@ifulabs.com</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-legal">
          <h4>Legal</h4>
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/acceptable-use">Acceptable Use</a></li>
          </ul>
        </div>
      </footer>
      <div className="footer-bottom">
        <p>© 2026 iFu Labs Ltd.</p>
        <p>AWS Partner Network member · Read-only infrastructure access · No lock-in</p>
      </div>
    </>
  )
}
