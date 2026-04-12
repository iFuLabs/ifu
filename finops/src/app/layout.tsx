import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'iFu Labs — FinOps',
  description: 'AWS cost optimization and waste detection by iFu Labs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
