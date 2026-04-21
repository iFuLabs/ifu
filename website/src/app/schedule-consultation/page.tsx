import type { Metadata } from 'next'
import ScheduleConsultationPageClient from './ScheduleConsultationPageClient'

export const metadata: Metadata = {
  title: 'Schedule a free consultation',
  description: "Tell us what you're trying to build, migrate, or secure on AWS. We'll share an honest read on scope, risks, and whether we're the right fit — before you commit to anything. Free, 30 minutes, no commitment.",
  alternates: { canonical: '/schedule-consultation' },
  openGraph: {
    title: 'Schedule a free consultation — iFu Labs',
    description: 'Free, 30-minute, no-commitment call with an iFu Labs engineer. No sales pitch.',
    url: '/schedule-consultation',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Schedule a free consultation — iFu Labs',
    description: 'Free 30-min AWS consultation with a senior engineer. No sales pitch.',
  },
}

export default function Page() {
  return <ScheduleConsultationPageClient />
}
