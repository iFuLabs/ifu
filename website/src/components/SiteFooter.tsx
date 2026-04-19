'use client'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const SERVICES = [
  { slug: 'cost-optimisation', name: 'Cost Optimisation' },
  { slug: 'compliance-security', name: 'Compliance & Security' },
  { slug: 'cloud-migration', name: 'Cloud Migration' },
  { slug: 'eks-ecs', name: 'EKS & ECS Engineering' },
  { slug: 'devops-cicd', name: 'DevOps & CI/CD' },
  { slug: 'managed-services', name: 'Managed Services' },
]

const BADGES = [
  { file: 'solutions-architect-associate.png', label: 'AWS Solutions Architect Associate' },
  { file: 'solutions-architect-professional.png', label: 'AWS Solutions Architect Professional' },
  { file: 'data-engineer-associate.png', label: 'AWS Data Engineer Associate' },
  { file: 'ml-engineer-associate.png', label: 'AWS ML Engineer Associate' },
  { file: 'devops-engineer-professional.png', label: 'AWS DevOps Engineer Professional' },
]

export function SiteFooter() {
  return (
    <>
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
            <div className="footer-contact-links">
              <a href="mailto:info@ifulabs.com" className="footer-contact-link">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 4L6 7L11 4" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                info@ifulabs.com
              </a>
              <a href="https://aws.amazon.com/partners/" target="_blank" rel="noopener" className="footer-contact-link">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 1.5V6L8.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                AWS Partner Network Member
              </a>
            </div>
          </div>
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                {SERVICES.map(s => <li key={s.slug}><a href={`/services/${s.slug}`}>{s.name}</a></li>)}
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

        <div className="footer-certifications">
          <div className="footer-cert-text">
            <p>Our team holds <strong>multiple AWS certifications</strong> across specialized areas. We take pride in our depth of knowledge and continuously invest in staying current with AWS best practices and emerging technologies.</p>
          </div>
          <div className="footer-cert-badges">
            {BADGES.map(badge => (
              <div key={badge.file} className="footer-cert-badge" title={badge.label}>
                <img src={`/badges/${badge.file}`} alt={badge.label} />
              </div>
            ))}
          </div>
        </div>
      </footer>
      <div className="footer-bottom">
        <p>© 2026 iFu Labs Ltd.</p>
        <p>AWS Partner Network member · Read-only infrastructure access · No lock-in</p>
      </div>
    </>
  )
}
