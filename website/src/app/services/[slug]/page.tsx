import type { Metadata } from 'next'
import { SERVICES, getService } from '@/lib/services'
import ServiceDetail from './ServiceDetail'

export function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const svc = getService(params.slug)
  if (!svc) {
    return {
      title: 'Service not found',
      robots: { index: false, follow: false },
    }
  }
  const title = `${svc.name} — ${svc.tagline}`
  const description = svc.desc
  const url = `/services/${svc.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${svc.name} — iFu Labs`,
      description,
      url,
      type: 'article',
      images: [{ url: svc.hero, alt: svc.heroAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${svc.name} — iFu Labs`,
      description,
      images: [svc.hero],
    },
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ServiceDetail slug={params.slug} />
}
