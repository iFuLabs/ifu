import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'iFu Costless — AWS Cost Optimization',
  description: 'AWS cost optimization and waste detection by iFu Labs',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
