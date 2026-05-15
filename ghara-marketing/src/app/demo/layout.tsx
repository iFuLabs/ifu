import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Demo — See Ghara in Action',
  description: 'Schedule a 15-minute demo of Ghara. See how automated compliance scanning and cost optimization works for your AWS infrastructure.',
  alternates: { canonical: 'https://ghara.ifulabs.com/demo' },
  openGraph: {
    title: 'Book a Demo — See Ghara in Action',
    description: '15-minute walkthrough of compliance automation and AWS cost optimization.',
    url: 'https://ghara.ifulabs.com/demo',
  },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
