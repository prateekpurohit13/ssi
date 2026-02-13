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
    <article className="nh-glass grid gap-5 rounded-lg border border-orange-400/28 p-5 md:grid-cols-[1fr_auto]">
      <div className="space-y-2 text-sm text-orange-100/85">
        <p>
          <span className="font-semibold text-orange-50">IPFS CID:</span>{' '}
          <a
            href={`https://gateway.pinata.cloud/ipfs/${credential.ipfsCID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-orange-300 underline-offset-4 hover:underline"
          >
            {credential.ipfsCID}
          </a>
        </p>

        <p>
          <span className="font-semibold text-orange-50">Issuer:</span>{' '}
          <span className="break-all">{credential.issuer}</span>
        </p>

        <p>
          <span className="font-semibold text-orange-50">Status:</span>{' '}
          <span
            className={
              credential.isValid
                ? 'text-emerald-300 font-semibold'
                : 'text-rose-300 font-semibold'
            }
          >
            {credential.isValid ? 'Active' : 'Revoked'}
          </span>
        </p>

        <p>
          <span className="font-semibold text-orange-50">Issued At:</span>{' '}
          {new Date(Number(credential.issuedAt) * 1000).toLocaleString()}
        </p>

        {credential.isValid && credential.issuer === address && (
          <button
            className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRevoke(credential.credentialHash)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Revoke Credential'}
          </button>
        )}
      </div>

      <div className="nh-glass flex flex-col items-center justify-center rounded-lg border border-orange-400/28 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-orange-100/70">
          Scan to Verify
        </p>
        <div className="rounded-lg bg-white p-2">
          <QRCodeCanvas
          value={
            typeof window !== 'undefined'
              ? `${window.location.origin}/verify?user=${address}&hash=${credential.credentialHash}`
              : ''
          }
          size={140}
          />
        </div>
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
    <section className="nh-panel rounded-lg p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-orange-50">Issued Credentials</h3>
      <p className="mt-1 text-sm nh-text-muted">
        Each card includes status, provenance, and shareable verification QR.
      </p>

      {credentials.length === 0 && (
        <div className="nh-glass mt-5 rounded-lg border border-dashed border-orange-400/35 p-6 text-sm text-orange-100/70">
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
