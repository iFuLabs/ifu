import { Shield, TrendingDown, LayoutDashboard, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-plum leading-tight max-w-3xl mx-auto">
          Know your AWS is in good shape.
        </h1>
        <p className="text-lg text-plum/70 mt-6 max-w-2xl mx-auto">
          Ghara watches your cloud for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by iFU Labs.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <a
            href="https://app.ghara.ifulabs.com/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-plum text-white rounded-lg font-medium hover:bg-plum/90 transition-colors"
          >
            Start 7-day free trial
            <ArrowRight size={16} />
          </a>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 border border-plum/20 text-plum rounded-lg font-medium hover:bg-grey transition-colors"
          >
            Request demo
          </Link>
        </div>
        <p className="text-sm text-plum/50 mt-4">No credit card required · Full Growth tier access</p>
      </section>

      {/* Three features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield size={24} />}
            title="Pass audits faster"
            description="Automated evidence collection for SOC 2, ISO 27001, GDPR, HIPAA, and PCI DSS. AI-powered remediation guidance."
          />
          <FeatureCard
            icon={<TrendingDown size={24} />}
            title="Cut cloud waste"
            description="Detect idle resources, rightsizing opportunities, and cost anomalies across AWS and Kubernetes."
          />
          <FeatureCard
            icon={<LayoutDashboard size={24} />}
            title="One dashboard for your CTO"
            description="Cloud Health Score, unified action queue, and cross-engine findings. Everything in one place."
          />
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="bg-grey py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-plum/50 uppercase tracking-wider font-semibold mb-6">Trusted by engineering teams</p>
          <div className="flex items-center justify-center gap-12 opacity-30">
            <div className="w-24 h-8 bg-plum/20 rounded" />
            <div className="w-24 h-8 bg-plum/20 rounded" />
            <div className="w-24 h-8 bg-plum/20 rounded" />
            <div className="w-24 h-8 bg-plum/20 rounded hidden md:block" />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-serif text-3xl text-plum mb-4">Simple, transparent pricing</h2>
        <p className="text-plum/70 mb-8 max-w-lg mx-auto">
          Three tiers based on your AWS spend. Start with a 7-day free trial on the Growth plan.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <PricingTeaser name="Starter" price="$499" desc="Up to $10k/mo AWS" />
          <PricingTeaser name="Growth" price="$1,299" desc="Up to $100k/mo AWS" popular />
          <PricingTeaser name="Scale" price="Custom" desc="Unlimited" />
        </div>
        <Link href="/pricing" className="inline-flex items-center gap-1 text-iris font-medium mt-8 hover:underline">
          See full comparison <ArrowRight size={14} />
        </Link>
      </section>

      {/* CTA */}
      <section className="bg-plum py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl text-white mb-4">Ready to see what's in your AWS?</h2>
          <p className="text-white/70 mb-8">Connect in under 5 minutes. No credit card. Full access for 7 days.</p>
          <a
            href="https://app.ghara.ifulabs.com/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-plum rounded-lg font-medium hover:bg-grey transition-colors"
          >
            Start free trial
            <ArrowRight size={16} />
          </a>
        </div>
      </section>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-grey rounded-xl p-6">
      <div className="w-12 h-12 rounded-lg bg-lavender/30 flex items-center justify-center text-iris mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-plum mb-2">{title}</h3>
      <p className="text-sm text-plum/70 leading-relaxed">{description}</p>
    </div>
  )
}

function PricingTeaser({ name, price, desc, popular }: { name: string; price: string; desc: string; popular?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-5 ${popular ? 'border-iris shadow-sm' : 'border-grey'}`}>
      {popular && <span className="text-[10px] font-semibold uppercase tracking-wider text-iris">Most popular</span>}
      <h3 className="text-lg font-semibold text-plum mt-1">{name}</h3>
      <p className="font-mono text-2xl font-semibold text-plum mt-1">{price}<span className="text-sm font-normal text-plum/50">{price !== 'Custom' ? '/mo' : ''}</span></p>
      <p className="text-xs text-plum/60 mt-1">{desc}</p>
    </div>
  )
}
