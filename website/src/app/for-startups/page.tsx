import type { Metadata } from 'next'
import ForStartupsPageClient from './ForStartupsPageClient'

export const metadata: Metadata = {
  title: 'For Startups — Scale faster on AWS with a partner built for startups',
  description: 'iFu Labs helps startups cut AWS costs, ship reliably, migrate without downtime, and unlock AWS Activate credits — with no extra fees and full control of your AWS accounts.',
  alternates: { canonical: '/for-startups' },
  openGraph: {
    title: 'iFu Labs for Startups — AWS Partner Network member',
    description: 'Cut AWS costs, ship reliably, migrate without downtime, and unlock AWS Activate credits.',
    url: '/for-startups',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Labs for Startups',
    description: 'Scale faster on AWS. Cut costs, ship reliably, unlock AWS Activate credits.',
  },
}

export default function Page() {
  return <ForStartupsPageClient />
}
