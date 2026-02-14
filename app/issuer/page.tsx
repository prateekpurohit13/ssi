'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useAccount,
  useChainId,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useConfig,
} from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import { formatEther, formatGwei, isAddress, keccak256, stringToBytes } from 'viem'
import { contractConfig } from '../contract'
import { trustRegistryConfig } from '../trustRegistry'
import { interactionHubConfig } from '../interactionHub'
import { authenticateWithBiometric } from '../biometricAuth'
import { uploadFileToIPFS, uploadToIPFS } from '../ipfs'
import { DashboardHeader } from '../components/home/DashboardHeader'
import { StatsGrid } from '../components/home/StatsGrid'
import { IssueCredentialSection } from '../components/home/IssueCredentialSection'
import { CredentialsSection } from '../components/home/CredentialsSection'
import { BlockchainAnalyticsSection } from '../components/home/BlockchainAnalyticsSection'
import { ViewToggle } from '../components/home/ViewToggle'
import ColorBends from '../components/home/ColorBends'
import DecryptedText from '../components/home/DecryptedText'
import type { Credential } from '../components/home/types'
import { useToast } from '../components/ui/ToastProvider'
import {
  DOCUMENT_SCHEMAS,
  DOCUMENT_TYPE_OPTIONS,
  normalizeDocumentType,
  type SupportedDocumentType,
} from '../documentSchemas'

type ClaimRequestTuple = readonly [
  bigint,
  `0x${string}`,
  `0x${string}`,
  string,
  boolean,
  bigint,
]

type AttestationTuple = readonly [
  `0x${string}`,
  `0x${string}`,
  string,
  bigint,
]

type AttestationObject = {
  attester?: `0x${string}`
  statement?: string
}

type IssuanceTxDetails = {
  hash: `0x${string}`
  blockNumber: bigint
  confirmations: bigint
  blockHash: `0x${string}`
  timestamp: bigint
  gasUsed: bigint
  effectiveGasPrice: bigint
  ethSpent: bigint
  usdEquivalent?: number
}

function isAttestationTuple(value: AttestationTuple | AttestationObject): value is AttestationTuple {
  return Array.isArray(value)
}

export default function IssuerPage() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const config = useConfig()
  const publicClient = usePublicClient()
  const toast = useToast()

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

  const { data: trustStatus, isLoading: trustLoading } = useReadContract({
    ...trustRegistryConfig,
    functionName: 'isTrusted',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  })

  const { data: requestIds } = useReadContract({
    ...interactionHubConfig,
    functionName: 'getRequestsForUser',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  })

  const { data: attestations } = useReadContract({
    ...interactionHubConfig,
    functionName: 'getAttestations',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  })

  const { writeContractAsync } = useWriteContract()

  const [selectedDocumentType, setSelectedDocumentType] = useState<SupportedDocumentType>('10th Marksheet')
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({})
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([])
  const [recipient, setRecipient] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [hubTargetAddress, setHubTargetAddress] = useState('')
  const [claimReason, setClaimReason] = useState('')
  const [attestationText, setAttestationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [attestationLoading, setAttestationLoading] = useState(false)
  const [acceptingRequestId, setAcceptingRequestId] = useState<bigint | null>(null)
  const [revokingCredentialHash, setRevokingCredentialHash] = useState<`0x${string}` | null>(null)
  const [authenticatingIssue, setAuthenticatingIssue] = useState(false)
  const [authenticatingRevokeHash, setAuthenticatingRevokeHash] = useState<`0x${string}` | null>(null)
  const [requests, setRequests] = useState<ClaimRequestTuple[]>([])
  const [latestIssuanceTx, setLatestIssuanceTx] = useState<IssuanceTxDetails | null>(null)

  useEffect(() => {
    async function loadRequests() {
      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        setRequests([])
        return
      }

      const results = await Promise.all(
        requestIds.map((id) =>
          readContract(config, {
            ...interactionHubConfig,
            functionName: 'claimRequests',
            args: [id],
          })
        )
      )

      setRequests(results as ClaimRequestTuple[])
    }

    void loadRequests()
  }, [config, requestIds])

  const credentials = (data ?? []) as Credential[]
  const activeCredentials = credentials.filter((cred) => cred.isValid).length
  const revokedCredentials = credentials.length - activeCredentials

  async function handleExtract() {
    if (!file) {
      toast.info('Upload a PDF first')
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

      if (res.status === 429 || result.code === 'QUOTA_EXCEEDED') {
        toast.error(result.error ?? 'Gemini quota exceeded. Please retry later.')
        return
      }

      if (!res.ok || result.error) {
        throw new Error(result.error ?? 'Extraction failed')
      }

      if (!result.data) {
        toast.error('Extraction failed')
        return
      }

      const extractedType = normalizeDocumentType(result.data.documentType ?? '')

      if (!extractedType) {
        toast.error('Could not identify document type from uploaded file.')
        setExtractedFields({})
        return
      }

      if (extractedType !== selectedDocumentType) {
        toast.error(`Wrong document uploaded. You selected ${selectedDocumentType}, but detected ${extractedType}.`)
        setExtractedFields({})
        return
      }

      const schemaFields = DOCUMENT_SCHEMAS[selectedDocumentType]
      const incomingFields = (result.data.fields ?? {}) as Record<string, string>

      const mappedFields = schemaFields.reduce<Record<string, string>>((acc, fieldKey) => {
        const value = incomingFields[fieldKey]
        acc[fieldKey] = typeof value === 'string' ? value : ''
        return acc
      }, {})

      setExtractedFields(mappedFields)
      setSelectedFieldKeys(
        schemaFields.filter((fieldKey) => Boolean(mappedFields[fieldKey]?.trim()))
      )

      toast.success('Data extracted successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Extraction error')
    } finally {
      setLoading(false)
    }
  }

  async function handleIssue() {
    if (
      !address ||
      loading ||
      authenticatingIssue ||
      Boolean(authenticatingRevokeHash) ||
      Boolean(revokingCredentialHash)
    ) {
      return
    }

    setAuthenticatingIssue(true)
    const biometricResult = await authenticateWithBiometric(address)
    setAuthenticatingIssue(false)

    if (!biometricResult.ok) {
      toast.error(biometricResult.message)
      return
    }

    try {
      setLoading(true)

      if (!file) {
        toast.info('Upload a document first.')
        return
      }

      const requiredFields = DOCUMENT_SCHEMAS[selectedDocumentType]
      const hasAnyExtractedValue = requiredFields.some((fieldKey) => Boolean(extractedFields[fieldKey]?.trim()))

      if (!hasAnyExtractedValue) {
        toast.info('Extract data from the uploaded document before issuing credential.')
        return
      }

      const selectedFields = selectedFieldKeys.reduce<Record<string, string>>((acc, fieldKey) => {
        const value = extractedFields[fieldKey]?.trim()
        if (value) {
          acc[fieldKey] = value
        }
        return acc
      }, {})

      if (Object.keys(selectedFields).length === 0) {
        toast.info('Select at least one extracted field to include in the credential.')
        return
      }

      const targetAddress =
        recipient && isAddress(recipient)
          ? (recipient as `0x${string}`)
          : address

      const documentCid = await uploadFileToIPFS(file)

      const primaryName =
        selectedFields.full_name ||
        selectedFields.student_name ||
        ''

      const yearOfRecord =
        selectedFields.year_of_passing ||
        selectedFields.date_of_birth ||
        ''

      const credential = {
        name: primaryName,
        type: selectedDocumentType,
        year: yearOfRecord,
        documentType: selectedDocumentType,
        fields: selectedFields,
        documentCid,
        documentName: file.name,
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

      if (publicClient) {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
        const [latestBlock, block] = await Promise.all([
          publicClient.getBlockNumber(),
          publicClient.getBlock({ blockHash: receipt.blockHash }),
        ])

        const confirmations = latestBlock >= receipt.blockNumber
          ? latestBlock - receipt.blockNumber + BigInt(1)
          : BigInt(0)
        const ethSpent = receipt.gasUsed * receipt.effectiveGasPrice

        let usdEquivalent: number | undefined
        try {
          const priceResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
          )

          if (priceResponse.ok) {
            const priceData = (await priceResponse.json()) as {
              ethereum?: { usd?: number }
            }

            if (priceData.ethereum?.usd) {
              usdEquivalent = Number(formatEther(ethSpent)) * priceData.ethereum.usd
            }
          }
        } catch (priceError) {
          console.warn('Failed to fetch ETH/USD quote', priceError)
        }

        setLatestIssuanceTx({
          hash: txHash,
          blockNumber: receipt.blockNumber,
          confirmations,
          blockHash: receipt.blockHash,
          timestamp: block.timestamp,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
          ethSpent,
          usdEquivalent,
        })
      }

      setExtractedFields({})
      setSelectedFieldKeys([])
      setRecipient('')
      setFile(null)

      await refetch()
      toast.success('Credential Issued Successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Error issuing credential')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(credentialHash: `0x${string}`) {
    if (
      !address ||
      loading ||
      authenticatingIssue ||
      Boolean(authenticatingRevokeHash) ||
      Boolean(revokingCredentialHash)
    ) {
      return
    }

    setAuthenticatingRevokeHash(credentialHash)
    const biometricResult = await authenticateWithBiometric(address)
    setAuthenticatingRevokeHash(null)

    if (!biometricResult.ok) {
      toast.error(biometricResult.message)
      return
    }

    try {
      setRevokingCredentialHash(credentialHash)

      const txHash = await writeContractAsync({
        ...contractConfig,
        functionName: 'revokeCredential',
        args: [address, credentialHash],
      })

      await waitForTransactionReceipt(config, { hash: txHash })

      await refetch()
      toast.success('Credential Revoked Successfully')
    } catch (err) {
      console.error(err)
      toast.error('Revoke Failed')
    } finally {
      setRevokingCredentialHash(null)
      setAuthenticatingRevokeHash(null)
    }
  }


  async function handleClaimRequest() {
    if (!address) {
      return
    }

    if (!hubTargetAddress || !isAddress(hubTargetAddress)) {
      toast.error('Enter a valid target wallet address for claim request.')
      return
    }

    if (!claimReason.trim()) {
      toast.info('Enter a claim reason first.')
      return
    }

    try {
      setClaimLoading(true)

      const txHash = await writeContractAsync({
        ...interactionHubConfig,
        functionName: 'createClaimRequest',
        args: [
          hubTargetAddress as `0x${string}`,
          ['type', 'year'],
          claimReason,
        ],
      })

      await waitForTransactionReceipt(config, { hash: txHash })
      toast.success('Claim Request Sent')
      setClaimReason('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to send claim request')
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleAttestation() {
    if (!address) {
      return
    }

    if (!hubTargetAddress || !isAddress(hubTargetAddress)) {
      toast.error('Enter a valid target wallet address for attestation.')
      return
    }

    if (!attestationText.trim()) {
      toast.info('Enter attestation text first.')
      return
    }

    try {
      setAttestationLoading(true)

      const txHash = await writeContractAsync({
        ...interactionHubConfig,
        functionName: 'createAttestation',
        args: [
          hubTargetAddress as `0x${string}`,
          attestationText,
        ],
      })

      await waitForTransactionReceipt(config, { hash: txHash })
      toast.success('Attestation Created')
      setAttestationText('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to create attestation')
    } finally {
      setAttestationLoading(false)
    }
  }

  async function handleAcceptRequest(requestId: bigint) {
    if (!address) {
      return
    }

    try {
      setAcceptingRequestId(requestId)

      const txHash = await writeContractAsync({
        ...interactionHubConfig,
        functionName: 'fulfillClaimRequest',
        args: [requestId],
      })

      await waitForTransactionReceipt(config, { hash: txHash })

      setRequests((prev) =>
        prev.map((request) =>
          request[0] === requestId
            ? [request[0], request[1], request[2], request[3], true, request[5]]
            : request
        ) as ClaimRequestTuple[]
      )

      toast.success('Claim request accepted')
    } catch (err) {
      console.error(err)
      toast.error('Failed to accept request')
    } finally {
      setAcceptingRequestId(null)
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

          <DashboardHeader chainId={chainId} />

          <section className="px-6 sm:px-6">
            <p className="inline-flex items-center gap-2 text-sm text-orange-100/80 sm:text-base">
              <span>Current user status:</span>
              {trustLoading ? (
                <span className="font-semibold text-orange-100">Checking...</span>
              ) : trustStatus ? (
                <span className="font-extrabold text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]">
                  Trusted
                </span>
              ) : (
                <span className="font-semibold text-rose-300">Not Trusted</span>
              )}
            </p>
          </section>

          <section className=" relative overflow-hidden rounded-md px-6 pb-6 pt-2 sm:px-6 sm:pb-6 sm:pt-2">
            <div className="flex items-start justify-between gap-4">
              <p className="nh-chip inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                NeuralHash Issuer Space
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
                the credential hub
                <span className="block bg-linear-to-r from-orange-400/25 to-transparent px-2 text-orange-200">
                  <DecryptedText
                    text="for modern SSI workflows"
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
                Keep issuing, revoking, and sharing verifiable credentials with a clean dashboard flow.
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,4.2fr)_minmax(200px,1fr)]">
            <IssueCredentialSection
              selectedDocumentType={selectedDocumentType}
              documentTypeOptions={DOCUMENT_TYPE_OPTIONS}
              fieldKeys={[...DOCUMENT_SCHEMAS[selectedDocumentType]]}
              extractedFields={extractedFields}
              selectedFieldKeys={selectedFieldKeys}
              recipient={recipient}
              file={file}
              loading={loading}
              authenticating={authenticatingIssue}
              onDocumentTypeChange={(nextType) => {
                setSelectedDocumentType(nextType)
                setExtractedFields({})
                setSelectedFieldKeys([])
              }}
              onFieldSelectionChange={(fieldKey, checked) => {
                setSelectedFieldKeys((prev) => {
                  if (checked) {
                    if (prev.includes(fieldKey)) {
                      return prev
                    }

                    return [...prev, fieldKey]
                  }

                  return prev.filter((key) => key !== fieldKey)
                })
              }}
              onRecipientChange={setRecipient}
              onFileChange={setFile}
              onExtract={handleExtract}
              onIssue={handleIssue}
            />

            <StatsGrid
              walletConnected={Boolean(address)}
              totalCredentials={credentials.length}
              activeCredentials={activeCredentials}
              revokedCredentials={revokedCredentials}
              layout="stack"
            />
          </section>

          <section className="nh-panel rounded-md p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-orange-50">Latest Issuance Transaction</h3>
            {!latestIssuanceTx ? (
              <p className="mt-2 text-sm nh-text-muted">
                Issue a credential to view block number, gas usage, confirmations, timestamp, and block hash.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Block Number</p>
                  <p className="mt-1 font-mono text-orange-50">{latestIssuanceTx.blockNumber.toString()}</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Transaction Confirmations</p>
                  <p className="mt-1 font-mono text-orange-50">{latestIssuanceTx.confirmations.toString()}</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Timestamp</p>
                  <p className="mt-1 font-mono text-orange-50">{new Date(Number(latestIssuanceTx.timestamp) * 1000).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm sm:col-span-2 lg:col-span-3">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Block Hash</p>
                  <p className="mt-1 truncate font-mono text-orange-50">{latestIssuanceTx.blockHash}</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Gas Used</p>
                  <p className="mt-1 font-mono text-orange-50">{latestIssuanceTx.gasUsed.toString()}</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Gas Price</p>
                  <p className="mt-1 font-mono text-orange-50">{formatGwei(latestIssuanceTx.effectiveGasPrice)} Gwei</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">ETH Spent</p>
                  <p className="mt-1 font-mono text-orange-50">{Number(formatEther(latestIssuanceTx.ethSpent)).toFixed(8)} ETH</p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">USD Equivalent</p>
                  <p className="mt-1 font-mono text-orange-50">
                    {typeof latestIssuanceTx.usdEquivalent === 'number'
                      ? `$${latestIssuanceTx.usdEquivalent.toFixed(2)}`
                      : 'Unavailable'}
                  </p>
                </div>
                <div className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-orange-100/70">Transaction Hash</p>
                  <p className="mt-1 truncate font-mono text-orange-50">{latestIssuanceTx.hash}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${latestIssuanceTx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-orange-300 underline decoration-orange-400/70 underline-offset-2 hover:text-orange-200"
                  >
                    View on Etherscan
                  </a>
                </div>
              </div>
            )}
          </section>

          <section className="nh-panel rounded-md p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-orange-50">Interaction Hub</h3>
            <p className="mt-1 text-sm nh-text-muted">
              Create claim requests and attestations for a target wallet.
            </p>

            <div className="mt-5 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem]">
                <input
                  className="nh-input w-full rounded-xl px-3 py-2.5 font-mono text-sm"
                  placeholder="Target Wallet Address"
                  value={hubTargetAddress}
                  onChange={(event) => setHubTargetAddress(event.target.value)}
                />
                <div className="hidden md:block" />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem]">
                <input
                  className="nh-input w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Claim Reason"
                  value={claimReason}
                  onChange={(event) => setClaimReason(event.target.value)}
                />
                <button
                  type="button"
                  className="nh-button-secondary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleClaimRequest}
                  disabled={claimLoading || attestationLoading}
                >
                  {claimLoading ? 'Sending...' : 'Send Claim Request'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem]">
                <input
                  className="nh-input w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Attestation Text"
                  value={attestationText}
                  onChange={(event) => setAttestationText(event.target.value)}
                />
                <button
                  type="button"
                  className="nh-button-secondary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAttestation}
                  disabled={claimLoading || attestationLoading}
                >
                  {attestationLoading ? 'Submitting...' : 'Create Attestation'}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="nh-panel rounded-md p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-orange-50">Incoming Claim Requests</h3>
              <div className="mt-4 space-y-3">
                {requests.length === 0 ? (
                  <p className="text-sm nh-text-muted">No incoming requests yet.</p>
                ) : (
                  requests.map((req, index) => (
                    <div key={`${req[0].toString()}-${index}`} className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                      <p>Requester: {req[1]}</p>
                      <p>Purpose: {req[3]}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p>Status: {req[4] ? 'Fulfilled' : 'Pending'}</p>
                        <button
                          type="button"
                          className="nh-button-primary rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void handleAcceptRequest(req[0])}
                          disabled={req[4] || acceptingRequestId === req[0]}
                        >
                          {acceptingRequestId === req[0] ? 'Accepting...' : req[4] ? 'Accepted' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="nh-panel rounded-md p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-orange-50">Attestations</h3>
              <div className="mt-4 space-y-3">
                {!attestations || attestations.length === 0 ? (
                  <p className="text-sm nh-text-muted">No attestations available.</p>
                ) : (
                  (attestations as readonly (AttestationTuple | AttestationObject)[]).map((att, index) => {
                    const from = isAttestationTuple(att) ? att[0] : att.attester
                    const statement = isAttestationTuple(att) ? att[2] : att.statement

                    return (
                      <div key={`${from ?? 'att'}-${index}`} className="rounded-xl border border-orange-300/20 bg-black/20 p-3 text-sm">
                        <p>From: {from ?? '-'}</p>
                        <p>{statement ?? '-'}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <BlockchainAnalyticsSection address={address} chainId={chainId} />

          <CredentialsSection
            credentials={credentials}
            address={address}
            revokingCredentialHash={revokingCredentialHash}
            authenticatingCredentialHash={authenticatingRevokeHash}
            onRevoke={handleRevoke}
          />
        </main>
      </div>
    </div>
  )
}
