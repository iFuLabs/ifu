'use client'
import './globals.css'
import { useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { IrisButton, MintCard } from '@/components/BrandPatterns'
import { Footer } from '@/components/Footer'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function usePageScripts() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))

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

export default function HomePageClient() {
  usePageScripts()

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            AWS Partner · Built for startups
          </div>
          <h1>
            Expert AWS engineering<br/>
            for startups that <em>ship fast.</em>
          </h1>
          <p className="hero-sub">
            iFu Labs delivers consultant-led cloud services — cost optimisation, compliance, migration, containers, and DevOps — backed by deep AWS expertise and real engineering.
          </p>
          <div className="hero-actions">
            <IrisButton href="/schedule-consultation">
              Book a free discovery call
            </IrisButton>
            <a href="#services" className="btn-cta ghost">See our services</a>
          </div>
          <div className="hero-trust">
            {[
              'AWS Partner Network member',
              'Read-only access, always',
              'No lock-in contracts',
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

        <div className="hero-right">
          <div className="hero-card-stack">
            {[
              { title: 'Cost Optimisation', desc: 'Found $1,200/month in idle resources — week one', badge: 'Service' },
              { title: 'SOC 2 Compliance', desc: 'Audit-ready in 6 weeks, not 6 months', badge: '+ SaaS tool' },
              { title: 'EKS Migration',    desc: '14 services on Kubernetes, zero downtime', badge: 'Service' },
              { title: 'CI/CD Pipelines',  desc: 'Deploy time: 40 mins → 6 mins', badge: 'Service' },
            ].map(card => (
              <div key={card.title} className="hero-card">
                <div className="hero-card-body">
                  <div className="hero-card-title">{card.title}</div>
                  <div className="hero-card-desc">{card.desc}</div>
                </div>
                <span className="hero-card-badge">{card.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <div className="apn-strip">
        {[
          { icon: '◈', text: 'AWS Partner Network Member' },
          { icon: '⬡', text: 'Read-only infrastructure access' },
          { icon: '◻', text: 'SOC 2 compliant practice' },
          { icon: '◈', text: 'Help clients unlock $100K AWS credits' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 && <div className="apn-sep" />}
            <div className="apn-item">
              <span className="apn-item-icon" style={{ color: 'var(--accent)', fontSize: '12px' }}>{item.icon}</span>
              {item.text}
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
            { num: '01', icon: '◈', label: 'FinOps',     name: 'Cost Optimisation',     desc: 'We audit your AWS spend, identify waste, and implement Savings Plans. Average client saves 25–40% within 30 days.', items: ['Full spend audit & waste report', 'Rightsizing recommendations', 'RI & Savings Plan strategy', 'Cost anomaly monitoring setup'] },
            { num: '02', icon: '⬡', label: 'Compliance', name: 'Compliance & Security',  desc: 'SOC 2, ISO 27001, GDPR, and HIPAA readiness — evidence collection, gap remediation, and audit preparation end-to-end.', items: ['Gap assessment & risk report', 'Control remediation delivery', 'Evidence pack preparation', 'Auditor liaison support'] },
            { num: '03', icon: '☁', label: 'Migration',  name: 'Cloud Migration',        desc: 'On-premise to AWS, workload re-platforming, or cross-cloud migrations. Zero surprise downtime.', items: ['Discovery & dependency mapping', 'Migration wave planning', 'Lift-and-shift or re-architect', 'AWS MAP program support'] },
            { num: '04', icon: '⎈', label: 'Containers', name: 'EKS & ECS Engineering',  desc: 'We design, build, and secure Kubernetes clusters on AWS — from architecture to production-grade operations.', items: ['Cluster design & provisioning', 'Helm chart & manifest reviews', 'RBAC & network policy hardening', 'Observability stack setup'] },
            { num: '05', icon: '⟳', label: 'DevOps',     name: 'DevOps & CI/CD',         desc: 'Infrastructure as code, deployment pipelines, and platform engineering. Fast, reliable, and auditable delivery.', items: ['Terraform & CDK implementation', 'GitHub Actions / CodePipeline', 'Blue/green & canary deployments', 'Developer platform setup'] },
            { num: '06', icon: '⬒', label: 'Managed',    name: 'Ongoing AWS Support',    desc: 'Retainer-based support. We act as your embedded cloud team — monitoring, incident response, and quarterly reviews.', items: ['Dedicated solutions engineer', '24/7 incident response SLA', 'Monthly cost & security reviews', 'Quarterly roadmap planning'] },
          ].map(s => (
            <div key={s.num} className="service-card">
              <div className="service-top-border" />
              <span className="service-card-num">{s.num}</span>
              <span className="service-icon" style={{ color: 'var(--accent)' }}>{s.icon}</span>
              <div className="service-label">{s.label}</div>
              <div className="service-name">{s.name}</div>
              <p className="service-desc">{s.desc}</p>
              <ul className="service-deliverables">
                {s.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Methodology */}
      <section className="methodology-section section--soft gradient-iris-lavender" id="methodology">
        <div className="methodology-inner reveal">
          <div className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.9)' }}>Our Methodology</div>
          <h2 className="section-title" style={{ color: '#fff' }}>A repeatable delivery<br/>model built for <em>results.</em></h2>
          <p className="section-sub" style={{ color: 'rgba(255,255,255,0.85)' }}>Enterprise buyers want to see how you work, not just what you do. Here is our process, every time.</p>

          <div className="methodology-grid reveal-grid">
            {[
              { num: '01', title: 'Discovery', desc: 'We review your infrastructure, spend, compliance posture, and team structure within 48 hours. No fluff — an honest read on where you stand and what needs to change.' },
              { num: '02', title: 'Architecture', desc: 'We design a solution architecture tailored to your constraints, roadmap, and budget. Every decision is documented with clear rationale before a single line of code is written.' },
              { num: '03', title: 'Delivery', desc: 'Our engineers embed with your team and execute against a shared plan. Weekly standups, full IaC, and no handover black boxes. You see every change before it ships.' },
              { num: '04', title: 'Handover', desc: 'You own everything. Runbooks, Terraform, access, documentation. We train your team and leave them self-sufficient — no manufactured dependency on iFu Labs.' },
            ].map(step => (
              <div key={step.num} className="method-step" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="method-num" style={{ color: '#fff' }}>{step.num}</span>
                <div className="method-title" style={{ color: '#fff' }}>{step.title}</div>
                <p className="method-desc" style={{ color: 'rgba(255,255,255,0.85)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="products-section" id="products">
        <div className="products-inner reveal">
          <div className="section-eyebrow">SaaS Products</div>
          <h2 className="section-title">Prefer a product over<br/>a <em>consultant?</em></h2>
          <p className="section-sub">Our consultancy experience packaged into standalone tools. Subscribe independently or combine with a managed services retainer.</p>

          <div className="products-grid reveal-grid">
            <div className="product-card">
              <span className="product-tag">● iFu Comply</span>
              <div className="product-name">Compliance Automation</div>
              <p className="product-desc">Automated SOC 2, ISO 27001, and GDPR evidence collection, control monitoring, and audit-ready PDF exports.</p>
              <ul className="product-features">
                {['Daily automated AWS control checks', 'AI-powered gap explanations & fix steps', 'One-click evidence pack PDF', 'Vendor risk & cert expiry tracking', 'Regulatory change monitoring'].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="product-price">From <strong>$299</strong> / month · or add to your retainer</div>
              <div className="product-actions">
                <IrisButton href="/demo/comply">Request a demo</IrisButton>
                <a href={`${PORTAL_URL}/onboarding?product=comply&plan=starter`} className="product-cta ghost">Start free trial →</a>
              </div>
            </div>

            <div className="product-card">
              <span className="product-tag">● iFu Costless</span>
              <div className="product-name">Cost Optimisation Tool</div>
              <p className="product-desc">Connect your AWS account and get a live view of waste, savings opportunities, and spend anomalies — updated daily.</p>
              <ul className="product-features">
                {['Idle resource & waste detection', 'Reserved Instance & Savings Plan gaps', 'Weekly cost anomaly alerts', 'S3 storage class optimisation', 'Monthly executive spend report'].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="product-price">From <strong>$199</strong> / month · or add to your retainer</div>
              <div className="product-actions">
                <IrisButton href="/demo/costless">Request a demo</IrisButton>
                <a href={`${PORTAL_URL}/onboarding?product=finops&plan=starter`} className="product-cta ghost">Start free trial →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section section--lift reveal" id="pricing">
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
              <a href={(p as any).href} className="pricing-cta">{p.cta}</a>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Contact */}
      <div className="cta-band reveal gradient-plum-lavender" id="contact">
        <div className="cta-section">
          <div>
            <h2 style={{ color: '#fff' }}>Let&apos;s talk about your AWS infrastructure.</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)' }}>Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.</p>
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
                if (!name || !email || !company) { alert('Please fill in all required fields'); return }
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

      <Footer />
    </>
  )
}
