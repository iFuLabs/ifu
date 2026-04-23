'use client'
import '../globals.css'
import { useEffect, useMemo, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { IrisButton, MintCard } from '@/components/BrandPatterns'

// Scroll-reveal — same pattern as the homepage so animations feel consistent.
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal, .reveal-grid').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

// Pretty-print USD without trailing ".00" for whole numbers.
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function ForStartupsPageClient() {
  useScrollReveal()

  // Savings calculator state. Default $5k/mo is a realistic Series A AWS bill.
  // Range mirrors what Cloudvisor uses, but the savings formula is tied to
  // our own claim ("25–40% within 30 days") — no made-up reseller discount.
  const [monthly, setMonthly] = useState(5000)
  const savings = useMemo(() => {
    const annual = monthly * 12
    const low = Math.round(annual * 0.25)
    const high = Math.round(annual * 0.40)
    return { annual, low, high, monthlyLow: Math.round(monthly * 0.25), monthlyHigh: Math.round(monthly * 0.40) }
  }, [monthly])

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot"></div>
            AWS Partner Network · Built for startups
          </div>
          <h1>
            Scale faster on AWS<br/>
            with a partner built<br/>
            for <em>startups.</em>
          </h1>
          <p className="hero-sub">
            iFu Labs helps startups cut AWS costs, ship reliably, migrate without downtime,
            and unlock AWS Activate credits — with no extra fees and full control of your
            AWS accounts.
          </p>
          <div className="hero-actions">
            <IrisButton href="/schedule-consultation">
              Book a free discovery call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </IrisButton>
            <a href="#how-we-help" className="btn-cta ghost">See how we help</a>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Read-only access, always
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              No lock-in contracts
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              You own all the IaC we write
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card-stack">
            {[
              { icon: '🚀', title: 'Seed-stage launch', desc: 'Production-ready AWS account in under a week', badge: 'Fast start', badgeStyle: { background: 'var(--plum)', color: 'var(--white)' } },
              { icon: '💳', title: 'AWS Activate credits', desc: 'We guide you to up to $100K in AWS credits', badge: 'Startup perk', badgeStyle: { background: 'var(--iris)', color: 'var(--white)' } },
              { icon: '💰', title: 'Cost audit', desc: 'Typical client saves 25–40% within 30 days', badge: 'Outcome', badgeStyle: { background: 'var(--iris)', color: 'var(--white)' } },
              { icon: '🛡️', title: 'SOC 2 readiness', desc: 'Audit-ready in 6 weeks, not 6 months', badge: 'Compliance', badgeStyle: { background: 'var(--plum)', color: 'var(--white)' } },
            ].map(card => (
              <div key={card.title} className="hero-card">
                <div className="hero-card-icon" style={{ background: 'var(--surface)' }}>{card.icon}</div>
                <div className="hero-card-body">
                  <div className="hero-card-title">{card.title}</div>
                  <div className="hero-card-desc">{card.desc}</div>
                </div>
                <span className="hero-card-badge" style={card.badgeStyle}>{card.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero stats strip — the big-number credibility row from Cloudvisor */}
      <div className="stats-strip reveal">
        {[
          { num: '25–40%', label: 'Average AWS savings in 30 days' },
          { num: '$100K', label: 'In AWS Activate credits unlocked' },
          { num: '6 weeks', label: 'From zero to SOC 2 audit-ready' },
          { num: '0 downtime', label: 'On production EKS migrations' },
        ].map(s => (
          <div key={s.label} className="stats-strip-item">
            <div className="stats-strip-num">{s.num}</div>
            <div className="stats-strip-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* APN trust strip */}
      <div className="apn-strip">
        {[
          { icon: '🔶', text: 'AWS Partner Network Member' },
          { icon: '🔒', text: 'Read-only infrastructure access' },
          { icon: '✅', text: 'SOC 2 compliant practice' },
          { icon: '💳', text: 'Help clients unlock $100K AWS credits' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 && <div className="apn-sep" />}
            <div className="apn-item">
              <span className="apn-item-icon">{item.icon}</span> {item.text}
            </div>
          </div>
        ))}
      </div>

      {/* Pain points — the empathy section missing from the homepage */}
      <section className="section reveal" id="challenges">
        <div className="section-eyebrow">Challenges</div>
        <h2 className="section-title">The biggest problems startups<br/>hit on <em>AWS.</em></h2>
        <p className="section-sub">We hear the same five things from every founder who books a call. If any of these sound familiar, you&apos;re in the right place.</p>

        <div className="pains-grid reveal-grid">
          {[
            { icon: '👤', title: 'No in-house cloud or DevOps expertise', desc: "Early teams rarely have a cloud architect. Running AWS securely and reliably takes time founders don't have." },
            { icon: '📈', title: 'AWS bills that keep creeping up', desc: 'Wrong instance sizes, forgotten resources, and no anomaly alerting quietly inflate spend every month.' },
            { icon: '⚠️', title: 'Migrations that feel too risky to start', desc: 'You want AWS scalability but fear downtime, data loss, or a botched cutover — and there are too many migration paths to evaluate.' },
            { icon: '🧩', title: '200+ AWS services to choose from', desc: 'Picking the right architecture without a senior engineer in the room is a coin flip with your roadmap on the line.' },
            { icon: '🔐', title: 'Compliance pressure from your first enterprise deal', desc: "Prospects ask for SOC 2, ISO 27001, or HIPAA before they'll sign — and you need it yesterday." },
            { icon: '🤖', title: 'Unclear path to AI, data, and modernization', desc: 'You know you should be shipping AI features and using your data better. You just don&apos;t know where to start on AWS.' },
          ].map(p => (
            <div key={p.title} className="pain-card">
              <div className="pain-card-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* How we help — benefit-led, not discipline-led */}
      <section className="section reveal" id="how-we-help">
        <div className="section-eyebrow">How we help</div>
        <h2 className="section-title">What a startup actually gets<br/>from <em>iFu Labs.</em></h2>
        <p className="section-sub">Whether you&apos;re already on AWS or planning to migrate, we give your team senior AWS expertise, credits, and cost wins — without you hiring a platform team.</p>

        <div className="outcomes-grid reveal-grid">
          <div className="outcome-card">
            <div className="outcome-card-icon">💰</div>
            <h3>Measurable AWS cost savings</h3>
            <p>A full spend audit, rightsizing, Savings Plans, and anomaly alerts — <strong>typical clients save 25–40% within 30 days</strong> without touching their application.</p>
          </div>
          <div className="outcome-card">
            <div className="outcome-card-icon">🧑‍💻</div>
            <h3>A dedicated AWS-certified engineer</h3>
            <p>Not a ticket queue. A named engineer — Solutions Architect or DevOps Engineer certified — who knows your stack, joins your Slack, and answers like a teammate.</p>
          </div>
          <div className="outcome-card">
            <div className="outcome-card-icon">💳</div>
            <h3>AWS Activate credits, guided</h3>
            <p>We help eligible startups apply for and structure <strong>up to $100,000 in AWS credits</strong>, and make sure none of it goes to waste on misconfigured workloads.</p>
          </div>
          <div className="outcome-card">
            <div className="outcome-card-icon">☁️</div>
            <h3>Migrations without the drama</h3>
            <p>On-prem, Heroku, or another cloud to AWS — <strong>zero surprise downtime</strong>. Dependency mapping, wave planning, cutover runbooks, and AWS MAP funding support.</p>
          </div>
          <div className="outcome-card">
            <div className="outcome-card-icon">🛡️</div>
            <h3>SOC 2 / ISO in weeks, not quarters</h3>
            <p>Gap assessment, control remediation, evidence pack, and auditor liaison — delivered end-to-end so you can close that enterprise deal.</p>
          </div>
          <div className="outcome-card">
            <div className="outcome-card-icon">🤖</div>
            <h3>An honest AI &amp; data roadmap</h3>
            <p>We validate use cases, modernize your data layer, and set up cloud-native foundations — so &ldquo;ship AI features&rdquo; actually has a plan behind it.</p>
          </div>
        </div>
      </section>

      {/* AWS Credits feature block — the single biggest startup hook */}
      <section className="reveal" style={{ padding: '0 32px', margin: '96px auto', maxWidth: '1200px' }}>
        <div className="section-eyebrow" style={{ textAlign: 'center', margin: '0 auto 24px' }}>AWS Activate</div>
        <h2 className="section-title" style={{ textAlign: 'center' }}>Get up to <em>$100,000</em> in<br/>AWS Activate credits.</h2>
        <p className="section-sub" style={{ textAlign: 'center' }}>As an AWS Partner, we help eligible startups apply, qualify, and deploy Activate credits the right way — so every dollar compounds your runway.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '48px' }}>
          <MintCard
            icon={<span style={{ fontSize: '24px' }}>💳</span>}
            title="Up to $100K in AWS credits"
            description="We guide eligible startups through the AWS Activate program to unlock maximum credits and structure usage for optimal runway extension."
          />
          <MintCard
            icon={<span style={{ fontSize: '24px' }}>🎯</span>}
            title="Smart credit deployment"
            description="Architecture review ensures credits aren't wasted on oversized resources. We help you build efficiently before credits expire."
          />
          <MintCard
            icon={<span style={{ fontSize: '24px' }}>📊</span>}
            title="Cost monitoring included"
            description="Anomaly alerts and monthly reviews keep you informed. Know exactly how credits are being used and when they'll run out."
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <IrisButton href="/schedule-consultation">
            Talk to an AWS engineer
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </IrisButton>
        </div>
      </section>

      <div className="divider" />

      {/* Savings calculator */}
      <section className="section reveal" id="calculator">
        <div className="section-eyebrow">Savings calculator</div>
        <h2 className="section-title">See what an iFu Labs<br/>cost audit could <em>save you.</em></h2>
        <p className="section-sub">Drag the slider to your current monthly AWS spend. The range is based on our typical client outcome — a 25–40% reduction within the first 30 days.</p>

        <div className="calc-wrap">
          <div className="calc-left">
            <label htmlFor="calc-slider">Your monthly AWS spend</label>
            <div className="calc-value">{fmt(monthly)}<span style={{ fontSize: '16px', color: 'var(--muted)', fontWeight: 400 }}> /month</span></div>
            <input
              id="calc-slider"
              className="calc-slider"
              type="range"
              min={500}
              max={100000}
              step={500}
              value={monthly}
              onChange={(e) => setMonthly(parseInt(e.target.value, 10))}
              aria-label="Monthly AWS spend"
            />
            <div className="calc-slider-labels">
              <span>$500</span>
              <span>$100,000</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted2)', marginTop: '18px', lineHeight: 1.5 }}>
              Range based on typical client outcomes. Your results depend on current
              architecture, commitment terms, and usage patterns — we&apos;ll confirm a
              number before any commitment.
            </p>
          </div>

          <div className="calc-right">
            <div className="calc-result-label">Estimated annual savings</div>
            <div className="calc-result-range">{fmt(savings.low)} – {fmt(savings.high)}</div>
            <div className="calc-result-sub">Off your current AWS bill, typically captured in the first 30 days after our audit.</div>
            <div className="calc-result-rows">
              <div className="calc-result-row">
                <span>Current annual AWS spend</span>
                <span>{fmt(savings.annual)}</span>
              </div>
              <div className="calc-result-row">
                <span>Monthly savings (25–40%)</span>
                <span>{fmt(savings.monthlyLow)} – {fmt(savings.monthlyHigh)}</span>
              </div>
              <div className="calc-result-row">
                <span>Annual savings</span>
                <span>{fmt(savings.low)} – {fmt(savings.high)}</span>
              </div>
            </div>
            <IrisButton href="/schedule-consultation">
              Book a free cost audit
            </IrisButton>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Proof tiles — concrete, numeric outcomes */}
      <section className="section reveal" id="proof">
        <div className="section-eyebrow">Real outcomes</div>
        <h2 className="section-title">Results from startups<br/>scaling with <em>iFu Labs.</em></h2>
        <p className="section-sub">Small sample, real numbers. Every engagement gets a before/after delta we can point to.</p>

        <div className="proof-tiles reveal-grid">
          {[
            { num: '$1.2K/mo', label: 'Idle AWS resources found in week one of a cost audit' },
            { num: '6 weeks', label: 'Seed-stage SaaS from zero to SOC 2 audit-ready' },
            { num: '14 services', label: 'Migrated to EKS with zero production downtime' },
            { num: '40 → 6 min', label: 'Deploy time reduced on a monorepo CI/CD rebuild' },
          ].map(t => (
            <div key={t.label} className="proof-tile">
              <div className="proof-tile-num">{t.num}</div>
              <div className="proof-tile-label">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* <div className="divider" /> */}

      {/* Testimonials
          ─────────────────────────────────────────────────────────────
          TODO: Replace these with real, attributed quotes once
          permission is granted. The shapes below are intentionally
          anonymized (role + stage only) so we never ship a fabricated
          customer name. Keep the structure — just fill in real quotes,
          names, companies and roles before launch. */}
      {/* <section className="section reveal" id="testimonials">
        <div className="section-eyebrow">What founders say</div>
        <h2 className="section-title">Don&apos;t just take our word<br/><em>for it.</em></h2>
        <p className="section-sub">A few things clients have told us after an engagement. (Placeholders shown here — real attributed quotes replace these before each launch.)</p>

        <div className="testimonials-grid reveal-grid" style={{ marginTop: '48px' }}>
          {[
            { quote: 'They paid for themselves inside the first week. The audit flagged idle resources we&rsquo;d forgotten about and a Savings Plan we&rsquo;d never have found on our own.', role: 'Founding engineer · Series A B2B SaaS' },
            { quote: 'We needed SOC 2 to close a deal and had six weeks. iFu Labs ran the whole thing &mdash; controls, evidence pack, auditor calls. We signed the customer.', role: 'CTO · Seed-stage healthtech' },
            { quote: 'Best money we spent post-fundraise. Zero-downtime migration to EKS, clean IaC handover, and they actually taught us how to run it.', role: 'Head of engineering · Series B fintech' },
          ].map((t, i) => (
            <div key={i} className="testimonial">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: `&ldquo;${t.quote}&rdquo;` }} />
              <div className="testimonial-author">
                <div className="t-avatar" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
                  {['A', 'B', 'C'][i]}
                </div>
                <div>
                  <div className="t-name">(Placeholder)</div>
                  <div className="t-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section> */}

      {/* <div className="divider" /> */}

      {/* FAQ — addresses the #1 objections before the final CTA */}
      <section className="section reveal" id="faq">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="section-title">Answers to the questions<br/>every founder <em>asks first.</em></h2>
        <p className="section-sub">Still unsure? Book a 30-minute call — no sales pitch, just honest advice.</p>

        <div className="faq-list">
          {[
            {
              q: 'Will iFu Labs have access to our AWS account?',
              a: 'Only read-only by default. We request read-only IAM roles scoped to exactly what the engagement requires — billing for cost work, specific resources for architecture work. We never ask for console passwords, root credentials, or write access to production. If a change needs to be made, we hand you a pull request with the IaC and you apply it.',
            },
            {
              q: 'Are we locked into a contract?',
              a: 'No. Managed services retainers are month-to-month and you can cancel any time. Project engagements are fixed-scope with a clear deliverable. Every line of infrastructure we write is yours — Terraform, CDK, runbooks, diagrams — so you can walk away and run it yourself.',
            },
            {
              q: 'How do the AWS Activate credits actually work?',
              a: 'AWS offers startups between $1,000 and $100,000 in credits through the Activate program depending on stage and investor backing. As an AWS Partner, we help eligible startups apply, structure the credit usage so it compounds your runway instead of expiring, and plan architecture around the credit window.',
            },
            {
              q: 'We&rsquo;re pre-revenue — is this worth it for us?',
              a: 'Often yes, especially for the credits and architecture pieces. A one-hour architecture review early on prevents $50k of rebuild cost later. If a full engagement isn&rsquo;t the right fit today, we&rsquo;ll say so on the discovery call and point you to the self-serve tools instead.',
            },
            {
              q: 'How do you price engagements?',
              a: 'Three shapes. Fixed-scope projects (a cost audit, a SOC 2 sprint) are priced per project. Managed retainers start at $2,500/month, cancel any time. And our SaaS tools (iFu Comply, iFu Costless) start at $199/month self-serve. The discovery call is free and scope comes out of that conversation.',
            },
            {
              q: 'How is this different from hiring a freelance DevOps engineer?',
              a: 'A freelance engineer gives you 40 hours of one person. We give you a team — AWS-certified engineers with exposure to hundreds of AWS accounts, a playbook for SOC 2, a cost audit framework, and partner-only access to AWS programs like MAP funding. Same day-rate range, much more leverage.',
            },
            {
              q: 'How fast can we start?',
              a: 'Discovery call within 48 hours. For self-serve SaaS products, onboarding is immediate. For consulting engagements, kickoff is typically within one to two weeks once scope is signed off.',
            },
          ].map(item => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="faq-item-body" dangerouslySetInnerHTML={{ __html: `<p>${item.a}</p>` }} />
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA band — reused pattern from homepage */}
      <section className="reveal" id="contact" style={{ padding: '0 32px', margin: '80px auto', maxWidth: '1200px' }}>
        <div style={{
          background: 'var(--brand)',
          borderRadius: '20px',
          padding: 'clamp(40px, 6vw, 64px) clamp(28px, 5vw, 56px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px, 4vw, 48px)',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1, flex: '1 1 420px', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.02em',
              marginBottom: '20px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80' }} />
              Free · 30 minutes · No sales pitch
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Start scaling on AWS<br />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontWeight: 400 }}>
                the smart way.
              </span>
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.6,
              maxWidth: '560px',
              marginBottom: '0',
            }}>
              Tell us where you are and where you want to be. We&apos;ll share an honest read
              on scope, credits you qualify for, and whether we&apos;re the right fit — before
              you commit to anything.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', flex: '0 1 auto' }}>
            <IrisButton href="/schedule-consultation">
              Book a free discovery call
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IrisButton>
            <a
              href="mailto:info@ifulabs.com?subject=Startup%20enquiry"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 28px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Or email us directly
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
