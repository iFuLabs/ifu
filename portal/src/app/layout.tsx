import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0C0F',
}

export const metadata: Metadata = {
  title: 'iFu Labs — Product Portal',
  description: 'Access your iFu Labs products',
  icons: {
    icon: [
      { url: '/logomark.png', sizes: '32x32', type: 'image/png' },
      { url: '/logomark.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/logomark.png',
    apple: { url: '/logomark.png', sizes: '180x180', type: 'image/png' },
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
