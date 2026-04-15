'use client'
import '../globals.css'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'

export default function AcceptableUsePage() {
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
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="/#about">About</a></li>
        </ul>

        <div className="nav-actions">
          <a href="mailto:info@ifulabs.com" className="btn-outline">Email us</a>
          <a href={PORTAL_URL} className="btn-solid">Client portal →</a>
        </div>
      </nav>

      {/* Content */}
      <article style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 32px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            fontFamily: 'var(--serif)',
          }}>
            Acceptable Use Policy
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Last updated: January 2026
          </p>
        </div>

        <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--ink)' }}>
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              1. Purpose
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              This Acceptable Use Policy outlines prohibited uses of iFu Labs services. Violations may result in account suspension or termination without refund.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              2. Prohibited Activities
            </h2>
            
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.1 Illegal Activities
            </h3>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You may not use our services to:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Violate any local, state, national, or international law</li>
              <li>Engage in fraud, money laundering, or other financial crimes</li>
              <li>Distribute malware, viruses, or other harmful code</li>
              <li>Facilitate illegal gambling or drug trafficking</li>
              <li>Violate export control or sanctions laws</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.2 Security Violations
            </h3>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You may not:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Probe, scan, or test vulnerabilities without written permission</li>
              <li>Breach or circumvent security or authentication measures</li>
              <li>Access data not intended for you</li>
              <li>Interfere with service to any user, host, or network</li>
              <li>Launch denial-of-service attacks</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.3 Abuse and Harassment
            </h3>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You may not:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Harass, threaten, or intimidate others</li>
              <li>Send unsolicited communications (spam)</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest personal information without consent</li>
              <li>Engage in hate speech or discrimination</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.4 Intellectual Property Violations
            </h3>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You may not:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Infringe on copyrights, trademarks, patents, or trade secrets</li>
              <li>Distribute pirated software or content</li>
              <li>Reverse engineer our software or services</li>
              <li>Remove or alter copyright notices or watermarks</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.5 Service Abuse
            </h3>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You may not:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Use our services in a way that degrades performance for others</li>
              <li>Create multiple accounts to circumvent restrictions</li>
              <li>Resell or redistribute our services without authorization</li>
              <li>Use automated tools to scrape or extract data</li>
              <li>Bypass rate limits or usage restrictions</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              3. AWS-Specific Restrictions
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>When connecting your AWS account:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>You must have proper authorization to grant us access</li>
              <li>You must not use our service to circumvent AWS terms of service</li>
              <li>You remain responsible for all AWS costs and compliance</li>
              <li>You must not provide access to accounts containing illegal content</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              4. Content Standards
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>
              Any content you provide through our services (support tickets, feedback, etc.) must not contain:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Obscene, pornographic, or sexually explicit material</li>
              <li>Hate speech or content promoting violence</li>
              <li>False or misleading information</li>
              <li>Personal information of others without consent</li>
              <li>Confidential information you don't have rights to share</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              5. Reporting Violations
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              If you become aware of any violation of this policy, please report it immediately to <a href="mailto:info@ifulabs.com" style={{ color: 'var(--brand)' }}>info@ifulabs.com</a>. We will investigate all reports promptly.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              6. Enforcement
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We reserve the right to:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Investigate suspected violations</li>
              <li>Remove content that violates this policy</li>
              <li>Suspend or terminate accounts without notice for serious violations</li>
              <li>Report illegal activities to law enforcement</li>
              <li>Cooperate with legal investigations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              7. Consequences of Violations
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              Depending on the severity of the violation, we may:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Issue a warning</li>
              <li>Temporarily suspend your account</li>
              <li>Permanently terminate your account without refund</li>
              <li>Pursue legal action</li>
              <li>Report to relevant authorities</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              8. No Liability for User Actions
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We are not responsible for user content or actions. You are solely responsible for your use of our services and any consequences thereof.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              9. Changes to This Policy
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We may update this policy at any time. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              10. Contact
            </h2>
            <p style={{ color: 'var(--muted)' }}>
              Questions about this policy? Contact us at <a href="mailto:info@ifulabs.com" style={{ color: 'var(--brand)' }}>info@ifulabs.com</a>
            </p>
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer>
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
        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/acceptable-use">Acceptable Use</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="/#about">About</a></li>
            <li><a href="/schedule-consultation">Schedule consultation</a></li>
            <li><a href="mailto:info@ifulabs.com">info@ifulabs.com</a></li>
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
