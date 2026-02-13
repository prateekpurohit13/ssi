import { QRCodeCanvas } from 'qrcode.react'
import type { Credential } from './types'

function CredentialCard({
  credential,
  address,
  loading,
  onRevoke,
}: {
  credential: Credential
  address: `0x${string}`
  loading: boolean
  onRevoke: (credentialHash: `0x${string}`) => void
}) {
  return (
    <article className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-[1fr_auto]">
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">IPFS CID:</span>{' '}
          <a
            href={`https://gateway.pinata.cloud/ipfs/${credential.ipfsCID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-indigo-600 underline-offset-4 hover:underline"
          >
            {credential.ipfsCID}
          </a>
        </p>

        <p>
          <span className="font-semibold text-slate-900">Issuer:</span>{' '}
          <span className="break-all">{credential.issuer}</span>
        </p>

        <p>
          <span className="font-semibold text-slate-900">Status:</span>{' '}
          <span
            className={
              credential.isValid
                ? 'text-emerald-600 font-semibold'
                : 'text-rose-600 font-semibold'
            }
          >
            {credential.isValid ? 'Active' : 'Revoked'}
          </span>
        </p>

        <p>
          <span className="font-semibold text-slate-900">Issued At:</span>{' '}
          {new Date(Number(credential.issuedAt) * 1000).toLocaleString()}
        </p>

        {credential.isValid && credential.issuer === address && (
          <button
            className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRevoke(credential.credentialHash)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Revoke Credential'}
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Scan to Verify
        </p>
        <QRCodeCanvas
          value={
            typeof window !== 'undefined'
              ? `${window.location.origin}/verify?user=${address}&hash=${credential.credentialHash}`
              : ''
          }
          size={140}
        />
      </div>
    </article>
  )
}

export function CredentialsSection({
  credentials,
  address,
  loading,
  onRevoke,
}: {
  credentials: Credential[]
  address: `0x${string}`
  loading: boolean
  onRevoke: (credentialHash: `0x${string}`) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Issued Credentials</h3>
      <p className="mt-1 text-sm text-slate-500">
        Each card includes status, provenance, and shareable verification QR.
      </p>

      {credentials.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          No credentials issued yet.
        </div>
      )}

      <div className="mt-5 space-y-4">
        {credentials.map((credential, index) => (
          <CredentialCard
            key={index}
            credential={credential}
            address={address}
            loading={loading}
            onRevoke={onRevoke}
          />
        ))}
      </div>
    </section>
  )
}
