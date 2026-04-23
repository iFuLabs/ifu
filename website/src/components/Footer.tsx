/**
 * Shared Footer Component with AWS Co-branding
 */

export function Footer() {
  const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  return (
    <footer className="footer-new">
      <div className="footer-main-inner">
        <div className="footer-brand">
          <p className="footer-tagline">Expert AWS engineering for startups that ship fast.</p>
          
          {/* AWS Co-branding */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px',
            margin: '24px 0' 
          }}>
            <img 
              src="/logos/white.svg" 
              alt="iFu Labs" 
              style={{ height: '32px', width: 'auto' }}
            />
            <div style={{ 
              width: '1px', 
              height: '32px', 
              background: '#DAC0FD' 
            }} />
            <img 
              src="https://d0.awsstatic.com/logos/powered-by-aws-white.png"
              alt="Powered by AWS"
              style={{ height: 'auto', maxHeight: '32px', opacity: 0.9 }}
            />
          </div>
          
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

      {/* Legal */}
      <div className="footer-legal">
        <h4>Legal</h4>
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Service</a></li>
          <li><a href="/acceptable-use">Acceptable Use</a></li>
        </ul>
      </div>

      {/* Certifications */}
      <div className="footer-certifications">
        <div className="footer-cert-text">
          <p>Our team holds <strong>multiple AWS certifications</strong> across specialized areas. We take pride in our depth of knowledge and continuously invest in staying current with AWS best practices and emerging technologies.</p>
        </div>
        <div className="footer-cert-badges">
          {[
            { file: 'solutions-architect-associate.png', label: 'AWS Solutions Architect Associate' },
            { file: 'solutions-architect-professional.png', label: 'AWS Solutions Architect Professional' },
            { file: 'data-engineer-associate.png', label: 'AWS Data Engineer Associate' },
            { file: 'ml-engineer-associate.png', label: 'AWS ML Engineer Associate' },
            { file: 'devops-engineer-professional.png', label: 'AWS DevOps Engineer Professional' },
          ].map(badge => (
            <div key={badge.file} className="footer-cert-badge" title={badge.label}>
              <img src={`/badges/${badge.file}`} alt={badge.label} />
            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 iFu Labs Ltd.</p>
        <p>AWS Partner Network member · Read-only infrastructure access · No lock-in</p>
      </div>
    </footer>
  )
}
