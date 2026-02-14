'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { readContract } from 'wagmi/actions'
import { useAccount, useConfig, useDisconnect } from 'wagmi'
import { isAddress, keccak256, stringToBytes } from 'viem'
import { useSearchParams, useRouter } from 'next/navigation'
import { contractConfig } from '../contract'
import { interactionHubConfig } from '../interactionHub'
import { trustRegistryConfig } from '../trustRegistry'
import { authenticateWithBiometric } from '../biometricAuth'
import { ViewToggle } from '../components/home/ViewToggle'
import { CredentialsSection } from '../components/home/CredentialsSection'
import ColorBends from '../components/home/ColorBends'
import DecryptedText from '../components/home/DecryptedText'
import { useToast } from '../components/ui/ToastProvider'

type Credential = {
  ipfsCID: string
  issuer: `0x${string}`
  isValid: boolean
  issuedAt: bigint
  credentialHash: `0x${string}`
}

type AttestationTuple = readonly [
  `0x${string}`,
  `0x${string}`,
  string,
  bigint,
]

type SharedCidRecord = {
  cid: string
  from: `0x${string}`
  timestamp: bigint
}

type DisclosedData = Record<string, unknown>
const CREDENTIALS_PER_PAGE = 5
const PUBLIC_DISCLOSURE_FIELDS = new Set(['type', 'documentType', 'year'])

function maskCid(cid: string) {
  if (cid.length <= 18) {
    return cid
  }
  return `${cid.slice(0, 10)}...${cid.slice(-8)}`
}

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
  const { address: connectedAddress } = useAccount()
  const config = useConfig()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const userParam = searchParams.get('user')
  const hashParam = searchParams.get('hash')

  const [disclosedData, setDisclosedData] = useState<DisclosedData | null>(null)
  const [disclosedCredentialIndex, setDisclosedCredentialIndex] = useState<number | null>(null)
  const [inputAddress, setInputAddress] = useState('')
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [issuerTrustMap, setIssuerTrustMap] = useState<Record<string, boolean>>({})
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sharedCids, setSharedCids] = useState<SharedCidRecord[]>([])
  const [sharedCidsLoading, setSharedCidsLoading] = useState(false)
  const [biometricLoadingIndex, setBiometricLoadingIndex] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [credentialOwnerAddress, setCredentialOwnerAddress] = useState<`0x${string}` | null>(null)

  async function loadSharedCids(addressToFetch: `0x${string}`) {
    try {
      setSharedCidsLoading(true)

      const data = await readContract(config, {
        ...interactionHubConfig,
        functionName: 'getAttestations',
        args: [addressToFetch],
      })

      const records = (data as readonly AttestationTuple[])
        .map((attestation) => {
          const statement = attestation[2]
          const prefix = 'selected_cid:'

          if (!statement.startsWith(prefix)) {
            return null
          }

          const cid = statement.slice(prefix.length).trim()
          if (!cid) {
            return null
          }

          return {
            cid,
            from: attestation[0],
            timestamp: attestation[3],
          } satisfies SharedCidRecord
        })
        .filter((entry): entry is SharedCidRecord => Boolean(entry))

      setSharedCids(records)
    } catch (error) {
      console.error(error)
      setSharedCids([])
    } finally {
      setSharedCidsLoading(false)
    }
  }

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
      const normalizedAddress = userParam.trim()
      setInputAddress(normalizedAddress)
      fetchCredentials(normalizedAddress)
    }
  }, [userParam])

  useEffect(() => {
    if (!userParam && connectedAddress && !inputAddress.trim()) {
      const normalizedAddress = connectedAddress.trim()
      setInputAddress(normalizedAddress)
      void fetchCredentials(normalizedAddress)
    }
  }, [userParam, connectedAddress, inputAddress])

  // ---------------- FETCH CREDENTIALS ----------------
  async function fetchCredentials(addressToFetch?: string) {
    const address = (addressToFetch || inputAddress).trim()
    if (!address) return
    if (!isAddress(address)) {
      setCredentials([])
      setCredentialOwnerAddress(null)
      setIssuerTrustMap({})
      setDisclosedData(null)
      setDisclosedCredentialIndex(null)
      setVerificationResult(null)
      setCurrentPage(1)
      toast.error('Please enter a valid wallet address.')
      return
    }

    try {
      setLoading(true)
      setDisclosedData(null)
      setDisclosedCredentialIndex(null)
      setVerificationResult(null)

      const data = await readContract(config, {
        ...contractConfig,
        functionName: 'getUserCredentials',
        args: [address as `0x${string}`],
      })

      const creds = data as Credential[]
      setCurrentPage(1)
      setCredentials(creds)
      setCredentialOwnerAddress(address as `0x${string}`)
      await resolveIssuerTrust(creds)
      await loadSharedCids(address as `0x${string}`)

      // 🔥 AUTO VERIFY IF HASH PROVIDED
      const normalizedUserParam = userParam?.trim().toLowerCase()
      const shouldAutoVerifyFromQuery =
        Boolean(hashParam) &&
        Boolean(normalizedUserParam) &&
        address.toLowerCase() === normalizedUserParam

      if (shouldAutoVerifyFromQuery) {
        const index = creds.findIndex(
          (cred) => cred.credentialHash === hashParam
        )

        if (index !== -1) {
          await verifyCredential(index, creds)
        }
      }

    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch credentials.')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(credentials.length / CREDENTIALS_PER_PAGE))
  const currentPageStart = (currentPage - 1) * CREDENTIALS_PER_PAGE
  const paginatedCredentials = credentials.slice(currentPageStart, currentPageStart + CREDENTIALS_PER_PAGE)
  const currentPageEnd = Math.min(currentPageStart + paginatedCredentials.length, credentials.length)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // ---------------- VERIFY ----------------
  async function verifyCredential(
    index: number,
    credsOverride?: Credential[]
  ) {
    const creds = credsOverride || credentials
    const cred = creds[index]
    if (!cred) {
      toast.error('Credential record not found.')
      return
    }

    if (!cred.isValid) {
      setVerificationResult('❌ Credential Revoked')
      return
    }

    try {
      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`
      )
      if (!res.ok) {
        throw new Error('Unable to fetch credential payload from IPFS.')
      }

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

  async function authenticateBiometric(index: number) {
    setBiometricLoadingIndex(index)

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
      setBiometricLoadingIndex(null)
    }
  }

  // ---------------- SELECTIVE DISCLOSURE ----------------
  async function selectiveDisclosure(index: number) {
    const isAuthenticated = await authenticateBiometric(index)
    if (!isAuthenticated) {
      return
    }

    const cred = credentials[index]
    if (!cred) {
      toast.error('Credential record not found.')
      return
    }
    if (!cred.isValid) {
      toast.error('Cannot disclose data from a revoked credential.')
      return
    }

    try {
      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`
      )
      if (!res.ok) {
        throw new Error('Unable to fetch credential metadata from IPFS.')
      }

      const json = await res.json()
      const credentialData = json?.credential ?? json

      if (!credentialData || typeof credentialData !== 'object') {
        setDisclosedCredentialIndex(index)
        setDisclosedData({})
        return
      }

      const filteredEntries = Object.entries(credentialData as Record<string, unknown>).filter(
        ([key, value]) => {
          if (!PUBLIC_DISCLOSURE_FIELDS.has(key)) {
            return false
          }
          if (value === null || value === undefined) {
            return false
          }
          return typeof value === 'string' ? value.trim().length > 0 : true
        }
      )

      const dynamicFields: DisclosedData = {}
      filteredEntries.forEach(([key, value]) => {
        dynamicFields[key] = value
      })

      setDisclosedCredentialIndex(index)
      setDisclosedData(dynamicFields)

    } catch (err) {
      console.error(err)
      toast.error('Failed to disclose credential details.')
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
                <span className="block bg-linear-to-r from-orange-400/25 to-transparent px-2 text-orange-200">
                  <DecryptedText
                    text="without revealing everything"
                    animateOn="view"
                    sequential={true}
                    revealDirection="start"
                    speed={35}
                    className="text-orange-200"
                    encryptedClassName="text-orange-200/45"
                    parentClassName="block"
                  />
                </span>
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

          <section className="nh-panel rounded-lg p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-bold text-orange-50 sm:text-3xl">Received Shared CIDs</h3>
              <button
                type="button"
                className="nh-button-secondary rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  const trimmedAddress = inputAddress.trim()
                  if (!trimmedAddress || !isAddress(trimmedAddress)) {
                    toast.error('Enter a valid wallet address first.')
                    return
                  }

                  void loadSharedCids(trimmedAddress as `0x${string}`)
                }}
                disabled={sharedCidsLoading}
              >
                {sharedCidsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <p className="mt-1 text-sm nh-text-muted">
              Parsed from attestations in format <span className="font-mono">selected_cid:&lt;cid&gt;</span>.
            </p>

            {sharedCids.length === 0 && !sharedCidsLoading && (
              <div className="nh-glass mt-5 rounded-lg border border-dashed border-orange-400/35 p-6 text-sm text-orange-100/70">
                No shared CIDs found for this wallet.
              </div>
            )}

            {sharedCids.length > 0 && (
              <div className="mt-5 space-y-3">
                {sharedCids.map((entry, index) => (
                  <article key={`${entry.cid}-${index}`} className="nh-glass rounded-lg border border-orange-400/28 p-4 text-sm text-orange-100/85">
                    <p>
                      <span className="font-semibold text-orange-50">From:</span>{' '}
                      <span className="break-all">{entry.from}</span>
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-orange-50">Timestamp:</span>{' '}
                      {new Date(Number(entry.timestamp) * 1000).toLocaleString()}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-orange-50">CID:</span>{' '}
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${entry.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-orange-300 underline decoration-orange-400/70 underline-offset-2 hover:text-orange-200"
                      >
                        {entry.cid}
                      </a>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="nh-panel rounded-lg p-5 sm:p-6">
            <h3 className="text-2xl font-bold text-orange-50 sm:text-3xl">Credential Records</h3>
            <p className="mt-1 text-sm nh-text-muted">Verify cryptographic integrity before accepting any claim.</p>
            <p className="mt-1 text-xs text-orange-100/70">Selective disclosure requires biometric authentication.</p>

            {credentials.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-orange-100/70">
                <p>
                  Showing {currentPageStart + 1}-{currentPageEnd} of {credentials.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.max(value - 1, 1))}
                    disabled={currentPage === 1}
                    className="nh-button-secondary rounded-xl px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.min(value + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="nh-button-secondary rounded-xl px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {credentials.length === 0 && !loading && (
              <div className="nh-glass mt-5 rounded-lg border border-dashed border-orange-400/35 p-6 text-sm text-orange-100/70">
                No credentials found.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {paginatedCredentials.map((cred, pageIndex) => {
                const index = currentPageStart + pageIndex
                return (
                <article key={`${cred.credentialHash}-${index}`} className="nh-glass rounded-lg border border-orange-400/28 p-5">
                  <div className="space-y-2 text-sm text-orange-100/85">
                    <p>
                      <span className="font-semibold text-orange-50">IPFS CID:</span>{' '}
                      <span className="break-all">{maskCid(cred.ipfsCID)}</span>
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
                      disabled={biometricLoadingIndex !== null}
                    >
                      {biometricLoadingIndex === index ? 'Authenticating...' : 'Selective Disclosure'}
                    </button>
                  </div>

                  {disclosedData && disclosedCredentialIndex === index && (
                    <div className="mt-4">
                      <p className="text-lg font-semibold text-orange-50">Selectively Disclosed Information</p>
                      {Object.entries(disclosedData).length === 0 ? (
                        <p className="mt-2 text-sm text-orange-100/75">
                          No public fields are available for disclosure on this credential.
                        </p>
                      ) : (
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
                      )}
                    </div>
                  )}
                </article>
              )})}
            </div>
          </section>

          {credentialOwnerAddress && (
            <CredentialsSection
              credentials={credentials}
              address={credentialOwnerAddress}
              revokingCredentialHash={null}
              authenticatingCredentialHash={null}
              onRevoke={() => {
              }}
            />
          )}
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
