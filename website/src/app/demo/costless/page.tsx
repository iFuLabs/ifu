import type { Metadata } from 'next'
import CostlessDemoPageClient from './CostlessDemoPageClient'

export const metadata: Metadata = {
  title: 'iFu Costless Demo — AWS cost optimisation SaaS',
  description: 'Book a live demo of iFu Costless — the SaaS tool that audits your AWS spend, identifies waste, and optimises Savings Plans coverage.',
  alternates: { canonical: '/demo/costless' },
  openGraph: {
    title: 'iFu Costless Demo — iFu Labs',
    description: 'AWS cost optimisation SaaS. Book a live demo.',
    url: '/demo/costless',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Costless Demo',
    description: 'Book a live demo of iFu Costless — AWS cost optimisation SaaS.',
  },
}

export default function Page() {
  return <CostlessDemoPageClient />
}
