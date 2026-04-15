'use client'
import '../globals.css'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Last updated: January 2026
          </p>
        </div>

        <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--ink)' }}>
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              1. Introduction
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              iFu Labs Ltd ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services, including our website, cloud consultancy services, and SaaS products (Comply and FinOps).
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              2. Information We Collect
            </h2>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.1 Information You Provide
            </h3>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Account information (name, email, company name)</li>
              <li>Payment information (processed securely via Paystack)</li>
              <li>AWS credentials (encrypted and stored securely with read-only access)</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              2.2 Information We Collect Automatically
            </h3>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>AWS infrastructure metadata (for compliance scanning and cost analysis)</li>
              <li>Usage data and analytics</li>
              <li>Log files and error reports</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>We use your information to:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Provide and maintain our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Scan your AWS infrastructure for compliance and cost optimization</li>
              <li>Send service notifications and updates</li>
              <li>Respond to support requests</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              4. Data Security
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>All AWS credentials are encrypted using AES-256-GCM encryption</li>
              <li>We only request read-only access to your AWS infrastructure</li>
              <li>Data is transmitted over HTTPS/TLS</li>
              <li>Access to customer data is restricted to authorized personnel only</li>
              <li>Regular security audits and penetration testing</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              5. Data Sharing and Disclosure
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li><strong>Service Providers:</strong> Paystack (payment processing), AWS (infrastructure hosting)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              6. Data Retention
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We retain your information for as long as your account is active or as needed to provide services. When you cancel your subscription, we will delete your AWS credentials immediately and retain other data for up to 90 days for backup and legal purposes, unless a longer retention period is required by law.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              7. Your Rights
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You have the right to:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              To exercise these rights, contact us at <a href="mailto:info@ifulabs.com" style={{ color: 'var(--brand)' }}>info@ifulabs.com</a>
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              8. Cookies and Tracking
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We use essential cookies for authentication and session management. We do not use third-party advertising or tracking cookies. You can control cookies through your browser settings.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              9. International Data Transfers
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              10. Changes to This Policy
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our service. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              11. Contact Us
            </h2>
            <p style={{ marginBottom: '8px', color: 'var(--muted)' }}>
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <p style={{ color: 'var(--muted)' }}>
              Email: <a href="mailto:info@ifulabs.com" style={{ color: 'var(--brand)' }}>info@ifulabs.com</a>
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
