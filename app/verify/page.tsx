'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { readContract } from 'wagmi/actions'
import { useConfig, useDisconnect } from 'wagmi'
import { keccak256, stringToBytes } from 'viem'
import { useSearchParams, useRouter } from 'next/navigation'
import { contractConfig } from '../contract'
import { trustRegistryConfig } from '../trustRegistry'
import { authenticateWithBiometric } from '../biometricAuth'
import { ViewToggle } from '../components/home/ViewToggle'
import ColorBends from '../components/home/ColorBends'
import { useToast } from '../components/ui/ToastProvider'

type Credential = {
  ipfsCID: string
  issuer: `0x${string}`
  isValid: boolean
  issuedAt: bigint
  credentialHash: `0x${string}`
}

type DisclosedData = Record<string, unknown>

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent p-6 text-orange-100/80">
          Loading verifier portal...
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  )
}

function VerifyPageContent() {
  const config = useConfig()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const userParam = searchParams.get('user')
  const hashParam = searchParams.get('hash')

  const [disclosedData, setDisclosedData] = useState<DisclosedData | null>(null)
  const [inputAddress, setInputAddress] = useState('')
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [issuerTrustMap, setIssuerTrustMap] = useState<Record<string, boolean>>({})
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  async function checkIssuerTrust(issuer: `0x${string}`) {
    try {
      const trusted = await readContract(config, {
        ...trustRegistryConfig,
        functionName: 'isTrusted',
        args: [issuer],
      })

      return Boolean(trusted)
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async function resolveIssuerTrust(creds: Credential[]) {
    if (!creds.length) {
      setIssuerTrustMap({})
      return
    }

    const issuers = Array.from(new Set(creds.map((cred) => cred.issuer.toLowerCase()))) as `0x${string}`[]

    const entries = await Promise.all(
      issuers.map(async (issuer) => {
        const trusted = await checkIssuerTrust(issuer)
        return [issuer, trusted] as const
      })
    )

    setIssuerTrustMap(Object.fromEntries(entries))
  }

  // ---------------- AUTO FILL ADDRESS ----------------
  useEffect(() => {
    if (userParam) {
      setInputAddress(userParam)
    }
  }, [userParam])

  // ---------------- FETCH CREDENTIALS ----------------
  async function fetchCredentials(addressToFetch?: string) {
    const address = addressToFetch || inputAddress
    if (!address) return

    try {
      setLoading(true)
      setDisclosedData(null)
      setVerificationResult(null)

      const data = await readContract(config, {
        ...contractConfig,
        functionName: 'getUserCredentials',
        args: [address as `0x${string}`],
      })

      const creds = data as Credential[]
      setCredentials(creds)
      await resolveIssuerTrust(creds)

      // 🔥 AUTO VERIFY IF HASH PROVIDED
      if (hashParam) {
        const index = creds.findIndex(
          (cred) => cred.credentialHash === hashParam
        )

        if (index !== -1) {
          await verifyCredential(index, creds)
        }
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ---------------- AUTO FETCH ----------------
  useEffect(() => {
    if (inputAddress) {
      fetchCredentials(inputAddress)
    }
  }, [inputAddress])

  // ---------------- VERIFY ----------------
  async function verifyCredential(
    index: number,
    credsOverride?: Credential[]
  ) {
    const creds = credsOverride || credentials
    const cred = creds[index]

    if (!cred.isValid) {
      setVerificationResult('❌ Credential Revoked')
      return
    }

    try {
      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`
      )

      const json = await res.json()

      const recomputedHash = keccak256(
        stringToBytes(JSON.stringify(json))
      )

      const isIssuerTrusted = await checkIssuerTrust(cred.issuer)
      const trustMessage = isIssuerTrusted
        ? 'Issuer is trusted ✅'
        : 'Issuer is not trusted ❌'

      if (recomputedHash === cred.credentialHash) {
        setVerificationResult(`✅ Credential Verified (Authentic) | ${trustMessage}`)
      } else {
        setVerificationResult(`❌ Credential Tampered | ${trustMessage}`)
      }

    } catch (err) {
      console.error(err)
      setVerificationResult('❌ Failed to fetch IPFS document')
    }
  }

  async function authenticateBiometric() {
    setBiometricLoading(true)

    try {
      const result = await authenticateWithBiometric(inputAddress || 'neuralhash-verifier')
      if (!result.ok) {
        toast.error(result.message)
        return false
      }

      return true
    } catch (err) {
      console.error(err)
      toast.error('Biometric authentication failed.')
      return false
    } finally {
      setBiometricLoading(false)
    }
  }

  // ---------------- SELECTIVE DISCLOSURE ----------------
  async function selectiveDisclosure(index: number) {
    const isAuthenticated = await authenticateBiometric()
    if (!isAuthenticated) {
      return
    }

    const cred = credentials[index]

    try {
      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`
      )

      const json = await res.json()
      const credentialData = json?.credential ?? json

      if (!credentialData || typeof credentialData !== 'object') {
        setDisclosedData({})
        return
      }

      const filteredEntries = Object.entries(credentialData as Record<string, unknown>).filter(
        ([key]) => key !== 'issuedTo' && key !== 'timestamp'
      )

      const dynamicFields: DisclosedData = {}
      filteredEntries.forEach(([key, value]) => {
        dynamicFields[key] = value
      })

      setDisclosedData(dynamicFields)

    } catch (err) {
      console.error(err)
    }
  }

  // ---------------- UI ----------------
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-orange-50">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <ColorBends
          className="h-full w-full"
          colors={['#ff9c42', '#ff6d22', '#0a0b10', '#050507']}
          speed={0.16}
          noise={0.02}
          parallax={0.45}
          mouseInfluence={0.9}
          warpStrength={1.0}
          frequency={1.0}
          autoRotate={0.28}
          scale={1.2}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,2,4,0.72)_0%,rgba(2,2,4,0.84)_100%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <main className="space-y-6">
          <div className="flex justify-start">
            <ViewToggle active="verifier" />
          </div>

          <section className=" relative overflow-hidden rounded-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <p className="nh-chip inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                NeuralHash Verifier Space
              </p>

              <button
                type="button"
                onClick={() => {
                  disconnect()
                  router.replace('/')
                }}
                className="nh-button-secondary rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition"
              >
                Disconnect
              </button>
            </div>

            <div className="max-w-2xl">
              <h2 className="mt-4 text-4xl font-black leading-tight text-orange-50 sm:text-5xl">
                verify with confidence
                <span className="mt-1  px-2 text-orange-200">without revealing everything</span>
              </h2>
              <p className="mt-4 text-sm nh-text-muted sm:text-base">
                Check authenticity and selectively disclose only the data you need.
              </p>
            </div>

            {/* <div className="image-placeholder mt-6 rounded-2xl bg-white/80 p-6 text-center text-sm font-semibold text-slate-500">
              IMAGE PLACEHOLDER (verification hero visual over lined background)
            </div> */}
          </section>

          <section className="nh-panel rounded-lg p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-orange-50 sm:text-3xl">
              Public Credential Verification
            </h2>
            <p className="mt-1 text-sm nh-text-muted">
              Lookup wallet credentials, verify integrity, and perform selective disclosure.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="nh-input w-full rounded-xl px-3 py-2"
                placeholder="Enter Wallet Address"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
              />

              <button
                className="nh-button-primary rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => fetchCredentials()}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Fetch Credentials'}
              </button>
            </div>
          </section>

          {disclosedData && (
            <section className="nh-panel rounded-lg p-5 sm:p-6">
              <h3 className="text-2xl font-bold text-orange-50 sm:text-3xl">Selectively Disclosed Information</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(disclosedData).map(([key, value]) => (
                  <div key={key} className="nh-glass rounded-lg border border-orange-400/28 p-3 text-md text-orange-100/85">
                    <span className="font-semibold capitalize text-orange-50">{key}:</span>{' '}
                    {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                      ? String(value)
                      : JSON.stringify(value)}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="nh-panel rounded-lg p-5 sm:p-6">
            <h3 className="text-2xl font-bold text-orange-50 sm:text-3xl">Credential Records</h3>
            <p className="mt-1 text-sm nh-text-muted">Verify cryptographic integrity before accepting any claim.</p>
            <p className="mt-1 text-xs text-orange-100/70">Selective disclosure requires biometric authentication.</p>

            {credentials.length === 0 && !loading && (
              <div className="nh-glass mt-5 rounded-lg border border-dashed border-orange-400/35 p-6 text-sm text-orange-100/70">
                No credentials found.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {credentials.map((cred, index) => (
                <article key={index} className="nh-glass rounded-lg border border-orange-400/28 p-5">
                  <div className="space-y-2 text-sm text-orange-100/85">
                    <p>
                      <span className="font-semibold text-orange-50">IPFS CID:</span>{' '}
                      <span className="break-all">{cred.ipfsCID}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-orange-50">Issuer:</span> <span className="break-all">{cred.issuer}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-orange-50">Trust:</span>{' '}
                      <span
                        className={
                          issuerTrustMap[cred.issuer.toLowerCase()]
                            ? 'font-semibold text-emerald-300'
                            : 'font-semibold text-rose-300'
                        }
                      >
                        {issuerTrustMap[cred.issuer.toLowerCase()] ? 'Trusted ✅' : 'Not Trusted ❌'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-orange-50">Status:</span>{' '}
                      <span className={cred.isValid ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
                        {cred.isValid ? 'Active' : 'Revoked'}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="nh-button-primary rounded-xl px-4 py-2 text-sm font-semibold transition"
                      onClick={() => verifyCredential(index)}
                    >
                      Verify Integrity
                    </button>

                    <button
                      className="nh-button-secondary rounded-xl px-4 py-2 text-sm font-semibold transition"
                      onClick={() => selectiveDisclosure(index)}
                      disabled={biometricLoading}
                    >
                      {biometricLoading ? 'Authenticating...' : 'Selective Disclosure'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      {verificationResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verification-result-title"
        >
          <section className="nh-panel w-full max-w-lg rounded-lg p-5 sm:p-6">
            <p id="verification-result-title" className="text-2xl font-bold text-orange-50 sm:text-3xl">
              Verification Result
            </p>
            <p className="mt-2 text-lg text-orange-100/85">{verificationResult}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="nh-button-primary rounded-xl px-4 py-2 text-sm font-semibold transition"
                onClick={() => setVerificationResult(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
