'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import ColorBends from './components/home/ColorBends'

export default function Home() {
  const { address } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (address) {
      router.push('/choose')
    }
  }, [address, router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-orange-50">
      <div className="pointer-events-none absolute inset-0">
        <ColorBends
          className="h-full w-full"
          colors={['#ff9c42', '#ff6d22', '#0a0b10', '#050507']}
          speed={0.2}
          noise={0.02}
          parallax={0.55}
          mouseInfluence={1.0}
          warpStrength={1.05}
          frequency={1.0}
          autoRotate={0.38}
          scale={1.2}
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,138,51,0.16),transparent_36%),radial-gradient(circle_at_80%_72%,rgba(255,106,0,0.2),transparent_32%),linear-gradient(180deg,rgba(2,2,4,0.62)_0%,rgba(2,2,4,0.72)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <main className="space-y-8">
          <div className="max-w-3xl">
            <p className="inline-block rounded-full border border-orange-300/35 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-100/90">
              NeuralHash SSI
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-6xl">
              Issue and verify trusted credentials
              <span className="block text-orange-300">with decentralized identity</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-orange-100/80 sm:text-base">
              Create tamper-evident credentials, store proofs on IPFS, and verify authenticity with cryptographic confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="scale-[1.04]">
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>

          <section className="grid gap-3 text-sm text-orange-100/85 sm:grid-cols-3">
            <p>Issue credentials securely</p>
            <p>Store hashes and metadata on-chain + IPFS</p>
            <p>Verify authenticity in one flow</p>
          </section>
        </main>
      </div>
    </div>
  )
}
