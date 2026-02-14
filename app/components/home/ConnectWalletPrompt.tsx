export function ConnectWalletPrompt() {
  return (
    <div className="nh-glass rounded-md border border-dashed border-orange-200/22 p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
      <h3 className="text-lg font-semibold text-orange-50">Connect wallet to continue</h3>
      <p className="mt-2 text-sm text-orange-100/70">
        Once connected, you can issue and revoke credentials exactly as before.
      </p>
    </div>
  )
}
