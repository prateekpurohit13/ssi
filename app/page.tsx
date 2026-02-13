'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useConfig,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { keccak256, stringToBytes } from 'viem'
import { contractConfig } from './contract'
import { uploadToIPFS } from './ipfs'
import { QRCodeCanvas } from 'qrcode.react'

type Credential = {
  ipfsCID: string
  issuer: `0x${string}`
  isValid: boolean
  issuedAt: bigint
  credentialHash: `0x${string}`
}

export default function Home() {
  const { address } = useAccount()
  const config = useConfig()

  const { data, refetch } = useReadContract({
    ...contractConfig,
    functionName: 'getUserCredentials',
    args: address ? [address] : undefined,
  })

  const { writeContractAsync } = useWriteContract()

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)

  const credentials = (data ?? []) as Credential[]
  const activeCredentials = credentials.filter((cred) => cred.isValid).length
  const revokedCredentials = credentials.length - activeCredentials

  // ---------------- ISSUE ----------------

  async function handleIssue() {
    if (!address) return

    try {
      setLoading(true)

      const credential = {
        name,
        type,
        year,
        issuedTo: address,
        timestamp: new Date().toISOString(),
      }

      const cid = await uploadToIPFS(credential)

      const hashValue = keccak256(
        stringToBytes(JSON.stringify(credential))
      )

      const txHash = await writeContractAsync({
        ...contractConfig,
        functionName: 'issueCredential',
        args: [address, hashValue, cid],
      })

      await waitForTransactionReceipt(config, { hash: txHash })

      setName('')
      setType('')
      setYear('')

      await refetch()
      alert('Credential Issued Successfully!')
    } catch (err) {
      console.error(err)
      alert('Error issuing credential')
    } finally {
      setLoading(false)
    }
  }

  // ---------------- REVOKE ----------------

  async function handleRevoke(credentialHash: `0x${string}`) {
    if (!address) return

    try {
      setLoading(true)

      const txHash = await writeContractAsync({
        ...contractConfig,
        functionName: 'revokeCredential',
        args: [address, credentialHash],
      })

      await waitForTransactionReceipt(config, { hash: txHash })

      await refetch()
      alert('Credential Revoked Successfully')
    } catch (err) {
      console.error(err)
      alert('Revoke Failed')
    } finally {
      setLoading(false)
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
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              SSI Console
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Issue and manage verifiable credentials on-chain.
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-medium">
            <span className="flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-white">
              Issuer Dashboard
            </span>
            <Link
              href="/verify"
              className="flex items-center rounded-xl px-4 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Verifier Portal
            </Link>
          </nav>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Credential Dashboard
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage issuance, revocation, and verification QR flows.
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <ConnectButton />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Wallet" value={address ? 'Connected' : 'Not connected'} />
            <StatCard label="Total Credentials" value={String(credentials.length)} />
            <StatCard label="Active" value={String(activeCredentials)} />
            <StatCard label="Revoked" value={String(revokedCredentials)} />
          </div>

          {!address ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Connect wallet to continue</h3>
              <p className="mt-2 text-sm text-slate-500">
                Once connected, you can issue and revoke credentials exactly as before.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900">Issue Credential</h3>
                <p className="mt-1 text-sm text-slate-500">Create a new verifiable credential and anchor it with IPFS + blockchain hash.</p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Name</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
                      placeholder="Alice Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Type</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
                      placeholder="Refugee ID / Degree / License"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Year</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
                      placeholder="2026"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleIssue}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Issue Credential'}
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold text-slate-900">Issued Credentials</h3>
                <p className="mt-1 text-sm text-slate-500">Each card includes status, provenance, and shareable verification QR.</p>

                {credentials.length === 0 && (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    No credentials issued yet.
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  {credentials.map((cred, i) => (
                    <article key={i} className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-[1fr_auto]">
                      <div className="space-y-2 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold text-slate-900">IPFS CID:</span>{' '}
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-medium text-indigo-600 underline-offset-4 hover:underline"
                          >
                            {cred.ipfsCID}
                          </a>
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">Issuer:</span> <span className="break-all">{cred.issuer}</span>
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">Status:</span>{' '}
                          <span className={cred.isValid ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                            {cred.isValid ? 'Active' : 'Revoked'}
                          </span>
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">Issued At:</span>{' '}
                          {new Date(Number(cred.issuedAt) * 1000).toLocaleString()}
                        </p>

                        {cred.isValid && cred.issuer === address && (
                          <button
                            className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleRevoke(cred.credentialHash)}
                            disabled={loading}
                          >
                            {loading ? 'Processing...' : 'Revoke Credential'}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Scan to Verify</p>
                        <QRCodeCanvas
                          value={
                            typeof window !== 'undefined'
                              ? `${window.location.origin}/verify?user=${address}&hash=${cred.credentialHash}`
                              : ''
                          }
                          size={140}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
