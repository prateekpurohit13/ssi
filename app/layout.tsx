import './globals.css'
import { Providers } from './providers'
import { ReactNode } from 'react'

export const metadata = {
  title: 'NeuralHash SSI',
  description: 'Decentralized Identity App',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
