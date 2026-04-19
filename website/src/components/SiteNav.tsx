'use client'
import { useEffect, useRef, useState } from 'react'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'

const SECONDARY_SERVICES = [
  { slug: 'compliance-security', label: 'Compliance', name: 'Compliance & Security', desc: 'SOC 2, ISO 27001, GDPR, and HIPAA readiness — evidence collection, gap remediation, and audit preparation end-to-end.' },
  { slug: 'cloud-migration',     label: 'Migration',  name: 'Cloud Migration',       desc: 'On-premise to AWS, workload re-platforming, or cross-cloud migrations. Zero surprise downtime.' },
  { slug: 'eks-ecs',             label: 'Containers', name: 'EKS & ECS Engineering', desc: 'We design, build, and secure Kubernetes clusters on AWS — from architecture to production-grade operations.' },
  { slug: 'devops-cicd',         label: 'DevOps',     name: 'DevOps & CI/CD',        desc: 'Infrastructure as code, deployment pipelines, and platform engineering. Fast, reliable, and auditable delivery.' },
  { slug: 'managed-services',    label: 'Managed',    name: 'Ongoing AWS Support',   desc: 'Retainer-based support. We act as your embedded cloud team — monitoring, incident response, and quarterly reviews.' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const wrapRef = useRef<HTMLLIElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 150) }
  const openNow = () => { cancelClose(); setOpen(true) }

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

      <nav className={scrolled ? 'scrolled' : ''}>
        <a href="/" className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="logo-name">iFu Labs</span>
        </a>
        <ul className="nav-links">
          <li
            ref={wrapRef}
            className={`nav-has-mega${open ? ' is-open' : ''}`}
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
          >
            <a
              href="/services"
              className="nav-mega-trigger"
              aria-haspopup="true"
              aria-expanded={open}
              onClick={(e) => {
                // First interaction opens the menu without navigating.
                // Second click (or a click while open) proceeds to /services.
                if (!open) { e.preventDefault(); setOpen(true) }
              }}
            >
              Services
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="nav-caret">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <div className="mega-menu" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
              <div className="mega-menu-inner">
                <a href="/services/cost-optimisation" className="mega-feature" onClick={() => setOpen(false)}>
                  <div className="mega-feature-label">FinOps</div>
                  <div className="mega-feature-title">Cost Optimisation</div>
                  <div className="mega-feature-desc">We audit your AWS spend, identify waste, and implement Savings Plans. Average client saves 25–40% within 30 days.</div>
                  <div className="mega-feature-cta">Explore service →</div>
                </a>
                <div className="mega-grid">
                  {SECONDARY_SERVICES.map(s => (
                    <a
                      key={s.slug}
                      href={`/services/${s.slug}`}
                      className="mega-item"
                      onClick={() => setOpen(false)}
                    >
                      <div className="mega-item-label">{s.label}</div>
                      <div className="mega-item-title">{s.name}</div>
                      <div className="mega-item-desc">{s.desc}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </li>
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
    </>
  )
}
