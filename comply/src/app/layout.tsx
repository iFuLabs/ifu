import type { Metadata } from 'next'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import './globals.css'

export const metadata: Metadata = {
  title: 'iFu Comply — Compliance Automation',
  description: 'Compliance automation by iFu Labs — SOC 2, ISO 27001, GDPR for engineering teams',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
