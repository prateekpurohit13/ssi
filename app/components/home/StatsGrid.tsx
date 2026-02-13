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
    <div className={`rounded-lg border border-orange-400/30 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.35)] ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-100/70">{label}</p>
      <p className="mt-2 text-2xl font-black text-orange-50">{value}</p>
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
        accent="nh-glass"
      />
      <StatCard
        label="Total Credentials"
        value={String(totalCredentials)}
        accent="nh-glass"
      />
      <StatCard
        label="Active"
        value={String(activeCredentials)}
        accent="nh-glass"
      />
      <StatCard
        label="Revoked"
        value={String(revokedCredentials)}
        accent="nh-glass"
      />
    </div>
  )
}
