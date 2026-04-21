import type { Metadata } from 'next'
import ServicesPageClient from './ServicesPageClient'

export const metadata: Metadata = {
  title: 'Services — Expert-led AWS engineering across your stack',
  description: 'iFu Labs engineers embed with your team, deliver measurable outcomes, and leave you self-sufficient. Cost optimisation, compliance, migration, EKS, DevOps, and managed services.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'iFu Labs Services — AWS consultancy across your stack',
    description: 'Cost optimisation, compliance, migration, EKS, DevOps, and managed services — delivered by senior AWS-certified engineers.',
    url: '/services',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Labs Services',
    description: 'Expert-led AWS services: cost, compliance, migration, EKS, DevOps, managed.',
  },
}

export default function Page() {
  return <ServicesPageClient />
}
