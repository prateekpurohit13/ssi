function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className={`rounded-3xl border border-slate-300/80 p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

export function StatsGrid({
  walletConnected,
  totalCredentials,
  activeCredentials,
  revokedCredentials,
}: {
  walletConnected: boolean
  totalCredentials: number
  activeCredentials: number
  revokedCredentials: number
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Wallet"
        value={walletConnected ? 'Connected' : 'Not connected'}
        accent="bg-pink-100/70"
      />
      <StatCard
        label="Total Credentials"
        value={String(totalCredentials)}
        accent="bg-sky-100/80"
      />
      <StatCard
        label="Active"
        value={String(activeCredentials)}
        accent="bg-emerald-100/80"
      />
      <StatCard
        label="Revoked"
        value={String(revokedCredentials)}
        accent="bg-amber-100/80"
      />
    </div>
  )
}
