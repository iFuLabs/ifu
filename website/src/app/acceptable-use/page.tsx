import type { Metadata } from 'next'
import AcceptableUsePageClient from './AcceptableUsePageClient'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy',
  description: 'The rules governing acceptable use of iFu Labs SaaS products and infrastructure.',
  alternates: { canonical: '/acceptable-use' },
  openGraph: {
    title: 'Acceptable Use Policy — iFu Labs',
    description: 'Rules governing acceptable use of iFu Labs products.',
    url: '/acceptable-use',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'Acceptable Use Policy — iFu Labs',
    description: 'Rules governing acceptable use of iFu Labs products.',
  },
}

export default function Page() {
  return <AcceptableUsePageClient />
}
