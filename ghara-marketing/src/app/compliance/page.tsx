import { Shield, CheckCircle, ArrowRight, FileText, Zap, GitBranch } from 'lucide-react'

export default function CompliancePage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl">
        <h1 className="font-serif text-4xl text-plum mb-4">Compliance, automated.</h1>
        <p className="text-lg text-plum/70 mb-8">
          Ghara continuously monitors your AWS and GitHub for compliance gaps. Automated evidence collection, AI-powered remediation, and real-time drift alerts.
        </p>
        <a href="https://app.ghara.ifulabs.com/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-plum text-white rounded-lg font-medium hover:bg-plum/90 transition-colors">
          Start free trial <ArrowRight size={16} />
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-16">
        <Feature icon={<Shield size={20} />} title="5 frameworks supported" desc="SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS. All controls mapped to automated checks." />
        <Feature icon={<FileText size={20} />} title="Automated evidence" desc="Evidence collected from AWS (IAM, S3, CloudTrail, RDS, GuardDuty) and GitHub (branch protection, secrets, CODEOWNERS)." />
        <Feature icon={<Zap size={20} />} title="AI remediation" desc="Claude-powered explanations and fix suggestions for every failing control. IaC snippets included." />
        <Feature icon={<GitBranch size={20} />} title="Drift alerts" desc="Get notified via Slack or email the moment a control flips from pass to fail." />
      </div>
    </main>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-lavender/30 flex items-center justify-center text-iris flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-plum mb-1">{title}</h3>
        <p className="text-sm text-plum/70">{desc}</p>
      </div>
    </div>
  )
}
