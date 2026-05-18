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

// Inline SVG icons — small, consistent, no external dependencies
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
  CheckSm: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
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
              'Read-only AWS access',
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
            { title: 'SOC 2 in 6 weeks', desc: 'Automated evidence, AI remediation, drift alerts across 5 frameworks — 103 controls, multi-region', badge: 'Compliance' },
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
      <section className="trust-bar reveal">
        <div className="trust-bar-inner">
          <p className="trust-bar-label">Built on</p>
          <div className="trust-bar-logos">
            <span>AWS Partner Network</span>
            <span>Anthropic Claude</span>
            <span>OpenCost</span>
            <span>Resend</span>
            <span>Slack</span>
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

        <div className="problem-grid">
          {[
            { title: 'Audits surprise you', desc: "Controls drift silently. A pass yesterday is a fail today. You only find out when the auditor sends the report — usually two weeks before the deadline." },
            { title: 'Cloud bills compound silently', desc: "Engineers spin up resources, then leave. Idle EBS, unattached load balancers, oversized instances. By the time finance asks, you're paying $40k/year for resources nobody owns." },
            { title: "You're paying for three tools that don't talk", desc: 'Vanta for compliance. Vantage for cost. CloudWatch for security. $35k+/year, three logins, three integrations, and zero of them tells you whether your cloud is actually healthy.' },
          ].map(p => (
            <div key={p.title} className="problem-card">
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="section alt reveal">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">
          From signup to insights<br/>in <em>under 10 minutes.</em>
        </h2>
        <p className="section-sub">
          No procurement cycle. No engineering team to deploy it. Connect AWS once, get answers immediately.
        </p>

        <div className="steps-grid">
          {[
            { num: '01', icon: Icons.Plug, title: 'Connect AWS', desc: 'One CloudFormation Quick Launch creates a read-only IAM role. We never get write access. 4 minutes, no DevOps required.' },
            { num: '02', icon: Icons.Zap, title: 'We scan your account', desc: 'Compliance controls across 5 frameworks. Cost waste across 8 categories. Kubernetes via OpenCost. Findings stream in live as we work.' },
            { num: '03', icon: Icons.Eye, title: 'See your Cloud Health Score', desc: 'A composite 0–100 score. A ranked action queue. Dollar values on every fix. Share the score with your board, share fixes with your team.' },
          ].map(s => (
            <div key={s.num} className="step">
              <div className="step-head">
                <div className="step-icon">{s.icon}</div>
                <span className="step-num">{s.num}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
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

        <div className="health-block">
          <div className="health-grid">
            <div className="health-dial">
              <div className="health-dial-svg">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#DAC0FD" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${84 * 2.64} 264`}/>
                </svg>
                <div className="health-dial-num">
                  <span className="num">84</span>
                  <span className="label">Cloud Health</span>
                </div>
              </div>
              <p className="health-trend">↑ 6 points this week</p>
            </div>

            <div className="health-breakdown">
              {[
                { label: 'Compliance posture', score: 88, weight: '40%', desc: 'SOC 2: 92%  ·  ISO 27001: 84%  ·  PCI: 89%' },
                { label: 'Cost efficiency', score: 78, weight: '30%', desc: '$1,247/mo waste detected · 12 idle resources' },
                { label: 'Security findings', score: 86, weight: '30%', desc: 'GuardDuty active · 3 medium · 0 critical' },
              ].map(b => (
                <div key={b.label} className="health-row">
                  <div className="health-row-top">
                    <div>
                      <span className="health-row-name">{b.label}</span>
                      <span className="health-row-weight">{b.weight} weight</span>
                    </div>
                    <span className="health-row-score">{b.score}</span>
                  </div>
                  <p className="health-row-desc">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="section alt reveal" id="features">
        <div className="section-eyebrow">What you get</div>
        <h2 className="section-title">Everything you'd buy<br/>from <em>three vendors.</em></h2>
        <p className="section-sub">
          Compliance automation. Cost optimization. Security posture. One product, one connection, one bill.
        </p>

        <div className="features-grid">
          {[
            { icon: Icons.Shield, title: '5 compliance frameworks', desc: 'SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS — 103 controls, multi-region scanning across every active AWS region. AI-powered remediation guidance for every failing check.' },
            { icon: Icons.Trend, title: '8 cost waste types', desc: 'Idle EBS, unattached EIPs, idle NAT gateways, oversized RDS, unused load balancers, abandoned snapshots, idle EC2, untagged spend. Each finding shows monthly and annual savings.' },
            { icon: Icons.Cube, title: 'Kubernetes cost', desc: 'OpenCost integration shows cost per namespace, per workload, per pod. Detect idle pods, oversized requests, unused PVCs across EKS, GKE, AKS, or self-managed clusters.' },
            { icon: Icons.Bell, title: 'Drift + anomaly alerts', desc: 'Slack and email alerts the moment a control flips from pass to fail, or when daily spend deviates from baseline. Never surprised in an audit again.' },
            { icon: Icons.List, title: 'Unified action queue', desc: 'One ranked list across both engines. Compliance gaps and cost waste, sorted by impact. CLI commands to fix on the spot. Snooze, assign, or mark done.' },
            { icon: Icons.Gauge, title: 'Trust Center', desc: 'Publish a public compliance page for prospects. Share your SOC 2 score, certifications, and security documents. NDA-gate access with one click. Available on Growth.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────────────────── */}
      <section className="section reveal">
        <div className="section-eyebrow">Why Ghara</div>
        <h2 className="section-title">
          One product instead of <em>three subscriptions.</em>
        </h2>
        <p className="section-sub">
          The status quo is a $35k+ stack of tools that don't talk to each other. Ghara replaces it with a single platform.
        </p>

        <div className="comparison-wrap">
          <table className="comparison">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Vanta / Drata</th>
                <th>Vantage / CloudZero</th>
                <th className="ghara-col">Ghara</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Compliance automation', true, false, true],
                ['Cost waste detection', false, true, true],
                ['Kubernetes cost (OpenCost)', false, 'partial', true],
                ['Trust Center (public compliance page)', false, false, true],
                ['Unified Cloud Health Score', false, false, true],
                ['Cross-engine action queue', false, false, true],
                ['Read-only AWS access', true, true, true],
                ['Single connection, single bill', false, false, true],
              ].map(([cap, vanta, vantage, ghara]) => (
                <tr key={cap as string}>
                  <td>{cap}</td>
                  {[vanta, vantage, ghara].map((v, j) => (
                    <td key={j} className={j === 2 ? 'ghara-col' : ''}>
                      {v === true ? <span className="check">{Icons.Check}</span> :
                       v === 'partial' ? <span className="partial">partial</span> :
                       <span className="x">{Icons.X}</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="comparison-cost">
                <td>Typical annual cost</td>
                <td>$24k+</td>
                <td>3% of AWS spend</td>
                <td className="ghara-col">From $5,988</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mobile-comparison-hint">← Swipe to see all columns →</p>
        <p className="comparison-note">
          Comparison based on publicly listed pricing as of 2026. Vanta starter plan, Vantage spend-based pricing, Ghara Starter tier.
        </p>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="section reveal" id="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">
          Simple. <em>Transparent.</em>
        </h2>
        <p className="section-sub">
          Three tiers based on AWS spend. No per-seat surprises. No procurement committee required. 7-day free trial on Growth.
        </p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-tier">Starter</div>
            <div className="pricing-name">For small teams</div>
            <div className="pricing-price">$499</div>
            <div className="pricing-period">per month · up to $10k/mo AWS spend</div>
            <p className="pricing-desc">SOC 2 readiness and waste detection for teams just getting started.</p>
            <ul className="pricing-features">
              <li>{Icons.CheckSm} SOC 2 framework (35 controls)</li>
              <li>{Icons.CheckSm} Cost waste detection</li>
              <li>{Icons.CheckSm} Weekly scans</li>
              <li>{Icons.CheckSm} 1 AWS account</li>
              <li>{Icons.CheckSm} Email support</li>
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
              <li>{Icons.CheckSm} All 5 frameworks (103 controls)</li>
              <li>{Icons.CheckSm} AI evidence + remediation</li>
              <li>{Icons.CheckSm} Vendor risk register</li>
              <li>{Icons.CheckSm} Anomaly detection + Slack alerts</li>
              <li>{Icons.CheckSm} Kubernetes cost (OpenCost)</li>
              <li>{Icons.CheckSm} Daily scans · CSV/JSON export</li>
              <li>{Icons.CheckSm} Priority support</li>
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
              <li>{Icons.CheckSm} Everything in Growth</li>
              <li>{Icons.CheckSm} Custom frameworks</li>
              <li>{Icons.CheckSm} Multi-account AWS</li>
              <li>{Icons.CheckSm} SSO / SAML</li>
              <li>{Icons.CheckSm} Auditor read-only role</li>
              <li>{Icons.CheckSm} Dedicated success engineer</li>
              <li>{Icons.CheckSm} SLA-backed support</li>
            </ul>
            <Link href="/demo" className="pricing-cta">Talk to us</Link>
          </div>
        </div>

        <p className="pricing-note">
          Existing iFU Labs customers? Your Comply or FinOps subscription was grandfathered into Ghara at your existing price. <a href="https://ifulabs.com" target="_blank" rel="noopener noreferrer">Learn more →</a>
        </p>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="section alt reveal">
        <div className="section-eyebrow">Common questions</div>
        <h2 className="section-title">
          Everything you'd ask<br/>on a <em>discovery call.</em>
        </h2>

        <div className="faq-wrap">
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
              a: "Sign up with email, password, and a credit card. Your card is captured for verification only — no charge during the 7-day trial. On day 8, your card is charged the price of your selected plan ($499 or $1,299/mo). Cancel any time during the trial with one click in your dashboard — no charge.",
            },
            {
              q: 'How is this different from Vanta or Drata?',
              a: "Vanta and Drata are excellent compliance tools but they don't do cost optimization, Kubernetes spend, or unified cloud-health scoring. If you only need compliance and you have $24k+/year to spend, they're strong choices. Ghara is for teams who want one platform that covers compliance + cost + security with a single read-only AWS connection.",
            },
            {
              q: 'I already use Vanta. Can I migrate?',
              a: "Yes — most customers run both for a billing cycle while they validate Ghara's controls match. Our framework coverage maps 1:1 with Vanta's for SOC 2 and ISO 27001. Once your team is comfortable, cancel Vanta and bank the savings (Ghara Growth is roughly half the price of comparable Vanta plans).",
            },
            {
              q: 'Do you support GCP and Azure?',
              a: "Not today. We support AWS plus Kubernetes (any cloud, via OpenCost). GCP and Azure are on the roadmap but not committed — we'd rather be the best AWS tool than a mediocre multi-cloud one.",
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
            <details key={faq.q} className="faq-item">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <div className="cta-band reveal">
        <h2>See what's in your AWS account.</h2>
        <p>4-minute connection. 7-day free trial. Cancel anytime — no charge.</p>
        <div className="cta-band-actions">
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial →</a>
          <Link href="/demo" className="btn-secondary">Book a demo</Link>
        </div>
      </div>
    </>
  )
}
