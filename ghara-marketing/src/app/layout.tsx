import type { Metadata, Viewport } from 'next'
import './globals.css'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFFFFF' }

export const metadata: Metadata = {
  title: 'Ghara — Cloud compliance and cost in one dashboard',
  description: 'Ghara watches your AWS for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by iFU Labs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Nav */}
        <nav className="site-nav">
          <Link href="/" className="nav-logo">
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#33063D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>G</span>
            </div>
            <span>Ghara</span>
          </Link>

          <div className="nav-links">
            <Link href="/#pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/demo">Demo</Link>
          </div>

          <div className="nav-actions">
            <a href={`${APP_URL}/login`} className="btn-ghost">Sign in</a>
            <a href={`${APP_URL}/signup`} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Start free trial</a>
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, background: '#33063D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>G</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Ghara</span>
              </div>
              <p>Cloud compliance and cost intelligence. One dashboard for your entire AWS posture.</p>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(51,6,61,0.5)' }}>Built by</span>
                <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">
                  <img src="/ifulabs-logo.svg" alt="iFU Labs" style={{ height: 16 }} />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><Link href="/#pricing">Pricing</Link></li>
                <li><a href={`${APP_URL}/signup`}>Start trial</a></li>
                <li><a href={`${APP_URL}/login`}>Sign in</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Frameworks</h4>
              <ul>
                <li><span>SOC 2</span></li>
                <li><span>ISO 27001</span></li>
                <li><span>GDPR</span></li>
                <li><span>HIPAA</span></li>
                <li><span>PCI DSS</span></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Ghara</Link></li>
                <li><a href="https://ifulabs.com">iFU Labs (consultancy)</a></li>
                <li><a href="https://ifulabs.com/privacy">Privacy</a></li>
                <li><a href="https://ifulabs.com/terms">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} iFU Labs. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
