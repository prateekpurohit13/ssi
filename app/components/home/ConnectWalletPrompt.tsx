export function ConnectWalletPrompt() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Connect wallet to continue</h3>
      <p className="mt-2 text-sm text-slate-500">
        Once connected, you can issue and revoke credentials exactly as before.
      </p>
    </div>
  )
}
