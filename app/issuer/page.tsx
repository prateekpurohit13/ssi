'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useAccount,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useConfig,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { isAddress, keccak256, stringToBytes } from 'viem'
import { contractConfig } from '../contract'
import { uploadToIPFS } from '../ipfs'
import { DashboardHeader } from '../components/home/DashboardHeader'
import { StatsGrid } from '../components/home/StatsGrid'
import { IssueCredentialSection } from '../components/home/IssueCredentialSection'
import { CredentialsSection } from '../components/home/CredentialsSection'
import { ViewToggle } from '../components/home/ViewToggle'
import ColorBends from '../components/home/ColorBends'
import type { Credential } from '../components/home/types'

export default function IssuerPage() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const config = useConfig()

  useEffect(() => {
    if (!address) {
      router.replace('/')
    }
  }, [address, router])

  const { data, refetch } = useReadContract({
    ...contractConfig,
    functionName: 'getUserCredentials',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  })

  const { writeContractAsync } = useWriteContract()

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [recipient, setRecipient] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const credentials = (data ?? []) as Credential[]
  const activeCredentials = credentials.filter((cred) => cred.isValid).length
  const revokedCredentials = credentials.length - activeCredentials

  async function handleExtract() {
    if (!file) {
      alert('Upload a PDF first')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        throw new Error(result.error ?? 'Extraction failed')
      }

      if (!result.data) {
        alert('Extraction failed')
        return
      }

      setName(result.data.name ?? '')
      setType(result.data.documentType ?? '')
      setYear(result.data.year ?? '')

      alert('Data extracted successfully!')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Extraction error')
    } finally {
      setLoading(false)
    }
  }

  async function handleIssue() {
    if (!address) return

    try {
      setLoading(true)
      const targetAddress =
        recipient && isAddress(recipient)
          ? (recipient as `0x${string}`)
          : address

      const credential = {
        name,
        type,
        year,
        issuedTo: targetAddress,
        timestamp: new Date().toISOString(),
      }

      const cid = await uploadToIPFS(credential)

      const hashValue = keccak256(
        stringToBytes(JSON.stringify(credential))
      )

      const txHash = await writeContractAsync({
        ...contractConfig,
        functionName: 'issueCredential',
        args: [targetAddress, hashValue, cid],
      })

      await waitForTransactionReceipt(config, { hash: txHash })

      setName('')
      setType('')
      setYear('')
      setRecipient('')
      setFile(null)

      await refetch()
      alert('Credential Issued Successfully!')
    } catch (err) {
      console.error(err)
      alert('Error issuing credential')
    } finally {
      setLoading(false)
    }
  }

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

  if (!address) {
    return null
  }

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
            <ViewToggle active="issuer" />
          </div>

          <DashboardHeader />

          <div className="flex justify-end">
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

          <section className=" relative overflow-hidden rounded-xl p-6 sm:p-6">
            <div className="max-w-2xl">
              <p className="nh-chip inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                NeuralHash Issuer Space
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-orange-50 sm:text-5xl">
                the credential hub
                <span className="block bg-linear-to-r from-orange-400/25 to-transparent px-2 text-orange-200">for modern SSI workflows</span>
              </h2>
              <p className="mt-4 text-sm nh-text-muted sm:text-base">
                Keep issuing, revoking, and sharing verifiable credentials with a clean dashboard flow.
              </p>
            </div>
          </section>

          <StatsGrid
            walletConnected={Boolean(address)}
            totalCredentials={credentials.length}
            activeCredentials={activeCredentials}
            revokedCredentials={revokedCredentials}
          />

          <IssueCredentialSection
            name={name}
            type={type}
            year={year}
            recipient={recipient}
            file={file}
            loading={loading}
            onNameChange={setName}
            onTypeChange={setType}
            onYearChange={setYear}
            onRecipientChange={setRecipient}
            onFileChange={setFile}
            onExtract={handleExtract}
            onIssue={handleIssue}
          />

          <CredentialsSection
            credentials={credentials}
            address={address}
            loading={loading}
            onRevoke={handleRevoke}
          />
        </main>
      </div>
    </div>
  )
}
