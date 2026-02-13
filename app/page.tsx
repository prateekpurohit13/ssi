'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract } from 'wagmi'
import { contractConfig } from './contract'

export default function Home() {
  const { address } = useAccount()

  const { data } = useReadContract({
    ...contractConfig,
    functionName: 'getUserCredentials',
    args: address ? [address] : undefined,
  })

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        NeuralHash SSI Dashboard
      </h1>

      <ConnectButton />

      {address && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Your Credentials
          </h2>

          {data?.map((cred: any, i: number) => (
            <div key={i} className="border p-4 mb-4 rounded">
              <p><strong>IPFS CID:</strong> {cred.ipfsCID}</p>
              <p><strong>Issuer:</strong> {cred.issuer}</p>
              <p><strong>Valid:</strong> {cred.isValid ? "Yes" : "No"}</p>
              <p><strong>Issued At:</strong> {Number(cred.issuedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
