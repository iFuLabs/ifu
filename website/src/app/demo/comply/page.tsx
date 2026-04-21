import type { Metadata } from 'next'
import ComplyDemoPageClient from './ComplyDemoPageClient'

export const metadata: Metadata = {
  title: 'iFu Comply Demo — SOC 2 and compliance evidence automation',
  description: 'Book a live demo of iFu Comply — the SaaS tool that automates SOC 2, ISO 27001, GDPR, and HIPAA evidence collection on AWS.',
  alternates: { canonical: '/demo/comply' },
  openGraph: {
    title: 'iFu Comply Demo — iFu Labs',
    description: 'Automated compliance evidence collection for AWS. Book a live demo.',
    url: '/demo/comply',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Comply Demo',
    description: 'Book a live demo of iFu Comply — SOC 2 & compliance automation on AWS.',
  },
}

export default function Page() {
  return <ComplyDemoPageClient />
}
