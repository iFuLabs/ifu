'use client'
import '../../globals.css'
import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SERVICES, getService } from '@/lib/services'

export default function ServiceDetail({ slug }: { slug: string }) {
  const service = getService(slug)

  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [service?.slug])

  if (!service) {
    if (typeof window !== 'undefined') notFound()
    return null
  }

  const related = SERVICES.filter(s => s.slug !== service.slug).slice(0, 3)

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="svc-hero">
        <div className="svc-hero-inner">
          <div className="svc-hero-left">
            <a href="/services" className="svc-breadcrumb">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All services
            </a>
            <div className="svc-hero-meta">
              <span className="svc-hero-num">{service.num}</span>
              <span className="svc-hero-label">{service.label}</span>
            </div>
            <h1 className="svc-hero-title">{service.name}</h1>
            <p className="svc-hero-tagline">{service.tagline}</p>
            <p className="svc-hero-desc">{service.desc}</p>
            <div className="svc-hero-actions">
              <a href="/schedule-consultation" className="btn-cta primary">
                Book a free discovery call
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </a>
              <a href="#pricing" className="btn-cta ghost">See pricing</a>
            </div>
          </div>
          <div className="svc-hero-right">
            <div className="svc-hero-image">
              <img src={service.hero} alt={service.heroAlt} loading="eager" />
              <div className="svc-hero-image-fade" />
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="svc-section svc-section--light reveal">
        <div className="svc-section-inner">
          <div className="section-eyebrow">Outcomes</div>
          <h2 className="section-title">What you&apos;ll walk away with.</h2>
          <div className="svc-outcome-grid">
            {service.outcomes.map((o, i) => (
              <div key={o} className="svc-outcome-card">
                <div className="svc-outcome-num">{String(i + 1).padStart(2, '0')}</div>
                <p>{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we deliver */}
      <section className="svc-section reveal">
        <div className="svc-section-inner svc-two-col">
          <div>
            <div className="section-eyebrow">Scope</div>
            <h2 className="section-title">What we <em>deliver.</em></h2>
            <p className="svc-section-lede">
              Every engagement is scoped in writing before work starts. Nothing in the list below is a rough promise — each item is a concrete deliverable with acceptance criteria.
            </p>
          </div>
          <ul className="svc-deliverables">
            {service.items.map(item => (
              <li key={item}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="var(--accent)" strokeWidth="1.5" />
                  <path d="M5.5 9L8 11.5L12.5 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="svc-section svc-section--light reveal">
        <div className="svc-section-inner">
          <div className="section-eyebrow">How we work</div>
          <h2 className="section-title">Our <em>process.</em></h2>
          <div className="svc-process">
            {service.process.map(p => (
              <div key={p.step} className="svc-process-step">
                <div className="svc-process-num">{p.step}</div>
                <div>
                  <div className="svc-process-title">{p.title}</div>
                  <p className="svc-process-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="svc-section reveal" id="pricing">
        <div className="svc-section-inner svc-pricing-block">
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-title">Fixed scopes, honest timelines.</h2>
          <p className="svc-pricing-blurb">{service.pricingBlurb}</p>
          <div className="svc-pricing-actions">
            <a href="/schedule-consultation" className="btn-cta primary">
              Talk to an engineer
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>
            <a href="/#pricing" className="btn-cta ghost">See all pricing</a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="svc-section svc-section--light reveal">
        <div className="svc-section-inner">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-title">Questions we get asked.</h2>
          <div className="svc-faq">
            {service.faqs.map((f, i) => {
              const isOpen = openFaq === i
              return (
                <div key={f.q} className={`svc-faq-item${isOpen ? ' is-open' : ''}`}>
                  <button type="button" className="svc-faq-q" onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen}>
                    <span>{f.q}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="svc-faq-chev">
                      <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isOpen && <div className="svc-faq-a">{f.a}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Related services */}
      <section className="svc-section reveal">
        <div className="svc-section-inner">
          <div className="section-eyebrow">Also worth a look</div>
          <h2 className="section-title">Related <em>services.</em></h2>
          <div className="svc-related-grid">
            {related.map(r => (
              <a key={r.slug} href={`/services/${r.slug}`} className="svc-related-card">
                <div className="svc-related-image">
                  <img src={r.hero} alt={r.heroAlt} loading="lazy" />
                </div>
                <div className="svc-related-body">
                  <div className="svc-related-meta">
                    <span className="svc-related-num">{r.num}</span>
                    <span className="svc-related-label">{r.label}</span>
                  </div>
                  <div className="svc-related-title">{r.name}</div>
                  <div className="svc-related-desc">{r.desc}</div>
                  <div className="svc-related-cta">Explore service →</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="svc-cta-band reveal">
        <div className="svc-cta-band-inner">
          <h2>Let&apos;s talk about your<br/>AWS infrastructure.</h2>
          <p>Book a free 30-minute discovery call. No commitment, no sales pitch — just honest advice from engineers who&apos;ve seen it all.</p>
          <div className="svc-cta-band-actions">
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

