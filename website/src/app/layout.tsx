import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'iFu Labs — AWS Cloud Consultancy & SaaS Products',
  description: 'Expert-led AWS cloud services — compliance, cost optimisation, migration, EKS, and DevOps. Plus standalone SaaS tools for compliance and cost.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'iFu Labs — AWS Cloud Consultancy',
    description: 'Expert-led AWS cloud services and SaaS products for engineering teams.',
    url: 'https://ifu-labs.io',
    siteName: 'iFu Labs',
    type: 'website',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
