'use client'
import '../../globals.css'
import { useEffect } from 'react'
import { Footer } from '@/components/Footer'
import { IrisButton, MintCard } from '@/components/BrandPatterns'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const CAL_LINK = 'titus-nana-quayson-in7wsy/30min'
const CAL_NAMESPACE = 'comply-demo'

function useCalEmbed() {
  useEffect(() => {
    /* eslint-disable */
    ;(function (C: any, A: string, L: string) {
      const p = function (a: any, ar: any) { a.q.push(ar) }
      const d = C.document
      C.Cal = C.Cal || function () {
        const cal = C.Cal
        const ar = arguments
        if (!cal.loaded) {
          cal.ns = {}
          cal.q = cal.q || []
          d.head.appendChild(d.createElement('script')).src = A
          cal.loaded = true
        }
        if (ar[0] === L) {
          const api: any = function () { p(api, arguments) }
          const namespace = ar[1]
          api.q = api.q || []
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api
            p(cal.ns[namespace], ar)
            p(cal, ['initNamespace', namespace])
          } else p(cal, ar)
          return
        }
        p(cal, ar)
      }
    })(window, 'https://app.cal.com/embed/embed.js', 'init')

    const Cal = (window as any).Cal
    Cal('init', CAL_NAMESPACE, { origin: 'https://app.cal.com' })
    Cal.ns[CAL_NAMESPACE]('inline', {
      elementOrSelector: '#ifu-comply-demo-cal',
      config: { layout: 'month_view', useSlotsViewOnSmallScreen: true, theme: 'dark' },
      calLink: CAL_LINK,
    })
    Cal.ns[CAL_NAMESPACE]('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view' })
    /* eslint-enable */
  }, [])
}

export default function ComplyDemoPageClient() {
  useCalEmbed()
  return (
    <>
      <div className="info-bar">
        <div className="info-bar-inner">
          <div className="info-bar-left">
            <a href="mailto:info@ifulabs.com" className="info-bar-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1 4L6 7L11 4" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              info@ifulabs.com
            </a>
            <div className="info-bar-sep" />
            <a href="https://aws.amazon.com/partners/" target="_blank" rel="noopener" className="info-bar-item">
              AWS Partner Network Member
            </a>
          </div>
          <div className="info-bar-right">
            <a href={PORTAL_URL} className="info-bar-item">Client portal →</a>
          </div>
        </div>
      </div>

      <nav>
        <a href="/" className="logo">
          <img src="/logos/white.svg" alt="iFu Labs" style={{ height: '34px', width: 'auto' }} />
        </a>
        <ul className="nav-links">
          <li><a href="/services">Services</a></li>
          <li><a href="/#methodology">Methodology</a></li>
          <li><a href="/#products">Products</a></li>
          <li><a href="/for-startups">For Startups</a></li>
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
        </ul>
        <div className="nav-actions">
          <a href="/schedule-consultation" className="btn-outline">Talk to us</a>
          <a href={PORTAL_URL} className="btn-solid">Client portal →</a>
        </div>
      </nav>

      <section className="demo-hero">
        <div className="demo-hero-inner">
          <div className="demo-hero-left">
            <div className="demo-eyebrow">
              <span className="demo-eyebrow-dot" />
              iFu Comply · Product Demo
            </div>
            <h1 className="demo-hero-title">
              Compliance<br/><em>Automation.</em>
            </h1>
            <p className="demo-hero-sub">
              Automated SOC 2, ISO 27001, and GDPR evidence collection, control monitoring, and audit-ready PDF exports.
            </p>
            <ul className="demo-feature-list">
              {[
                'Daily automated AWS control checks',
                'AI-powered gap explanations & fix steps',
                'One-click evidence pack PDF',
                'Vendor risk & cert expiry tracking',
                'Regulatory change monitoring',
              ].map(f => <li key={f}>{f}</li>)}
            </ul>
            <div className="demo-price">From <strong>$299</strong> / month · or add to your retainer</div>
            <div className="demo-hero-actions">
              <IrisButton href={`${PORTAL_URL}/onboarding?product=comply&plan=starter`}>
                Start free trial
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </IrisButton>
              <a href="#demo-cal" className="btn-cta ghost">Request a demo</a>
            </div>
          </div>
          <div className="demo-hero-right">
            <div className="demo-preview-card">
              <div className="demo-preview-head">
                <span className="demo-preview-dot" />
                <span className="demo-preview-dot" style={{ background: 'var(--accent)' }} />
                <span className="demo-preview-dot" />
                <span className="demo-preview-title">iFu Comply · SOC 2</span>
              </div>
              <div className="demo-preview-body">
                {[
                  'Daily automated AWS control checks',
                  'AI-powered gap explanations & fix steps',
                  'One-click evidence pack PDF',
                  'Vendor risk & cert expiry tracking',
                  'Regulatory change monitoring',
                ].map(label => (
                  <div key={label} className="demo-preview-row">
                    <span className="demo-preview-label">{label}</span>
                    <span className="demo-preview-status demo-preview-status--pass">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-cal-section" id="demo-cal">
        <div className="demo-cal-inner">
          <div className="section-eyebrow">Request a demo</div>
          <h2 className="section-title">Pick a time to see<br/>iFu Comply <em>in action.</em></h2>
          <p className="section-sub">We&apos;ll walk you through automated control checks, evidence collection, and audit-ready exports — using your own AWS account if you&apos;d like.</p>
          <div id="ifu-comply-demo-cal" className="demo-cal-embed" />
        </div>
      </section>

      <Footer />
    </>
  )
}
