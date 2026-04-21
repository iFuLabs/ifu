import type { Metadata } from 'next'
import TermsPageClient from './TermsPageClient'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of iFu Labs consultancy services and SaaS products.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service — iFu Labs',
    description: 'Terms governing use of iFu Labs services and products.',
    url: '/terms',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service — iFu Labs',
    description: 'Terms governing use of iFu Labs services and products.',
  },
}

export default function Page() {
  return <TermsPageClient />
}
