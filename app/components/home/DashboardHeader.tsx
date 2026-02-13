import { ConnectButton } from '@rainbow-me/rainbowkit'

export function DashboardHeader() {
  return (
    <div className="paper-grid-soft rounded-3xl border border-slate-300/80 bg-sky-50/70 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Credential Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage issuance, revocation, and verification QR flows.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <ConnectButton />
        </div>
      </div>
    </div>
  )
}
