'use client'

import { useState } from 'react'
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
import { DashboardHeader } from './components/home/DashboardHeader'
import { StatsGrid } from './components/home/StatsGrid'
import { ConnectWalletPrompt } from './components/home/ConnectWalletPrompt'
import { IssueCredentialSection } from './components/home/IssueCredentialSection'
import { CredentialsSection } from './components/home/CredentialsSection'
import { ViewToggle } from './components/home/ViewToggle'
import type { Credential } from './components/home/types'

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
    <div className="min-h-screen bg-lime-100/70 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <main className="space-y-6">
          <div className="flex justify-start">
            <ViewToggle active="issuer" />
          </div>

          <DashboardHeader />

          <section className="paper-grid relative overflow-hidden rounded-3xl border border-slate-300/70 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-2xl">
              <p className="inline-block rounded-full border border-slate-300 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                NeuralHash Issuer Space
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
                the credential hub
                <span className="block bg-pink-200/70 px-2 text-slate-900">for modern SSI workflows</span>
              </h2>
              <p className="mt-4 text-sm text-slate-600 sm:text-base">
                Keep issuing, revoking, and sharing verifiable credentials with a clean dashboard flow.
              </p>
            </div>

            {/* <div className="image-placeholder mt-6 rounded-2xl bg-white/80 p-6 text-center text-sm font-semibold text-slate-500">
              IMAGE PLACEHOLDER (hero visual over lined background)
            </div> */}
          </section>

          <StatsGrid
            walletConnected={Boolean(address)}
            totalCredentials={credentials.length}
            activeCredentials={activeCredentials}
            revokedCredentials={revokedCredentials}
          />

          {!address ? (
            <ConnectWalletPrompt />
          ) : (
            <>
              <IssueCredentialSection
                name={name}
                type={type}
                year={year}
                loading={loading}
                onNameChange={setName}
                onTypeChange={setType}
                onYearChange={setYear}
                onIssue={handleIssue}
              />

              <CredentialsSection
                credentials={credentials}
                address={address}
                loading={loading}
                onRevoke={handleRevoke}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
