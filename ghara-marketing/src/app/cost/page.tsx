import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = 'https://app.ghara.ifulabs.com'

export const metadata: Metadata = {
  title: 'AWS Cost Optimization & FinOps — Waste Detection, Rightsizing, Anomaly Alerts',
  description: 'Ghara finds wasted AWS spend automatically. Idle resources, oversized instances, missing reservations, cost anomalies. Save 20-40% on your cloud bill with AI-powered recommendations.',
  keywords: ['AWS cost optimization', 'FinOps platform', 'cloud cost management', 'AWS waste detection', 'rightsizing recommendations', 'cost anomaly detection', 'Kubernetes cost', 'OpenCost', 'Savings Plans recommendations', 'Reserved Instance optimization'],
  alternates: { canonical: 'https://ghara.ifulabs.com/cost' },
  openGraph: {
    title: 'AWS Cost Optimization & FinOps — Save 20-40% on Your Cloud Bill',
    description: 'Automated waste detection, rightsizing, anomaly alerts, and purchase recommendations for AWS.',
    url: 'https://ghara.ifulabs.com/cost',
  },
}

const WASTE_TYPES = [
  { name: 'Unused Elastic IPs', description: 'EIPs allocated but not attached to running instances' },
  { name: 'Unattached EBS volumes', description: 'Storage volumes not connected to any instance' },
  { name: 'Idle RDS instances', description: 'Databases with near-zero connections' },
  { name: 'Idle load balancers', description: 'ALBs/NLBs with no healthy targets' },
  { name: 'Old EBS snapshots', description: 'Snapshots older than 90 days with no AMI reference' },
  { name: 'Stopped instances', description: 'EC2 instances stopped for 7+ days still incurring EBS costs' },
  { name: 'Oversized instances', description: 'EC2/RDS running below 20% CPU utilization' },
  { name: 'Missing Savings Plans', description: 'On-demand spend that could be covered by commitments' },
]

const FEATURES = [
  { title: 'Waste detection', description: '8 categories of waste scanned automatically. Idle resources, unattached storage, forgotten snapshots — found and quantified.' },
  { title: 'Rightsizing', description: 'CPU and memory utilization analysis via CloudWatch. Get specific instance type recommendations with projected savings.' },
  { title: 'Anomaly detection', description: 'Daily spend compared against rolling baselines. Get alerted when a service spikes unexpectedly — before the bill arrives.' },
  { title: 'Cost allocation', description: 'Slice spend by Environment, Team, Project, or CostCenter tags. See who is spending what and track month-over-month trends.' },
  { title: 'Purchase recommendations', description: 'Savings Plans and Reserved Instance recommendations with break-even analysis. Know exactly when commitments pay off.' },
  { title: 'Kubernetes cost', description: 'Per-namespace and per-workload cost visibility via OpenCost. Works on EKS, GKE, AKS, or self-managed clusters.' },
]

export default function CostPage() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="section-eyebrow">Cost</div>
        <h1 className="section-title" style={{ maxWidth: 700 }}>
          Stop paying for cloud you <em>don't use.</em>
        </h1>
        <p className="section-sub" style={{ maxWidth: 600 }}>
          Ghara scans your AWS account daily for wasted spend. Idle resources, oversized instances, 
          missing commitments — found automatically with AI-powered fix suggestions.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial</a>
          <Link href="/demo" className="btn-ghost">Book a demo</Link>
        </div>
      </section>

      {/* Waste types */}
      <section className="section">
        <h2 className="section-title">8 types of waste. <em>Found automatically.</em></h2>
        <p className="section-sub">Most teams save 20-40% in the first month.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 40, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          {WASTE_TYPES.map(w => (
            <div key={w.name} style={{ background: '#FFFFFF', border: '1px solid rgba(51,6,61,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: '#8A63E6', fontSize: 16, marginTop: 2 }}>→</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#33063D', margin: 0 }}>{w.name}</h3>
                <p style={{ fontSize: 12, color: 'rgba(51,6,61,0.6)', margin: '4px 0 0', lineHeight: 1.5 }}>{w.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ background: '#F4F4F4' }}>
        <h2 className="section-title">Beyond waste. <em>Full FinOps.</em></h2>
        <p className="section-sub">Everything you need to understand and optimize your cloud spend.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 40, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid rgba(51,6,61,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#33063D', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.65)', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <h2 className="section-title">Three steps to <em>savings.</em></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginTop: 40, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          {[
            { step: '1', title: 'Connect AWS', description: 'Read-only IAM role. 2-minute CloudFormation setup. No agents to install.' },
            { step: '2', title: 'Get findings', description: 'First scan completes in under 5 minutes. See waste, rightsizing, and coverage gaps immediately.' },
            { step: '3', title: 'Fix & track', description: 'AI generates Terraform or CLI commands to fix each finding. Mark as done, snooze, or dismiss.' },
          ].map(s => (
            <div key={s.step} style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DAC0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 700, color: '#33063D', fontSize: 16 }}>{s.step}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#33063D', marginBottom: 6 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(51,6,61,0.65)', lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center' }}>
        <h2 className="section-title">Find your wasted <em>spend.</em></h2>
        <p className="section-sub">7-day free trial. See savings in under 5 minutes.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <a href={`${APP_URL}/signup`} className="btn-primary">Start free trial</a>
          <Link href="/pricing" className="btn-ghost">View pricing</Link>
        </div>
      </section>
    </>
  )
}
