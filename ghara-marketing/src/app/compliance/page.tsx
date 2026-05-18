import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

export const metadata: Metadata = {
  title: 'Automated Cloud Compliance — SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS',
  description: 'Ghara automates compliance monitoring for SOC 2 Type II, ISO 27001, GDPR, HIPAA, and PCI DSS. Continuous scanning, evidence collection, and audit-ready PDF reports for your AWS infrastructure.',
  keywords: ['SOC 2 automation', 'ISO 27001 compliance tool', 'GDPR compliance automation', 'HIPAA compliance AWS', 'PCI DSS automation', 'compliance monitoring', 'audit evidence collection', 'cloud compliance platform'],
  alternates: { canonical: 'https://ghara.ifulabs.com/compliance' },
  openGraph: {
    title: 'Automated Cloud Compliance — SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS',
    description: 'Continuous compliance scanning with automated evidence collection. Audit-ready in minutes, not months.',
    url: 'https://ghara.ifulabs.com/compliance',
  },
}

const FRAMEWORKS = [
  { name: 'SOC 2 Type II', controls: 28, description: 'Trust service criteria for security, availability, and confidentiality. The gold standard for SaaS companies handling customer data.', tier: 'Starter' },
  { name: 'ISO 27001', controls: 13, description: 'International information security management standard. Required for enterprise contracts and global operations.', tier: 'Growth' },
  { name: 'GDPR', controls: 10, description: 'EU data protection regulation. Mandatory for any company processing data of EU residents.', tier: 'Growth' },
  { name: 'HIPAA', controls: 23, description: 'US healthcare data protection. Required for healthtech companies and anyone handling protected health information.', tier: 'Growth' },
  { name: 'PCI DSS 4.0', controls: 29, description: 'Payment card industry security standard. Required for companies that store, process, or transmit cardholder data.', tier: 'Growth' },
]

const FEATURES = [
  { title: 'Continuous multi-region scanning', description: 'Daily automated scans check your AWS infrastructure across every active region against 103+ controls. GuardDuty, EC2, RDS, and VPC checks run in all regions — not just your primary one.' },
  { title: 'Evidence collection', description: 'Every scan captures evidence automatically — IAM policies, encryption settings, network configs. Ready for your auditor.' },
  { title: 'AI gap analysis', description: 'When a control fails, AI explains what went wrong, the business impact, and generates Terraform/CLI code to fix it.' },
  { title: 'Trust Center', description: 'Publish a public compliance page for prospects. Share your SOC 2 score, certifications, and security documents. NDA-gate access with one click.' },
  { title: 'Drift alerts', description: 'Get notified via Slack or email when a previously-passing control starts failing. Catch regressions before your auditor does.' },
  { title: 'Remediation tracking', description: 'Assign failing controls to team members with due dates. Track progress from open to completed.' },
]

export default function CompliancePage() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="section-eyebrow">Compliance</div>
        <h1 className="section-title" style={{ maxWidth: 700 }}>
          Compliance on <em>autopilot.</em>
        </h1>
        <p className="section-sub" style={{ maxWidth: 600 }}>
          Ghara continuously scans your AWS infrastructure against SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS. 
          Evidence is collected automatically. Auditors get a PDF. You get peace of mind.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial</a>
          <Link href="/demo" className="btn-ghost">Book a demo</Link>
        </div>
      </section>

      {/* Frameworks */}
      <section className="section">
        <h2 className="section-title">Five frameworks. <em>One platform.</em></h2>
        <p className="section-sub">103+ controls across the frameworks that matter for cloud-native companies.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 40, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          {FRAMEWORKS.map(fw => (
            <div key={fw.name} style={{ background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#33063D', margin: 0 }}>{fw.name}</h3>
                <span style={{ fontSize: 10, fontWeight: 600, background: fw.tier === 'Starter' ? '#C8F6C0' : '#DAC0FD', color: '#33063D', padding: '3px 8px', borderRadius: 4 }}>{fw.tier}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.65)', lineHeight: 1.6, margin: '8px 0' }}>{fw.description}</p>
              <p style={{ fontSize: 12, fontFamily: "'Aeonik Fono', monospace", color: '#8A63E6' }}>{fw.controls} automated controls</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ background: '#F4F4F4' }}>
        <h2 className="section-title">How it <em>works.</em></h2>
        <p className="section-sub">From scan to audit-ready in minutes.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 40, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid rgba(51,6,61,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#33063D', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.65)', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center' }}>
        <h2 className="section-title">Ready for your next <em>audit?</em></h2>
        <p className="section-sub">Start a 7-day free trial. Full Growth-tier access. No commitment.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial</a>
          <Link href="/pricing" className="btn-ghost">View pricing</Link>
        </div>
      </section>
    </>
  )
}
