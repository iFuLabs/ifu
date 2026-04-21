import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'

export const metadata: Metadata = {
  title: 'Expert AWS engineering for startups that ship fast',
  description: 'Skip the six-month platform hire. iFu Labs gives your startup an on-demand AWS team — cost control, SOC 2 readiness, migrations, and CI/CD — delivered by senior engineers, priced for seed to Series B.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'iFu Labs — Expert AWS engineering for startups',
    description: 'On-demand AWS team for startups: cost control, SOC 2 readiness, migrations, EKS, and CI/CD. AWS Partner Network member.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Labs — Expert AWS engineering for startups',
    description: 'On-demand AWS team for startups: cost control, SOC 2 readiness, migrations, EKS, and CI/CD.',
  },
}

export default function Page() {
  return <HomePageClient />
}
