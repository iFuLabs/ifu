import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Starter, Growth & Scale Plans',
  description: 'Ghara pricing starts at $499/mo for SOC 2 compliance. Growth plan at $1,299/mo adds all frameworks, AI remediation, Kubernetes cost, and Slack alerts. 7-day free trial.',
  keywords: ['Ghara pricing', 'compliance automation pricing', 'SOC 2 tool cost', 'FinOps platform pricing', 'cloud compliance pricing'],
  alternates: { canonical: 'https://ghara.ifulabs.com/pricing' },
  openGraph: {
    title: 'Ghara Pricing — One Product, Three Tiers',
    description: 'Start at $499/mo. 7-day free trial with full Growth access.',
    url: 'https://ghara.ifulabs.com/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
