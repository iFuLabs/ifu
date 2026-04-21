import type { Metadata } from 'next'
import PrivacyPageClient from './PrivacyPageClient'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How iFu Labs collects, uses, and protects personal data when you use our AWS consultancy services and SaaS products.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — iFu Labs',
    description: 'How iFu Labs handles personal data.',
    url: '/privacy',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy — iFu Labs',
    description: 'How iFu Labs handles personal data.',
  },
}

export default function Page() {
  return <PrivacyPageClient />
}
