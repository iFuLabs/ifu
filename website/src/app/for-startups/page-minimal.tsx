'use client'
import '../globals.css'
import { useEffect, useState } from 'react'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function ForStartupsPage() {
  useScrollReveal()
  const [monthly, setMonthly] = useState(5000)
  const savings = {
    low: Math.round(monthly * 12 * 0.25),
    high: Math.round(monthly * 12 * 0.40)
  }

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
          <li><a href="/#about">About</a></li>
        </ul>
        <div className="nav-actions">
          <a href={PORTAL_URL} className="btn-solid">Client Portal →</a>
        </div>
      </nav>

      {/* Hero - Cloudvisor-inspired clean design */}
      <section className="startup-hero">
        <div className="startup-hero-content">
          <div className="startup-badge">
            <span className="badge-dot"></span>
            AWS Partner Network · Built for Startups
          </div>
          <h1 className="startup-hero-title">
            Trusted AWS Partner<br/>
            for Growing Startups
          </h1>
          <p className="startup-hero-subtitle">
            Cut AWS costs by 25-40%. Get $100K in credits. Ship faster with expert guidance.
            No lock-in, no surprises.
          </p>
          <div className="startup-hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-number">2000+</div>
              <div className="hero-stat-label">Startups Helped</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">$10M+</div>
              <div className="hero-stat-label">Saved on AWS</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">75+</div>
              <div className="hero-stat-label">Countries</div>
            </div>
          </div>
          <a href="/schedule-consultation" className="btn-cta-large">
            Book Free Consultation
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </a>
        </div>
      </section>

      {/* Services Grid - Clean 3-column */}
      <section className="startup-services">
        <div className="section-header-center">
          <h2>Services Tailored for Startups</h2>
          <p>Everything you need to scale on AWS without the enterprise overhead</p>
        </div>
        
        <div className="services-clean-grid">
          <div className="service-clean-card">
            <div className="service-icon">💰</div>
            <h3>AWS Cost Optimization</h3>
            <p>Typical clients save 25-40% within 30 days. Rightsizing, Savings Plans, and anomaly detection included.</p>
          </div>
          
          <div className="service-clean-card featured">
            <div className="service-badge">Most Popular</div>
            <div className="service-icon">💳</div>
            <h3>AWS Credits Program</h3>
            <p>Get up to $100,000 in AWS Activate credits. We guide you through the application and help you use every dollar wisely.</p>
          </div>
          
          <div className="service-clean-card">
            <div className="service-icon">🛡️</div>
            <h3>SOC 2 Compliance</h3>
            <p>From zero to audit-ready in 6 weeks. Gap assessment, controls, evidence pack, and auditor liaison.</p>
          </div>
          
          <div className="service-clean-card">
            <div className="service-icon">☁️</div>
            <h3>Cloud Migration</h3>
            <p>Move from Heroku, on-prem, or another cloud to AWS with zero downtime. Dependency mapping and cutover runbooks included.</p>
          </div>
          
          <div className="service-clean-card">
            <div className="service-icon">⚙️</div>
            <h3>DevOps & CI/CD</h3>
            <p>Modern deployment pipelines, IaC with Terraform/CDK, and monitoring that actually helps you ship faster.</p>
          </div>
          
          <div className="service-clean-card">
            <div className="service-icon">🤖</div>
            <h3>AI & Data Engineering</h3>
            <p>Validate use cases, modernize your data layer, and build cloud-native AI features on AWS.</p>
          </div>
        </div>
      </section>

      {/* Savings Calculator - Simplified */}
      <section className="startup-calculator">
        <div className="calc-container">
          <div className="calc-left-new">
            <h2>See Your Potential Savings</h2>
            <p>Drag the slider to your monthly AWS spend. Most startups save 25-40% in the first 30 days.</p>
            
            <div className="calc-input-group">
              <label>Your Monthly AWS Spend</label>
              <div className="calc-display">${monthly.toLocaleString()}</div>
              <input
                type="range"
                min={500}
                max={50000}
                step={500}
                value={monthly}
                onChange={(e) => setMonthly(parseInt(e.target.value))}
                className="calc-slider-new"
              />
              <div className="calc-range-labels">
                <span>$500</span>
                <span>$50,000</span>
              </div>
            </div>
          </div>
          
          <div className="calc-right-new">
            <div className="calc-result-card">
              <div className="calc-result-label">Estimated Annual Savings</div>
              <div className="calc-result-amount">
                ${savings.low.toLocaleString()} - ${savings.high.toLocaleString()}
              </div>
              <div className="calc-result-note">
                Based on typical client outcomes. Your results depend on current architecture and usage patterns.
              </div>
              <a href="/schedule-consultation" className="btn-calc-cta">
                Get Your Free Audit
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="startup-testimonials">
        <div className="section-header-center">
          <h2>What Founders Say</h2>
          <p>Real feedback from startups we've helped scale on AWS</p>
        </div>
        
        <div className="testimonials-clean-grid">
          <div className="testimonial-clean">
            <div className="testimonial-stars">★★★★★</div>
            <p>"They paid for themselves in the first week. The audit found idle resources and a Savings Plan we'd never have discovered on our own."</p>
            <div className="testimonial-author-clean">
              <div className="author-avatar">F</div>
              <div>
                <div className="author-name">Founding Engineer</div>
                <div className="author-company">Series A B2B SaaS</div>
              </div>
            </div>
          </div>
          
          <div className="testimonial-clean">
            <div className="testimonial-stars">★★★★★</div>
            <p>"We needed SOC 2 in six weeks to close a deal. iFu Labs handled everything - controls, evidence, auditor calls. We signed the customer."</p>
            <div className="testimonial-author-clean">
              <div className="author-avatar">C</div>
              <div>
                <div className="author-name">CTO</div>
                <div className="author-company">Seed-stage Healthtech</div>
              </div>
            </div>
          </div>
          
          <div className="testimonial-clean">
            <div className="testimonial-stars">★★★★★</div>
            <p>"Best money we spent post-fundraise. Zero-downtime EKS migration, clean IaC handover, and they taught us how to run it ourselves."</p>
            <div className="testimonial-author-clean">
              <div className="author-avatar">H</div>
              <div>
                <div className="author-name">Head of Engineering</div>
                <div className="author-company">Series B Fintech</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="startup-final-cta">
        <div className="final-cta-content">
          <h2>Start Scaling on AWS the Smart Way</h2>
          <p>Book a free 30-minute consultation. No sales pitch - just honest advice on your AWS setup, credits you qualify for, and whether we're the right fit.</p>
          <a href="/schedule-consultation" className="btn-cta-large">
            Book Free Consultation
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </a>
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
                <li><a href="/#services">DevOps & CI/CD</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Products</h4>
              <ul>
                <li><a href={`${PORTAL_URL}/onboarding?product=comply&plan=starter`}>iFu Comply</a></li>
                <li><a href={`${PORTAL_URL}/onboarding?product=finops&plan=starter`}>iFu Costless</a></li>
                <li><a href={`${PORTAL_URL}/login`}>Client Portal</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/#about">About</a></li>
                <li><a href="/for-startups">For Startups</a></li>
                <li><a href="https://aws.amazon.com/partners/" target="_blank" rel="noopener">AWS Partnership</a></li>
                <li><a href="mailto:info@ifulabs.com">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-legal">
          <h4>Legal</h4>
          <ul>
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/terms">Terms</a></li>
            <li><a href="/acceptable-use">Acceptable Use</a></li>
          </ul>
        </div>
      </footer>

      <div className="footer-bottom">
        <p>© 2026 iFu Labs Ltd.</p>
        <p>AWS Partner Network · Read-only Access · No Lock-in</p>
      </div>
    </>
  )
}
