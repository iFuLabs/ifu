'use client'
import './globals.css'
import { useEffect } from 'react'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Scroll reveal + pricing tab logic (extracted from original HTML)
function usePageScripts() {
  useEffect(() => {
    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))

    // Pricing tab switcher — attach to window so inline onclick works
    ;(window as any).switchPricing = (tab: string, btn: HTMLElement) => {
      document.querySelectorAll('[id^="pricing-"]').forEach((el: any) => el.style.display = 'none')
      document.querySelectorAll('.pricing-tab').forEach((b: any) => b.classList.remove('active'))
      const target = document.getElementById('pricing-' + tab)
      if (target) target.style.display = 'grid'
      btn.classList.add('active')
    }

    return () => observer.disconnect()
  }, [])
}

export default function HomePage() {
  usePageScripts()

  return (
    <>
      {/* Nav */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">iFu Labs</span>
          </div>
        </a>

        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#products">Products</a></li>
          <li><a href="/for-startups">For Startups</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
        </ul>

        <div className="nav-actions">
          <a href="#contact" className="btn-outline">Talk to us</a>
          <a href={PORTAL_URL} className="btn-solid">Client portal →</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot"></div>
            AWS Partner Network · iFu Labs Cloud Consultancy
          </div>
          <h1>
            Expert AWS cloud<br/>
            services for teams<br/>
            that <em>mean business.</em>
          </h1>
          <p className="hero-sub">
            iFu Labs delivers consultant-led cloud services — cost optimisation, compliance, migration,
            containers, and DevOps — backed by deep AWS expertise and real engineering.
          </p>
          <div className="hero-actions">
            <a href="/schedule-consultation" className="btn-cta primary">
              Book a free discovery call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
            <a href="#services" className="btn-cta ghost">See our services</a>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              AWS Partner Network member
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Read-only access, always
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              No lock-in contracts
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card-stack">
            {[
              { icon: '💰', title: 'Cost Optimisation', desc: 'Found $1,200/month in idle resources — week one', badge: 'Service', badgeStyle: { background: 'var(--green-light)', color: 'var(--green)' } },
              { icon: '🛡️', title: 'SOC 2 Compliance', desc: 'Audit-ready in 6 weeks, not 6 months', badge: '+ SaaS tool', badgeStyle: { background: 'var(--brand-light)', color: 'var(--brand)' } },
              { icon: '⎈',  title: 'EKS Migration', desc: '14 services on Kubernetes, zero downtime', badge: 'Service', badgeStyle: { background: 'var(--green-light)', color: 'var(--green)' } },
              { icon: '🚀', title: 'CI/CD Pipelines', desc: 'Deploy time: 40 mins → 6 mins', badge: 'Service', badgeStyle: { background: 'var(--green-light)', color: 'var(--green)' } },
            ].map(card => (
              <div key={card.title} className="hero-card">
                <div className="hero-card-icon" style={{ background: 'var(--surface)' }}>{card.icon}</div>
                <div className="hero-card-body">
                  <div className="hero-card-title">{card.title}</div>
                  <div className="hero-card-desc">{card.desc}</div>
                </div>
                <span className="hero-card-badge" style={card.badgeStyle}>{card.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APN trust strip */}
      <div className="apn-strip">
        {[
          { icon: '🔶', text: 'AWS Partner Network Member' },
          { icon: '🔒', text: 'Read-only infrastructure access' },
          { icon: '✅', text: 'SOC 2 compliant practice' },
          { icon: '💳', text: 'Help clients unlock $100K AWS credits' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 && <div className="apn-sep" />}
            <div className="apn-item">
              <span className="apn-item-icon">{item.icon}</span> {item.text}
            </div>
          </div>
        ))}
      </div>

      {/* Services */}
      <section className="section reveal" id="services">
        <div className="section-eyebrow">Consultancy Services</div>
        <h2 className="section-title">Expert-led services across<br/>your entire <em>AWS stack.</em></h2>
        <p className="section-sub">iFu Labs engineers embed with your team, deliver measurable outcomes, and leave you self-sufficient.</p>

        <div className="services-grid reveal-grid">
          {[
            { color: '#1B3A5C', icon: '💰', label: 'FinOps',      name: 'Cost Optimisation',      desc: 'We audit your AWS spend, identify waste, and implement Savings Plans. Average client saves 25–40% within 30 days.', items: ['Full spend audit & waste report', 'Rightsizing recommendations', 'RI & Savings Plan strategy', 'Cost anomaly monitoring setup'] },
            { color: '#D4790A', icon: '🛡️', label: 'Compliance',  name: 'Compliance & Security',  desc: 'SOC 2, ISO 27001, GDPR, and HIPAA readiness — evidence collection, gap remediation, and audit preparation end-to-end.', items: ['Gap assessment & risk report', 'Control remediation delivery', 'Evidence pack preparation', 'Auditor liaison support'] },
            { color: '#1D6648', icon: '☁️', label: 'Migration',   name: 'Cloud Migration',        desc: 'On-premise to AWS, workload re-platforming, or cross-cloud migrations. Zero surprise downtime.', items: ['Discovery & dependency mapping', 'Migration wave planning', 'Lift-and-shift or re-architect', 'AWS MAP program support'] },
            { color: '#7C3AED', icon: '⎈',  label: 'Containers',  name: 'EKS & ECS Engineering',  desc: 'We design, build, and secure Kubernetes clusters on AWS — from architecture to production-grade operations.', items: ['Cluster design & provisioning', 'Helm chart & manifest reviews', 'RBAC & network policy hardening', 'Observability stack setup'] },
            { color: '#DB2777', icon: '🔁', label: 'DevOps',      name: 'DevOps & CI/CD',         desc: 'Infrastructure as code, deployment pipelines, and platform engineering. Fast, reliable, and auditable delivery.', items: ['Terraform & CDK implementation', 'GitHub Actions / CodePipeline', 'Blue/green & canary deployments', 'Developer platform setup'] },
          ].map(s => (
            <div key={s.name} className="service-card" style={{ '--service-color': s.color } as any}>
              <div className="service-icon">{s.icon}</div>
              <div className="service-label">{s.label}</div>
              <div className="service-name">{s.name}</div>
              <p className="service-desc">{s.desc}</p>
              <ul className="service-deliverables">
                {s.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}

          {/* Managed services card */}
          <div className="service-card" style={{ '--service-color': '#0891B2', background: 'var(--brand)', borderColor: 'var(--brand)' } as any}>
            <div className="service-icon" style={{ background: 'rgba(255,255,255,0.1)' }}>📋</div>
            <div className="service-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Managed Services</div>
            <div className="service-name" style={{ color: '#fff' }}>Ongoing AWS Support</div>
            <p className="service-desc" style={{ color: 'rgba(255,255,255,0.75)' }}>Retainer-based support. We act as your embedded cloud team — monitoring, incident response, and quarterly reviews.</p>
            <ul className="service-deliverables">
              {['Dedicated solutions engineer', '24/7 incident response SLA', 'Monthly cost & security reviews', 'Quarterly roadmap planning'].map(item => (
                <li key={item} style={{ color: 'rgba(255,255,255,0.65)' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Products */}
      <section className="products-section" id="products">
        <div className="products-inner reveal">
          <div className="section-eyebrow">SaaS Products</div>
          <h2 className="section-title">Prefer a product over<br/>a <em>consultant?</em></h2>
          <p className="section-sub">Our consultancy experience packaged into standalone tools. Subscribe independently or combine with a managed services retainer.</p>

          <div className="products-grid reveal-grid">
            <div className="product-card">
              <span className="product-tag" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>● iFu Comply</span>
              <div className="product-name">Compliance Automation</div>
              <p className="product-desc">Automated SOC 2, ISO 27001, and GDPR evidence collection, control monitoring, and audit-ready PDF exports.</p>
              <ul className="product-features">
                {['Daily automated AWS control checks', 'AI-powered gap explanations & fix steps', 'One-click evidence pack PDF', 'Vendor risk & cert expiry tracking', 'Regulatory change monitoring'].map(f => (
                  <li key={f} style={{ color: 'var(--muted)' }}>{f}</li>
                ))}
              </ul>
              <div className="product-price">From <strong>$299</strong> / month · or add to your retainer</div>
            </div>

            <div className="product-card">
              <span className="product-tag" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>● iFu Costless</span>
              <div className="product-name">Cost Optimisation Tool</div>
              <p className="product-desc">Connect your AWS account and get a live view of waste, savings opportunities, and spend anomalies — updated daily.</p>
              <ul className="product-features">
                {['Idle resource & waste detection', 'Reserved Instance & Savings Plan gaps', 'Weekly cost anomaly alerts', 'S3 storage class optimisation', 'Monthly executive spend report'].map(f => (
                  <li key={f} style={{ color: 'var(--muted)' }}>{f}</li>
                ))}
              </ul>
              <div className="product-price">From <strong>$199</strong> / month · or add to your retainer</div>
            </div>
          </div>
        </div>
      </section>

      {/* Free consultation band */}
      <section className="reveal" style={{ padding: '0 32px', margin: '80px auto', maxWidth: '1200px' }}>
        <div style={{
          background: 'var(--brand)',
          borderRadius: '20px',
          padding: 'clamp(40px, 6vw, 64px) clamp(28px, 5vw, 56px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px, 4vw, 48px)',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1, flex: '1 1 420px', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.02em',
              marginBottom: '20px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
              Free · 30 minutes · No sales pitch
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Book a free consultation<br />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontWeight: 400 }}>
                with an AWS engineer.
              </span>
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.6,
              maxWidth: '560px',
              marginBottom: '0',
            }}>
              Tell us what you&apos;re trying to build, migrate, or secure. We&apos;ll share an honest
              read on scope, risks, and whether we&apos;re the right fit — before you commit to anything.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', flex: '0 1 auto' }}>
            <a
              href="/schedule-consultation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 28px',
                background: '#fff',
                color: 'var(--brand)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Book a free consultation
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </a>
            <a
              href="mailto:info@ifulabs.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 28px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Or email us directly
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section reveal" id="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Services, products,<br/>or <em>both.</em></h2>
        <p className="section-sub">Choose the model that fits. Mix consultancy with product subscriptions.</p>

        <div className="pricing-tabs">
          <button className="pricing-tab active" onClick={(e) => (window as any).switchPricing('services', e.currentTarget)}>Consultancy</button>
          <button className="pricing-tab" onClick={(e) => (window as any).switchPricing('products', e.currentTarget)}>SaaS Products</button>
          <button className="pricing-tab" onClick={(e) => (window as any).switchPricing('managed', e.currentTarget)}>Managed Services</button>
        </div>

        <div className="pricing-grid" id="pricing-services">
          {[
            { tier: 'Starter Project', name: 'Fixed-scope engagement', price: 'POA', period: 'scoped per project', desc: 'Best for single-service projects — a cost audit, compliance gap assessment, or CI/CD pipeline build.', features: ['Single service area', 'Senior engineer lead', 'Full documentation & handover', '30-day follow-up support'], cta: 'Get a quote', href: '#contact' },
            { tier: 'Growth Engagement', name: 'Multi-service delivery', price: 'POA', period: 'scoped per programme', desc: 'Our most common engagement — 2–3 service areas over 6–12 weeks with a dedicated engineer.', features: ['Multi-service scope', 'Dedicated engineer embedded', 'Weekly progress calls', 'Full IaC & runbook delivery', '60-day follow-up support'], cta: 'Book discovery call', href: '#contact', featured: true },
            { tier: 'Enterprise Programme', name: 'Full transformation', price: 'Custom', period: 'multi-team, multi-quarter', desc: 'Large-scale cloud transformation — migration, platform engineering, and compliance as a full programme.', features: ['Multi-engineer team', 'Programme management included', 'AWS MAP funding support', 'Executive reporting & QBRs', 'Transition to managed services'], cta: 'Talk to us', href: 'mailto:info@ifulabs.com' },
          ].map(p => (
            <div key={p.tier} className={`pricing-card${p.featured ? ' featured' : ''}`}>
              <div className="pricing-tier">{p.tier}</div>
              <div className="pricing-name">{p.name}</div>
              <div className="pricing-price">{p.price}</div>
              <div className="pricing-period">{p.period}</div>
              <p className="pricing-desc">{p.desc}</p>
              <ul className="pricing-features-list">
                {p.features.map(f => <li key={f} className="pricing-feature">{f}</li>)}
              </ul>
              <a href={p.href} className="pricing-cta">{p.cta}</a>
            </div>
          ))}
        </div>

        <div className="pricing-grid" id="pricing-products" style={{ display: 'none' }}>
          {[
            { tier: 'iFu Comply · Starter', name: 'Compliance Tool', price: '$299', period: 'per month, billed annually', desc: 'SOC 2 automation for early-stage teams.', features: ['SOC 2 control monitoring', 'AWS & GitHub connectors', 'Evidence PDF export', 'Vendor risk tracker', 'Up to 3 team members'], cta: 'Start free trial', product: 'comply', plan: 'starter' },
            { tier: 'iFu Comply · Growth', name: 'Multi-framework', price: '$799', period: 'per month, billed annually', desc: 'SOC 2, ISO 27001, GDPR, and HIPAA — plus AI gap explanations.', features: ['Everything in Starter', 'ISO 27001, GDPR, HIPAA', 'AI gap explanations', 'Regulatory change alerts', 'Unlimited team members'], cta: 'Start free trial', featured: true, product: 'comply', plan: 'growth' },
            { tier: 'iFu Costless', name: 'Cost Optimisation', price: '$199', period: 'per month, billed annually', desc: 'Live AWS cost dashboard with waste detection and anomaly alerts.', features: ['Idle resource detection', 'RI & Savings Plan analysis', 'Weekly anomaly alerts', 'Monthly spend report', 'Unlimited AWS accounts'], cta: 'Start free trial', product: 'finops', plan: 'starter' },
          ].map(p => (
            <div key={p.tier} className={`pricing-card${p.featured ? ' featured' : ''}`}>
              <div className="pricing-tier">{p.tier}</div>
              <div className="pricing-name">{p.name}</div>
              <div className="pricing-price">{p.price}</div>
              <div className="pricing-period">{p.period}</div>
              <p className="pricing-desc">{p.desc}</p>
              <ul className="pricing-features-list">
                {p.features.map(f => <li key={f} className="pricing-feature">{f}</li>)}
              </ul>
              <button 
                onClick={() => window.location.href = `${PORTAL_URL}/onboarding?product=${p.product}&plan=${p.plan}`}
                className="pricing-cta"
                style={{ cursor: 'pointer', border: 'none', width: '100%' }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-grid" id="pricing-managed" style={{ display: 'none' }}>
          {[
            { tier: 'Managed · Essential', name: 'Core coverage', price: '$2,500', period: 'per month · cancel anytime', desc: 'Ongoing AWS management for small teams.', features: ['Dedicated cloud engineer (part-time)', 'Monthly cost & security review', 'Incident response (business hours)', 'iFu Comply SaaS tool included'], cta: 'Get started', href: '#contact' },
            { tier: 'Managed · Growth', name: 'Full coverage', price: '$5,000', period: 'per month · cancel anytime', desc: 'A senior engineer embedded with your team.', features: ['Senior engineer (up to 20hrs/month)', '24/7 incident response', 'Weekly check-in call', 'Quarterly roadmap review', 'All SaaS products included'], cta: 'Book discovery call', href: '#contact', featured: true },
            { tier: 'Managed · Enterprise', name: 'Embedded team', price: 'Custom', period: 'multi-engineer retainer', desc: 'Multiple engineers and programme management.', features: ['2–4 engineers depending on scope', 'Dedicated Slack channel & PM', 'Executive QBRs', 'Full SaaS platform included', 'AWS credits facilitation'], cta: 'Talk to us', href: 'mailto:info@ifulabs.com' },
          ].map(p => (
            <div key={p.tier} className={`pricing-card${p.featured ? ' featured' : ''}`}>
              <div className="pricing-tier">{p.tier}</div>
              <div className="pricing-name">{p.name}</div>
              <div className="pricing-price">{p.price}</div>
              <div className="pricing-period">{p.period}</div>
              <p className="pricing-desc">{p.desc}</p>
              <ul className="pricing-features-list">
                {p.features.map(f => <li key={f} className="pricing-feature">{f}</li>)}
              </ul>
              <a href={p.href} className="pricing-cta">{p.cta}</a>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* CTA / Contact */}
      <div className="reveal" id="contact">
        <div className="cta-section">
          <div>
            <h2>Let&apos;s talk about your AWS infrastructure.</h2>
            <p>Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.</p>
          </div>
          <div className="cta-form">
            <input className="cta-field" type="text" placeholder="Your name" id="contact-name" />
            <input className="cta-field" type="email" placeholder="Work email" id="contact-email" />
            <input className="cta-field" type="text" placeholder="Company name" id="contact-company" />
            <select className="cta-select" id="contact-need">
              <option value="">What do you need help with?</option>
              <option>Cost optimisation</option>
              <option>Compliance (SOC 2 / ISO 27001)</option>
              <option>Cloud migration</option>
              <option>EKS / ECS & Containers</option>
              <option>DevOps & CI/CD</option>
              <option>Managed services retainer</option>
              <option>SaaS product subscription</option>
              <option>Not sure yet</option>
            </select>
            <button 
              className="cta-submit"
              onClick={() => {
                const name = (document.getElementById('contact-name') as HTMLInputElement)?.value
                const email = (document.getElementById('contact-email') as HTMLInputElement)?.value
                const company = (document.getElementById('contact-company') as HTMLInputElement)?.value
                const need = (document.getElementById('contact-need') as HTMLSelectElement)?.value
                
                if (!name || !email || !company) {
                  alert('Please fill in all required fields')
                  return
                }
                
                // Create mailto link with pre-filled info
                const subject = encodeURIComponent(`Discovery Call Request - ${company}`)
                const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCompany: ${company}\nNeed help with: ${need || 'Not specified'}\n\nI'd like to book a discovery call to discuss our AWS infrastructure.`)
                window.location.href = `mailto:info@ifulabs.com?subject=${subject}&body=${body}`
              }}
            >
              Book discovery call →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-new">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="/" className="footer-logo">
              <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="#1B3A5C" strokeWidth="1.4" strokeLinejoin="round"/>
                <circle cx="9" cy="9" r="2.5" fill="#1B3A5C"/>
              </svg>
              iFu Labs
            </a>
            <p className="footer-tagline">AWS cloud consultancy and SaaS products for engineering teams that mean business.</p>
          </div>
          
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                <li><a href="#services">Cost Optimisation</a></li>
                <li><a href="#services">Compliance</a></li>
                <li><a href="#services">Cloud Migration</a></li>
                <li><a href="#services">EKS & Containers</a></li>
                <li><a href="#services">DevOps & CI/CD</a></li>
                <li><a href="#services">Managed Services</a></li>
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

      {/* Certifications & Badges */}
      <div className="certifications-strip">
        <div className="cert-text">
          <p>Our team holds <strong>multiple AWS certifications</strong> across specialized areas. We take pride in our depth of knowledge and continuously invest in staying current with AWS best practices and emerging technologies.</p>
        </div>
        <div className="cert-badges">
          <div className="cert-badge" title="AWS Solutions Architect - Associate">
            <img src="/badges/solutions-architect-associate.png" alt="AWS Solutions Architect Associate" className="cert-badge-img" />
          </div>
          <div className="cert-badge" title="AWS Solutions Architect - Professional">
            <img src="/badges/solutions-architect-professional.png" alt="AWS Solutions Architect Professional" className="cert-badge-img" />
          </div>
          <div className="cert-badge" title="AWS Data Engineer - Associate">
            <img src="/badges/data-engineer-associate.png" alt="AWS Data Engineer Associate" className="cert-badge-img" />
          </div>
          <div className="cert-badge" title="AWS Machine Learning Engineer - Associate">
            <img src="/badges/ml-engineer-associate.png" alt="AWS ML Engineer Associate" className="cert-badge-img" />
          </div>
          <div className="cert-badge" title="AWS DevOps Engineer - Professional">
            <img src="/badges/devops-engineer-professional.png" alt="AWS DevOps Engineer Professional" className="cert-badge-img" />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 iFu Labs Ltd.</p>
        <p>AWS Partner Network member · Read-only infrastructure access · No lock-in</p>
      </div>
    </>
  )
}
