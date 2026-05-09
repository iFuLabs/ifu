import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFFFFF' }

export const metadata: Metadata = {
  title: 'Ghara — Cloud compliance and cost in one dashboard',
  description: 'Ghara watches your AWS for compliance gaps and wasted spend. One dashboard. One score. One action queue. Built by iFU Labs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  )
}
