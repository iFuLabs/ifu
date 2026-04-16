'use client'
import '../globals.css'
import { useEffect } from 'react'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
      {/* Nav */}
      <nav>
        <a href="/" className="logo">
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
          <li><a href="/#services">Services</a></li>
          <li><a href="/#products">Products</a></li>
          <li><a href="/for-startups">For Startups</a></li>
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
        </ul>

        <div className="nav-actions">
          <a href="/#contact" className="btn-outline">Talk to us</a>
          <a href={PORTAL_URL} className="btn-solid">Client portal →</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" style={{ paddingBottom: '120px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="hero-eyebrow" style={{ display: 'inline-flex' }}>
            <div className="hero-eyebrow-dot"></div>
            About iFu Labs
          </div>
          <h1 style={{ marginBottom: '32px' }}>
            AWS consultancy built for<br/>
            <em>startups and scale-ups.</em>
          </h1>
          <p className="hero-sub" style={{ maxWidth: '700px', fontSize: '18px' }}>
            We're a remote-first team of AWS-certified engineers who specialize in helping startups and fast-growing companies build, scale, and secure their AWS infrastructure — without the overhead of hiring a full platform team.
          </p>
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
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          justifyContent: 'center', 
          flexWrap: 'wrap', 
          marginTop: '48px',
          fontSize: '14px',
          color: 'var(--muted)',
          fontFamily: 'var(--mono)'
        }}>
          <div>✓ Solutions Architect (Associate & Professional)</div>
          <div>✓ DevOps Engineer (Professional)</div>
          <div>✓ Security Specialty</div>
          <div>✓ Data Engineer (Associate)</div>
          <div>✓ ML Engineer (Associate)</div>
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
                <li><a href="/#services">Cost Optimisation</a></li>
                <li><a href="/#services">Compliance</a></li>
                <li><a href="/#services">Cloud Migration</a></li>
                <li><a href="/#services">EKS & Containers</a></li>
                <li><a href="/#services">DevOps & CI/CD</a></li>
                <li><a href="/#services">Managed Services</a></li>
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
