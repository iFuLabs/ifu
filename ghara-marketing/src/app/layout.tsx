import type { Metadata, Viewport } from 'next'
import './globals.css'
import Link from 'next/link'
import MobileNav from './_components/MobileNav'

const APP_URL = 'https://app.ghara.ifulabs.com'

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFFFFF' }

export const metadata: Metadata = {
  title: 'Ghara — Cloud compliance and cost in one dashboard',
  description: 'Ghara watches your AWS for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by iFU Labs.',
  icons: {
    icon: '/brand/ghara-mark.svg',
    apple: '/brand/ghara-mark.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Nav */}
        <nav className="site-nav">
          <Link href="/" className="nav-logo" aria-label="Ghara home">
            <img src="/brand/ghara-mark.svg" alt="" />
            <span>Ghara</span>
          </Link>

          <div className="nav-links">
            <Link href="/#features">Features</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/demo">Demo</Link>
          </div>

          <div className="nav-actions">
            <a href={`${APP_URL}/login`} className="btn-ghost">Sign in</a>
            <a href={`${APP_URL}/signup`} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Start free trial</a>
            <MobileNav appUrl={APP_URL} />
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/brand/ghara-mark.svg" alt="" style={{ width: 26, height: 26 }} />
                <span style={{ fontFamily: "'PP Fragment', serif", fontSize: 20, fontWeight: 400, letterSpacing: '-0.5px' }}>Ghara</span>
              </div>
              <p>Cloud compliance and cost intelligence. One dashboard for your entire AWS posture.</p>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Built by</span>
                <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}>
                  <img src="/logos/plum.svg" alt="iFU Labs" style={{ height: 18, width: 'auto' }} />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><Link href="/#features">Features</Link></li>
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
            <div className="co-brand" aria-label="Built on AWS, powered by Anthropic Claude">
              <img className="co-brand-mark" src="/logos/plum.svg" alt="iFU Labs" />
              <span className="co-brand-divider" />
              <img
                className="co-brand-mark"
                src="https://d0.awsstatic.com/logos/powered-by-aws.png"
                alt="Powered by AWS"
                style={{ height: 22 }}
              />
              <span className="co-brand-divider" />
              <span className="co-brand-partner">Powered by Anthropic Claude</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
