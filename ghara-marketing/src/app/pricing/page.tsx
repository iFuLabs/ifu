import { CheckCircle, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    name: 'Starter',
    price: '$499',
    spend: 'Up to $10k/mo AWS spend',
    cta: 'Start free trial',
    ctaHref: 'https://app.ghara.ifulabs.com/signup',
  },
  {
    name: 'Growth',
    price: '$1,299',
    spend: 'Up to $100k/mo AWS spend',
    popular: true,
    cta: 'Start free trial',
    ctaHref: 'https://app.ghara.ifulabs.com/signup',
  },
  {
    name: 'Scale',
    price: 'Custom',
    spend: 'Unlimited AWS spend',
    cta: 'Talk to us',
    ctaHref: '/demo',
  },
]

const FEATURES = [
  { name: 'SOC 2 framework', starter: true, growth: true, scale: true },
  { name: 'ISO 27001, GDPR, HIPAA, PCI DSS', starter: false, growth: true, scale: true },
  { name: 'Basic cost waste detection', starter: true, growth: true, scale: true },
  { name: 'AI evidence & remediation', starter: false, growth: true, scale: true },
  { name: 'Vendor risk management', starter: false, growth: true, scale: true },
  { name: 'Anomaly detection', starter: false, growth: true, scale: true },
  { name: 'Kubernetes cost (OpenCost)', starter: false, growth: true, scale: true },
  { name: 'Slack integration & drift alerts', starter: false, growth: true, scale: true },
  { name: 'Custom date ranges', starter: false, growth: true, scale: true },
  { name: 'CSV/JSON export', starter: false, growth: true, scale: true },
  { name: 'Daily scans', starter: false, growth: true, scale: true },
  { name: 'Weekly scans', starter: true, growth: true, scale: true },
  { name: '1 AWS account', starter: true, growth: true, scale: true },
  { name: 'Multi-account AWS', starter: false, growth: false, scale: true },
  { name: 'Custom frameworks', starter: false, growth: false, scale: true },
  { name: 'SSO / SAML', starter: false, growth: false, scale: true },
  { name: 'Auditor read-only role', starter: false, growth: false, scale: true },
  { name: 'Dedicated CSM', starter: false, growth: false, scale: true },
  { name: 'FOCUS export', starter: false, growth: false, scale: true },
  { name: 'Email support', starter: true, growth: true, scale: true },
  { name: 'Priority support', starter: false, growth: false, scale: true },
]

export default function PricingPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl text-plum mb-4">Pricing</h1>
        <p className="text-plum/70 max-w-lg mx-auto">
          One product. Three tiers. Start with a 7-day free trial on the Growth plan — full access, no credit card.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {PLANS.map(plan => (
          <div key={plan.name} className={`bg-white border rounded-xl p-6 flex flex-col ${plan.popular ? 'border-iris shadow-md' : 'border-grey'}`}>
            {plan.popular && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-iris mb-2">Most popular</span>
            )}
            <h2 className="text-xl font-semibold text-plum">{plan.name}</h2>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-semibold text-plum">{plan.price}</span>
              {plan.price !== 'Custom' && <span className="text-sm text-plum/50">/mo</span>}
            </div>
            <p className="text-sm text-plum/60 mt-1 mb-6">{plan.spend}</p>
            <a
              href={plan.ctaHref}
              className={`mt-auto py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                plan.popular
                  ? 'bg-plum text-white hover:bg-plum/90'
                  : 'border border-plum/20 text-plum hover:bg-grey'
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <h2 className="font-serif text-2xl text-plum text-center mb-8">Feature comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-grey">
              <th className="text-left py-3 pr-4 text-plum/60 font-medium">Feature</th>
              <th className="text-center py-3 px-4 text-plum font-semibold">Starter</th>
              <th className="text-center py-3 px-4 text-plum font-semibold">Growth</th>
              <th className="text-center py-3 px-4 text-plum font-semibold">Scale</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f, i) => (
              <tr key={i} className="border-b border-grey/50">
                <td className="py-3 pr-4 text-plum/80">{f.name}</td>
                <td className="text-center py-3 px-4">{f.starter ? <CheckCircle size={16} className="inline text-iris" /> : <X size={16} className="inline text-plum/20" />}</td>
                <td className="text-center py-3 px-4">{f.growth ? <CheckCircle size={16} className="inline text-iris" /> : <X size={16} className="inline text-plum/20" />}</td>
                <td className="text-center py-3 px-4">{f.scale ? <CheckCircle size={16} className="inline text-iris" /> : <X size={16} className="inline text-plum/20" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="font-serif text-2xl text-plum text-center mb-8">FAQ</h2>
        <div className="space-y-6">
          <Faq q="How does the 7-day trial work?" a="Sign up, connect AWS, and get full Growth-tier access for 7 days. No credit card required. At the end, choose a plan or your account goes read-only (no data deleted)." />
          <Faq q="What counts as AWS spend?" a="Your monthly AWS bill as reported by Cost Explorer. We use this to determine your tier. If you're between tiers, you're on the lower one until you cross the threshold." />
          <Faq q="Do you support Kubernetes?" a="Yes — Growth tier includes Kubernetes cost visibility via OpenCost. Works on EKS, GKE, AKS, or self-managed clusters." />
          <Faq q="What about existing Comply or FinOps customers?" a="You're grandfathered at your current price. Your features and billing stay the same. You'll see the new unified dashboard automatically." />
          <Faq q="Can I switch plans?" a="Yes, upgrade or downgrade anytime from the billing page. Changes take effect immediately." />
        </div>
      </section>
    </main>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-grey pb-5">
      <h3 className="text-sm font-semibold text-plum mb-1">{q}</h3>
      <p className="text-sm text-plum/70">{a}</p>
    </div>
  )
}
