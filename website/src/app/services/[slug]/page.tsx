import { SERVICES } from '@/lib/services'
import ServiceDetail from './ServiceDetail'

export function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.slug }))
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ServiceDetail slug={params.slug} />
}
