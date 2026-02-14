'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import ColorBends from './components/home/ColorBends'
import TextType from './components/home/TextType'

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
            <div className="inline-flex items-center gap-3 rounded-2xl border border-orange-300/35 bg-black/25 px-4 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-orange-300/45 bg-linear-to-br from-orange-500/30 to-orange-700/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6.5" y="10" width="11" height="9" rx="2" />
                  <path d="M9 10V7.8a3 3 0 0 1 6 0V10" />
                  <circle cx="12" cy="14.5" r="0.8" fill="currentColor" stroke="none" />
                  <path d="M12 15.3v1.5" />
                  <circle cx="4" cy="12" r="1.2" />
                  <circle cx="20" cy="12" r="1.2" />
                  <circle cx="12" cy="3.5" r="1.2" />
                  <path d="M5.2 12h1.3M17.5 12h1.3M12 4.7V6" />
                </svg>
              </span>
              <span className="font-mono text-base font-bold tracking-[0.16em] text-orange-100/95 sm:text-lg">
                NeuralHash
                <span className="ml-2 text-base font-bold tracking-[0.28em] text-orange-200/85 sm:text-lg">SSI</span>
              </span>
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-6xl">
              <TextType
                as="span"
                text={['Issue and verify trusted credentials', 'with decentralized identity']}
                textColors={['#ffffff', '#fdba74']}
                className="block"
                typingSpeed={42}
                initialDelay={100}
                loop={false}
                showCursor={true}
                hideCursorWhileTyping={false}
                hideCursorOnComplete={true}
              />
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm text-orange-100/80 sm:text-base">
              Create tamper-evident credentials, store proofs on IPFS, and verify authenticity with cryptographic confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="scale-[1.04]">
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>
          <p className="text-sm text-orange-100/80 font-mono sm:text-base">Issue credentials securely, Store hashes and metadata on-chain + IPFS, Verify authenticity in one flow</p>
        </main>
      </div>
    </div>
  )
}
