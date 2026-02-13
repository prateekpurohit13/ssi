'use client'

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
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        NeuralHash SSI Dashboard
      </h1>

      <ConnectButton />

      {address && (
        <>
          {/* ISSUE FORM */}
          <div className="mt-8 border p-6 rounded">
            <h2 className="text-xl font-semibold mb-4">
              Issue Credential
            </h2>

            <input
              className="border p-2 mb-3 w-full"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border p-2 mb-3 w-full"
              placeholder="Type (Degree, License...)"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />

            <input
              className="border p-2 mb-3 w-full"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />

            <button
              className="bg-black text-white px-4 py-2 rounded"
              onClick={handleIssue}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Issue Credential'}
            </button>
          </div>

          {/* CREDENTIALS */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">
              Your Credentials
            </h2>

            {data && data.length === 0 && (
              <p>No credentials issued yet.</p>
            )}

            {data?.map((cred: any, i: number) => (
              <div key={i} className="border p-4 mb-6 rounded">
                <p>
                  <strong>IPFS CID:</strong>{' '}
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${cred.ipfsCID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {cred.ipfsCID}
                  </a>
                </p>

                <p>
                  <strong>Issuer:</strong> {cred.issuer}
                </p>

                <p>
                  <strong>Status:</strong>{' '}
                  {cred.isValid ? 'Active' : 'Revoked'}
                </p>

                <p>
                  <strong>Issued At:</strong>{' '}
                  {new Date(
                    Number(cred.issuedAt) * 1000
                  ).toLocaleString()}
                </p>

                {/* 🔴 REVOKE BUTTON */}
                {cred.isValid && cred.issuer === address && (
                  <button
                    className="bg-red-600 text-white px-3 py-1 mt-4 rounded"
                    onClick={() =>
                      handleRevoke(cred.credentialHash)
                    }
                    disabled={loading}
                  >
                    {loading
                      ? 'Processing...'
                      : 'Revoke Credential'}
                  </button>
                )}

                {/* 🟢 QR CODE */}
                <div className="mt-6 flex flex-col items-center">
                  <p className="mb-2 text-sm text-gray-600">
                    Scan to Verify
                  </p>
                  <QRCodeCanvas
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/verify?user=${address}&hash=${cred.credentialHash}`
                        : ''
                    }
                    size={150}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
