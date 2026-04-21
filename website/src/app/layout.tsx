import type { Metadata, Viewport } from 'next'
import { CookieBanner } from '@/components/CookieBanner'

const SITE_URL = 'https://www.ifulabs.com'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07080D',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'iFu Labs — AWS Cloud Consultancy & SaaS Products',
    template: '%s | iFu Labs',
  },
  description: 'Expert-led AWS cloud services — compliance, cost optimisation, migration, EKS, and DevOps. Plus standalone SaaS tools for compliance and cost.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'iFu Labs — AWS Cloud Consultancy',
    description: 'Expert-led AWS cloud services and SaaS products for engineering teams.',
    url: SITE_URL,
    siteName: 'iFu Labs',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iFu Labs — AWS Cloud Consultancy',
    description: 'Expert-led AWS cloud services and SaaS products for engineering teams.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'iFu Labs',
  legalName: 'iFu Labs Ltd.',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: 'AWS cloud consultancy and SaaS products for engineering teams. Expert-led services across compliance, cost optimisation, migration, EKS, and DevOps.',
  email: 'info@ifulabs.com',
  sameAs: [
    'https://aws.amazon.com/partners/',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'info@ifulabs.com',
    availableLanguage: ['English'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
