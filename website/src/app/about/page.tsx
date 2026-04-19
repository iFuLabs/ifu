'use client'
import '../globals.css'
import { useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function AboutPage() {
  useScrollReveal()

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="hero" style={{ paddingBottom: '120px' }}>
        <div className="hero-left">
          <div className="hero-eyebrow" style={{ display: 'inline-flex' }}>
            <div className="hero-eyebrow-dot"></div>
            About iFu Labs
          </div>
          <h1 style={{ marginBottom: '32px' }}>
            AWS consultancy built for<br/>
            <em>startups and scale-ups.</em>
          </h1>
          <p className="hero-sub" style={{ fontSize: '18px' }}>
            We're a remote-first team of AWS-certified engineers who specialize in helping startups and fast-growing companies build, scale, and secure their AWS infrastructure — without the overhead of hiring a full platform team.
          </p>
        </div>

        <div className="about-hero-card">
          <div className="about-hero-card-label">HOW WE WORK</div>
          <div className="about-hero-steps">
            {[
              { num: '01', title: 'Discovery', desc: 'We review your infrastructure, spend, compliance posture, and team structure within 48 hours. No fluff — an honest read on where you stand and what needs to change.' },
              { num: '02', title: 'Architecture', desc: 'We design a solution architecture tailored to your constraints, roadmap, and budget. Every decision is documented with clear rationale before a single line of code is written.' },
              { num: '03', title: 'Delivery', desc: 'Our engineers embed with your team and execute against a shared plan. Weekly standups, full IaC, and no handover black boxes. You see every change before it ships.' },
              { num: '04', title: 'Handover', desc: 'You own everything. Runbooks, Terraform, access, documentation. We train your team and leave them self-sufficient — no manufactured dependency on iFu Labs.' },
            ].map((step, i, arr) => (
              <div key={step.num} className="about-hero-step">
                <div className="about-hero-step-rail">
                  <span className="about-hero-step-num">{step.num}</span>
                  {i < arr.length - 1 && <div className="about-hero-step-line" />}
                </div>
                <div className="about-hero-step-body">
                  <div className="about-hero-step-title">{step.title}</div>
                  <p className="about-hero-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="about-hero-card-footer">
            <span className="about-hero-card-diamond">◆</span>
            Our most common engagement — 2–3 service areas over 6–12 weeks with a dedicated engineer.
          </div>
        </div>
      </section>

      {/* Approach section */}
      <section className="section reveal">
        <div className="approach-wrap">
          <div className="approach-steps">
            <div className="approach-step">
              <div className="step-num">01</div>
              <div className="step-body">
                <h3>Startup-focused expertise</h3>
                <p>We've worked with startups from pre-seed to Series C. We understand the unique challenges of building fast while keeping costs low and security tight.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="step-num">02</div>
              <div className="step-body">
                <h3>Read-only by default</h3>
                <p>We never need write access to production. Every change is delivered as infrastructure-as-code that you review and apply.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="step-num">03</div>
              <div className="step-body">
                <h3>Document everything</h3>
                <p>Architecture decisions, runbooks, diagrams — fully documented and handed over. You own all the knowledge we create.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="step-num">04</div>
              <div className="step-body">
                <h3>Make you self-sufficient</h3>
                <p>Our goal is to make ourselves unnecessary. We leave you with the skills, tools, and confidence to run it yourself as you grow.</p>
              </div>
            </div>
          </div>

          <div className="why-card">
            <h3>Why startups choose iFu Labs</h3>
            <div className="why-point">
              <div className="why-check">✓</div>
              <p><strong>Built for startup speed.</strong> We move fast, ship reliably, and understand the constraints of early-stage teams.</p>
            </div>
            <div className="why-point">
              <div className="why-check">✓</div>
              <p><strong>No vendor lock-in.</strong> All IaC, docs, and knowledge transfer included. Walk away any time.</p>
            </div>
            <div className="why-point">
              <div className="why-check">✓</div>
              <p><strong>AWS Activate credits.</strong> We help eligible startups access up to $100K in AWS credits and MAP funding.</p>
            </div>
            <div className="why-point">
              <div className="why-check">✓</div>
              <p><strong>Transparent pricing.</strong> Fixed scopes, honest timelines, no surprise bills. Pricing that makes sense for startups.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Certifications */}
      <section className="section reveal" style={{ textAlign: 'center' }}>
        <div className="section-eyebrow">AWS Partner Network</div>
        <h2 className="section-title">Certified across the<br/><em>AWS stack.</em></h2>
        <p className="section-sub" style={{ margin: '0 auto' }}>
          Our team holds multiple AWS certifications spanning Solutions Architecture, DevOps, Security, Data Engineering, and Machine Learning. We invest continuously in staying current with AWS best practices.
        </p>
        <div className="about-cert-grid">
          {[
            { file: 'solutions-architect-associate.png', label: 'Solutions Architect (Associate & Professional)' },
            { file: 'devops-engineer-professional.png', label: 'DevOps Engineer (Professional)' },
            { file: 'solutions-architect-professional.png', label: 'Security Specialty' },
            { file: 'data-engineer-associate.png', label: 'Data Engineer (Associate)' },
            { file: 'ml-engineer-associate.png', label: 'ML Engineer (Associate)' },
          ].map(b => (
            <div key={b.label} className="about-cert-item">
              <img src={`/badges/${b.file}`} alt={b.label} />
              <div className="about-cert-label">{b.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* CTA */}
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
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Let&apos;s talk about your AWS infrastructure.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.6,
              maxWidth: '560px',
              marginBottom: '0',
            }}>
              Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
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
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              Book a free call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
