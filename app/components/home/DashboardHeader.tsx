import { ConnectButton } from '@rainbow-me/rainbowkit'

export function DashboardHeader() {
  return (
    <div className="rounded-md p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-4xl font-black text-orange-50 sm:text-3xl">
            Credential Dashboard
          </h2>
          <p className="mt-1 text-sm text-orange-100/70">
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
