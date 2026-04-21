import type { Metadata } from 'next'
import AboutPageClient from './AboutPageClient'

export const metadata: Metadata = {
  title: 'About — AWS consultancy built for startups and scale-ups',
  description: "A remote-first team of AWS-certified engineers helping startups and fast-growing companies build, scale, and secure their AWS infrastructure — without the overhead of hiring a full platform team.",
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About iFu Labs — AWS consultancy for startups and scale-ups',
    description: 'Remote-first, AWS-certified engineers. We embed with your team, deliver measurable outcomes, and leave you self-sufficient.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About iFu Labs',
    description: 'AWS-certified engineers for startups and scale-ups. Remote-first, read-only, no lock-in.',
  },
}

export default function Page() {
  return <AboutPageClient />
}
