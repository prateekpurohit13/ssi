'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { readContract } from 'wagmi/actions'
import { useConfig } from 'wagmi'
import { keccak256, stringToBytes } from 'viem'
import { useSearchParams } from 'next/navigation'
import { contractConfig } from '../contract'

type Credential = {
  ipfsCID: string
  issuer: `0x${string}`
  isValid: boolean
  issuedAt: bigint
  credentialHash: `0x${string}`
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 text-slate-700">
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
  const searchParams = useSearchParams()

  const userParam = searchParams.get('user')
  const hashParam = searchParams.get('hash')

  const [disclosedData, setDisclosedData] = useState<any>(null)
  const [inputAddress, setInputAddress] = useState('')
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    credsOverride?: any[]
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

      if (recomputedHash === cred.credentialHash) {
        setVerificationResult('✅ Credential Verified (Authentic)')
      } else {
        setVerificationResult('❌ Credential Tampered')
      }

    } catch (err) {
      console.error(err)
      setVerificationResult('❌ Failed to fetch IPFS document')
    }
  }

  // ---------------- SELECTIVE DISCLOSURE ----------------
  async function selectiveDisclosure(index: number) {
    const cred = credentials[index]

    try {
      const res = await fetch(
        `https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`
      )

      const json = await res.json()

      setDisclosedData({
        type: json.type,
        year: json.year,
      })

    } catch (err) {
      console.error(err)
    }
  }

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
              NeuralHash
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Verifier Hub</h1>
            <p className="mt-2 text-sm text-slate-500">
              Validate authenticity and disclose only required fields.
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-medium">
            <Link
              href="/"
              className="flex items-center rounded-xl px-4 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Issuer Dashboard
            </Link>
            <span className="flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-white">
              Verifier Portal
            </span>
          </nav>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Public Credential Verification
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lookup wallet credentials, verify integrity, and perform selective disclosure.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
                placeholder="Enter Wallet Address"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
              />

              <button
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => fetchCredentials()}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Fetch Credentials'}
              </button>
            </div>
          </section>

          {verificationResult && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-lg font-semibold text-slate-900">Verification Result</p>
              <p className="mt-2 text-sm text-slate-700">{verificationResult}</p>
            </section>
          )}

          {disclosedData && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Selectively Disclosed Information</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Type:</span> {disclosedData.type}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Year:</span> {disclosedData.year}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Credential Records</h3>
            <p className="mt-1 text-sm text-slate-500">Verify cryptographic integrity before accepting any claim.</p>

            {credentials.length === 0 && !loading && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No credentials found.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {credentials.map((cred, index) => (
                <article key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">IPFS CID:</span>{' '}
                      <span className="break-all">{cred.ipfsCID}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Issuer:</span> <span className="break-all">{cred.issuer}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Status:</span>{' '}
                      <span className={cred.isValid ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                        {cred.isValid ? 'Active' : 'Revoked'}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                      onClick={() => verifyCredential(index)}
                    >
                      Verify Integrity
                    </button>

                    <button
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
                      onClick={() => selectiveDisclosure(index)}
                    >
                      Selective Disclosure
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
