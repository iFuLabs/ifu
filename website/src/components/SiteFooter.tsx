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
