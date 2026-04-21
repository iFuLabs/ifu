'use client'
import '../globals.css'
import { useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SERVICES } from '@/lib/services'

export default function ServicesPageClient() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))

    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1))
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="services-hero">
        <div className="services-hero-inner">
          <div className="section-eyebrow">Consultancy Services</div>
          <h1 className="services-hero-title">
            Expert-led services across<br/>
            your entire <em>AWS stack.</em>
          </h1>
          <p className="services-hero-sub">
            iFu Labs engineers embed with your team, deliver measurable outcomes, and leave you self-sufficient.
          </p>
          <div className="services-hero-nav">
            {SERVICES.map(s => (
              <a key={s.slug} href={`/services/${s.slug}`} className="services-hero-chip">
                <span className="services-hero-chip-num">{s.num}</span>
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Service cards grid */}
      <section className="services-grid-section reveal">
        <div className="services-grid-inner">
          {SERVICES.map(s => (
            <a key={s.slug} href={`/services/${s.slug}`} id={s.slug} className="services-grid-card">
              <div className="services-grid-image">
                <img src={s.hero} alt={s.heroAlt} loading="lazy" />
              </div>
              <div className="services-grid-body">
                <div className="services-grid-meta">
                  <span className="services-grid-num">{s.num}</span>
                  <span className="services-grid-label">{s.label}</span>
                </div>
                <h2 className="services-grid-title">{s.name}</h2>
                <p className="services-grid-desc">{s.desc}</p>
                <ul className="services-grid-items">
                  {s.items.slice(0, 3).map(i => <li key={i}>{i}</li>)}
                </ul>
                <div className="services-grid-cta">Explore service →</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="section reveal" style={{ paddingBottom: '120px' }}>
        <div className="services-cta">
          <h2 className="section-title">Let&apos;s talk about your<br/>AWS infrastructure.</h2>
          <p className="section-sub">Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.</p>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: '32px' }}>
            <a href="/schedule-consultation" className="btn-cta primary">
              Book a free discovery call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
            <a href="mailto:info@ifulabs.com" className="btn-cta ghost">Email us directly</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
