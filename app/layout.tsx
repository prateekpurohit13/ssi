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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
