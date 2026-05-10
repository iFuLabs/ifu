'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

// Inline SVG icons — keeping them small and consistent
const Icons = {
  Shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  Trend: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>,
  Gauge: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>,
  Bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Cube: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  List: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Plug: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/></svg>,
  Zap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

export default function HomePage() {
  useReveal()

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div>
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-dot" />
            Cloud operations · by iFU Labs
          </div>
          <h1>
            The cloud dashboard<br/>your CTO <em>actually opens.</em>
          </h1>
          <p className="hero-sub">
            Ghara connects to your AWS account once and answers the two questions that won't go away — <strong>are we compliant, and are we wasting money</strong>. One read-only connection. One Cloud Health Score. One ranked action queue.
          </p>
          <div className="hero-actions">
            <a href={`${APP_URL}/signup`} className="btn-primary">
              Start 7-day free trial →
            </a>
            <Link href="/demo" className="btn-secondary">
              Book a demo
            </Link>
          </div>
          <div className="hero-trust">
            {[
              '7 days free, cancel anytime',
              'Connect in under 5 minutes',
              'Read-only access, always',
            ].map(item => (
              <div key={item} className="trust-item">
                <svg viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="hero-cards">
          {[
            { title: 'Cloud Health Score: 84', desc: 'One number — compliance, cost, and security weighted into a single posture metric', badge: 'Live dashboard' },
            { title: 'SOC 2 in 6 weeks', desc: 'Automated evidence, AI remediation, drift alerts across 5 frameworks', badge: 'Compliance' },
            { title: '$1,247/mo waste detected', desc: 'Idle resources, rightsizing, anomaly detection, Kubernetes', badge: 'Cost' },
            { title: 'Built by iFU Labs', desc: 'AWS Partner Network — we run cloud audits for a living', badge: 'Credibility' },
          ].map(card => (
            <div key={card.title} className="hero-card">
              <div>
                <div className="hero-card-title">{card.title}</div>
                <div className="hero-card-desc">{card.desc}</div>
              </div>
              <span className="hero-card-badge">{card.badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────── */}
      <section className="trust-bar reveal" style={{ padding: '32px 24px', borderTop: '1px solid rgba(51,6,61,0.08)', borderBottom: '1px solid rgba(51,6,61,0.08)', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(51,6,61,0.55)', margin: 0 }}>
            Built on
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', opacity: 0.7 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>AWS Partner Network</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>Anthropic Claude</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>OpenCost</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>Resend</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#33063D' }}>Slack</span>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">The problem</div>
        <h2 className="section-title">
          Your AWS account is a <em>black box.</em>
        </h2>
        <p className="section-sub">
          A customer asks for SOC 2. Your bill triples overnight. An auditor flags GuardDuty. Three problems, three tools, three vendors. You stop checking because every dashboard tells you something different is broken.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 48 }}>
          {[
            {
              title: 'Audits surprise you',
              desc: 'Controls drift silently. A pass yesterday is a fail today. You only find out when the auditor sends the report — usually two weeks before the deadline.',
            },
            {
              title: 'Cloud bills compound silently',
              desc: 'Engineers spin up resources, then leave. Idle EBS, unattached load balancers, oversized instances. By the time finance asks, you\'re paying $40k/year for resources nobody owns.',
            },
            {
              title: 'You\'re paying for three tools that don\'t talk',
              desc: 'Vanta for compliance. Vantage for cost. CloudWatch for security. $35k+/year, three logins, three integrations, and zero of them tells you whether your cloud is actually healthy.',
            },
          ].map(p => (
            <div key={p.title} style={{ padding: 28, borderRadius: 14, background: '#fff', border: '1px solid rgba(51,6,61,0.1)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#33063D', marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(51,6,61,0.7)', margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="section reveal" style={{ background: '#FAFAFA' }}>
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">
          From signup to insights<br/>in <em>under 10 minutes.</em>
        </h2>
        <p className="section-sub">
          No procurement cycle. No engineering team to deploy it. Connect AWS once, get answers immediately.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginTop: 56 }}>
          {[
            { step: '01', icon: Icons.Plug, title: 'Connect AWS', desc: 'One CloudFormation Quick Launch creates a read-only IAM role. We never get write access. 4 minutes, no DevOps required.' },
            { step: '02', icon: Icons.Zap, title: 'We scan your account', desc: 'Compliance controls across 5 frameworks. Cost waste across 8 categories. Kubernetes via OpenCost. Findings stream in live as we work.' },
            { step: '03', icon: Icons.Eye, title: 'See your Cloud Health Score', desc: 'A composite 0–100 score. A ranked action queue. Dollar values on every fix. Share the score with your board, share fixes with your team.' },
          ].map(s => (
            <div key={s.step} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#33063D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: 'rgba(51,6,61,0.4)' }}>{s.step}</span>
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 600, color: '#33063D', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(51,6,61,0.7)', margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cloud Health Score showcase ───────────────────────────────── */}
      <section className="section reveal" id="cloud-health-score">
        <div className="section-eyebrow">Cloud Health Score</div>
        <h2 className="section-title">
          One number for your <em>entire AWS posture.</em>
        </h2>
        <p className="section-sub">
          The Cloud Health Score is a 0–100 composite of your compliance posture, cost efficiency, and security findings. It moves week over week. Your board tracks it. Your team fixes it. No more "is our cloud healthy?" debates.
        </p>

        <div style={{ marginTop: 56, padding: 48, borderRadius: 20, background: 'linear-gradient(135deg, #33063D 0%, #1a0320 100%)', color: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 56, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#DAC0FD" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${84 * 2.64} 264`}/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 56, fontWeight: 700 }}>84</span>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>Cloud Health</span>
                </div>
              </div>
              <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>↑ 6 points this week</p>
            </div>

            <div>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  { label: 'Compliance posture', score: 88, weight: '40%', desc: 'SOC 2: 92%  ·  ISO 27001: 84%  ·  PCI: 89%' },
                  { label: 'Cost efficiency', score: 78, weight: '30%', desc: '$1,247/mo waste detected · 12 idle resources' },
                  { label: 'Security findings', score: 86, weight: '30%', desc: 'GuardDuty active · 3 medium · 0 critical' },
                ].map(b => (
                  <div key={b.label} style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{b.label}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5 }}>{b.weight} weight</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#DAC0FD' }}>{b.score}</span>
                    </div>
                    <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">What you get</div>
        <h2 className="section-title">Everything you'd buy<br/>from <em>three vendors.</em></h2>
        <p className="section-sub">
          Compliance automation. Cost optimization. Security posture. One product, one connection, one bill.
        </p>

        <div className="features-grid">
          {[
            { icon: Icons.Shield, title: '5 compliance frameworks', desc: 'SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS — 77 controls fully automated. AI-powered remediation guidance for every failing check.' },
            { icon: Icons.Trend, title: '8 cost waste types', desc: 'Idle EBS, unattached EIPs, idle NAT gateways, oversized RDS, unused load balancers, abandoned snapshots, idle EC2, untagged spend. Each finding shows monthly and annual savings.' },
            { icon: Icons.Cube, title: 'Kubernetes cost', desc: 'OpenCost integration shows cost per namespace, per workload, per pod. Detect idle pods, oversized requests, unused PVCs across EKS, GKE, AKS, or self-managed clusters.' },
            { icon: Icons.Bell, title: 'Drift + anomaly alerts', desc: 'Slack and email alerts the moment a control flips from pass to fail, or when daily spend deviates from baseline. Never surprised in an audit again.' },
            { icon: Icons.List, title: 'Unified action queue', desc: 'One ranked list across both engines. Compliance gaps and cost waste, sorted by impact. CLI commands to fix on the spot. Snooze, assign, or mark done.' },
            { icon: Icons.Gauge, title: 'Audit-ready evidence', desc: 'Every control links to the underlying AWS configuration, screenshot, and timestamp. Auditor read-only role available on Scale tier.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: 'rgba(138,99,230,0.1)', color: '#8A63E6', marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────────────────── */}
      <section className="section reveal" style={{ background: '#FAFAFA' }}>
        <div className="section-eyebrow">Why Ghara</div>
        <h2 className="section-title">
          One product instead of <em>three subscriptions.</em>
        </h2>
        <p className="section-sub">
          The status quo is a $35k+ stack of tools that don't talk to each other. Ghara replaces it with a single platform.
        </p>

        <div style={{ marginTop: 48, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, background: '#fff', border: '1px solid rgba(51,6,61,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#33063D', color: '#fff' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Capability</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Vanta / Drata</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Vantage / CloudZero</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600, background: '#8A63E6' }}>Ghara</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Compliance automation', true, false, true],
                ['Cost waste detection', false, true, true],
                ['Kubernetes cost (OpenCost)', false, 'partial', true],
                ['Unified Cloud Health Score', false, false, true],
                ['Cross-engine action queue', false, false, true],
                ['Read-only AWS access', true, true, true],
                ['Single connection, single bill', false, false, true],
              ].map(([cap, vanta, vantage, ghara], i) => (
                <tr key={cap as string} style={{ borderTop: i > 0 ? '1px solid rgba(51,6,61,0.06)' : 'none' }}>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#33063D', fontWeight: 500 }}>{cap}</td>
                  {[vanta, vantage, ghara].map((v, j) => (
                    <td key={j} style={{ padding: '14px 20px', textAlign: 'center', background: j === 2 ? 'rgba(138,99,230,0.05)' : 'transparent' }}>
                      {v === true ? <span style={{ color: '#067647', display: 'inline-flex' }}>{Icons.Check}</span> :
                       v === 'partial' ? <span style={{ fontSize: 11, fontWeight: 600, color: '#B54708', background: '#FFFAEB', padding: '2px 8px', borderRadius: 4 }}>partial</span> :
                       <span style={{ color: 'rgba(51,6,61,0.25)', display: 'inline-flex' }}>{Icons.X}</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(51,6,61,0.06)', background: 'rgba(138,99,230,0.03)' }}>
                <td style={{ padding: '16px 20px', fontSize: 13, color: 'rgba(51,6,61,0.6)', fontWeight: 600 }}>Typical annual cost</td>
                <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(51,6,61,0.6)' }}>$24k+</td>
                <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(51,6,61,0.6)' }}>3% of AWS spend</td>
                <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#33063D', background: 'rgba(138,99,230,0.1)' }}>From $5,988</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(51,6,61,0.5)', textAlign: 'center', fontStyle: 'italic' }}>
          Comparison based on publicly listed pricing as of 2026. Vanta starter plan, Vantage spend-based pricing, Ghara Starter tier.
        </p>
      </section>

      {/* ── Built by iFU Labs ─────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">Who built this</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 56, alignItems: 'center', marginTop: 24 }}>
          <div>
            <h2 className="section-title" style={{ fontSize: 38, marginBottom: 24 }}>
              We've spent years<br/>fixing AWS for <em>other people.</em>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(51,6,61,0.75)', marginBottom: 20 }}>
              Ghara is built by <strong>iFU Labs</strong>, an AWS Partner Network consultancy. For years we've helped startups pass SOC 2 audits, cut their AWS bills, and untangle their Kubernetes spend — one engagement at a time.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(51,6,61,0.75)', marginBottom: 28 }}>
              We built Ghara so that the same insights you'd pay us $25k for as a consulting engagement are available continuously, for less than the cost of one consultant week.
            </p>
            <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Visit iFU Labs →
            </a>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { stat: 'AWS Partner', label: 'Network member with active certifications across security, cost, and migration competencies' },
              { stat: '5 frameworks', label: 'SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS — every control mapped to AWS configuration' },
              { stat: '77 controls', label: 'Automated checks running across your AWS account on every scan' },
              { stat: 'Read-only', label: 'We never modify your AWS account. Every action is yours to take.' },
            ].map(s => (
              <div key={s.stat} style={{ padding: 24, borderRadius: 12, background: '#fff', border: '1px solid rgba(51,6,61,0.1)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: '#33063D', marginBottom: 6 }}>{s.stat}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(51,6,61,0.65)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="section reveal" id="pricing" style={{ background: '#FAFAFA' }}>
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">
          Simple. <em>Transparent.</em>
        </h2>
        <p className="section-sub">
          Three tiers based on AWS spend. No per-seat surprises. 7-day free trial on Growth. Card captured at signup, first charge on day 8. Cancel anytime.
        </p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-tier">Starter</div>
            <div className="pricing-name">For small teams</div>
            <div className="pricing-price">$499</div>
            <div className="pricing-period">per month · up to $10k/mo AWS spend</div>
            <p className="pricing-desc">SOC 2 readiness and waste detection for teams just getting started.</p>
            <ul className="pricing-features">
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>SOC 2 framework (35 controls)</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Cost waste detection</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Weekly scans</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>1 AWS account</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Email support</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start free trial</a>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-tier">Growth · Most popular</div>
            <div className="pricing-name">Full platform</div>
            <div className="pricing-price">$1,299</div>
            <div className="pricing-period">per month · up to $100k/mo AWS spend</div>
            <p className="pricing-desc">Everything to pass audits, cut waste, and ship to enterprise.</p>
            <ul className="pricing-features">
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>All 5 frameworks (77 controls)</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>AI evidence + remediation</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Vendor risk register</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Anomaly detection + Slack alerts</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Kubernetes cost (OpenCost)</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Daily scans · CSV/JSON export</li>
              <li><span style={{ color: '#fff', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Priority email + chat support</li>
            </ul>
            <a href={`${APP_URL}/signup`} className="pricing-cta">Start 7-day free trial</a>
          </div>

          <div className="pricing-card">
            <div className="pricing-tier">Scale</div>
            <div className="pricing-name">Enterprise</div>
            <div className="pricing-price">Custom</div>
            <div className="pricing-period">unlimited AWS spend · multi-account</div>
            <p className="pricing-desc">Custom frameworks, SSO, auditor roles, and a dedicated success engineer.</p>
            <ul className="pricing-features">
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Everything in Growth</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Custom frameworks</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Multi-account AWS</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>SSO / SAML</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Auditor read-only role</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>Dedicated success engineer</li>
              <li><span style={{ color: '#067647', display: 'inline-flex', marginRight: 8 }}>{Icons.Check}</span>SLA-backed support</li>
            </ul>
            <Link href="/demo" className="pricing-cta">Talk to us</Link>
          </div>
        </div>

        <p style={{ marginTop: 32, fontSize: 13, color: 'rgba(51,6,61,0.55)', textAlign: 'center' }}>
          Existing iFU Labs customers? Your Comply or FinOps subscription was grandfathered into Ghara at your existing price. <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8A63E6', fontWeight: 500 }}>Learn more →</a>
        </p>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">Common questions</div>
        <h2 className="section-title">
          Everything you'd ask<br/>on a <em>discovery call.</em>
        </h2>

        <div style={{ maxWidth: 800, margin: '48px auto 0' }}>
          {[
            {
              q: 'What does Ghara see in my AWS account?',
              a: 'We use a read-only IAM role with permissions scoped to specific services — Cost Explorer, IAM, S3 metadata, CloudTrail, GuardDuty, Config, EC2 describe calls, RDS metadata, EKS describe. We never see your S3 object contents, RDS data, or anything in transit. The full IAM policy is in our docs and on the CloudFormation template before you deploy it.',
            },
            {
              q: 'Can Ghara modify anything in my AWS account?',
              a: 'No. The IAM role is read-only by design — no Put*, Update*, Delete*, or Create* permissions anywhere. If a control needs remediation, we tell you what to fix and link to the CLI command or AWS Console action — but you make the change.',
            },
            {
              q: 'How does the 7-day trial work?',
              a: 'Sign up with your email and a credit card. We don't charge during the 7-day trial. On day 8, your card is charged the price of your selected plan ($499 or $1,299/mo). Cancel any time during the trial with one click — no charge.',
            },
            {
              q: 'How is this different from Vanta or Drata?',
              a: 'Vanta and Drata are excellent compliance tools but they don\'t do cost optimization, Kubernetes spend, or unified cloud-health scoring. If you only need compliance and you have $24k+/year to spend, they\'re strong choices. Ghara is for teams who want one platform that covers compliance + cost + security with a single read-only AWS connection.',
            },
            {
              q: 'I already use Vanta. Can I migrate?',
              a: 'Yes — most customers run both for a billing cycle while they validate Ghara\'s controls match. Our framework coverage maps 1:1 with Vanta\'s for SOC 2 and ISO 27001. Once your team is comfortable, cancel Vanta and bank the savings (Ghara Growth is roughly half the price of comparable Vanta plans).',
            },
            {
              q: 'Do you support GCP and Azure?',
              a: 'Not today. We support AWS plus Kubernetes (any cloud, via OpenCost). GCP and Azure are on the roadmap but not committed — we\'d rather be the best AWS tool than a mediocre multi-cloud one.',
            },
            {
              q: 'What happens if I cancel?',
              a: 'Your account moves to read-only — you keep access to historical scans and findings, but new scans pause. Re-enable any time by adding a card again. We never delete your data unless you explicitly ask us to.',
            },
            {
              q: 'Where is Ghara hosted?',
              a: 'AWS us-east-1 with encryption at rest and in transit. Customer data is logically isolated by org_id. We use Anthropic Claude for AI-powered remediation guidance — your AWS configuration is sent to Anthropic only when you click "explain this" on a finding, and never used for training.',
            },
          ].map(faq => (
            <details key={faq.q} style={{ borderBottom: '1px solid rgba(51,6,61,0.1)', padding: '20px 0' }}>
              <summary style={{ fontSize: 16, fontWeight: 600, color: '#33063D', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{faq.q}</span>
                <span style={{ fontSize: 20, color: 'rgba(51,6,61,0.4)', marginLeft: 16 }}>+</span>
              </summary>
              <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: 'rgba(51,6,61,0.7)' }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <div className="cta-band reveal">
        <h2>See what's in your AWS account.</h2>
        <p>4-minute connection. 7-day free trial. Cancel anytime — no charge until day 8.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial →</a>
          <Link href="/demo" className="btn-secondary">Book a demo</Link>
        </div>
      </div>
    </>
  )
}
