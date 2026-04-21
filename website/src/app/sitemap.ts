import type { MetadataRoute } from 'next'

const BASE = 'https://www.ifulabs.com'

const SERVICE_SLUGS = [
  'cost-optimisation',
  'compliance-security',
  'cloud-migration',
  'eks-ecs',
  'devops-cicd',
  'managed-services',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = [
    '',
    '/about',
    '/services',
    '/for-startups',
    '/schedule-consultation',
    '/demo/comply',
    '/demo/costless',
    '/privacy',
    '/terms',
    '/acceptable-use',
  ].map(path => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1.0 : 0.7,
  }))

  const services = SERVICE_SLUGS.map(slug => ({
    url: `${BASE}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...routes, ...services]
}
