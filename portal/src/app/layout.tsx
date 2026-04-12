import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'iFu Labs — Product Portal',
  description: 'Access your iFu Labs products',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
