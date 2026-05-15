import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Ghara — Cloud Compliance & Cost by iFU Labs',
  description: 'Ghara is built by iFU Labs, a cloud consultancy that helps startups and scale-ups get SOC 2 certified and optimize AWS spend. Based in Accra, serving globally.',
  alternates: { canonical: 'https://ghara.ifulabs.com/about' },
  openGraph: {
    title: 'About Ghara — Built by iFU Labs',
    description: 'Cloud compliance and cost optimization, built by practitioners who do this work every day.',
    url: 'https://ghara.ifulabs.com/about',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
