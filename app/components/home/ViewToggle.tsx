import Link from 'next/link'

export function ViewToggle({
  active,
  className = '',
}: {
  active: 'issuer' | 'verifier'
  className?: string
}) {
  return (
    <div className={`nh-glass inline-flex rounded-lg border border-orange-400/30 p-1 shadow-[0_10px_28px_rgba(0,0,0,0.4)] ${className}`}>
      <Link
        href="/issuer"
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'issuer'
            ? 'bg-linear-to-r from-orange-500 to-amber-400 text-[#2b1208]'
            : 'text-orange-100/80 hover:bg-orange-500/15 hover:text-orange-50'
        }`}
      >
        Issuer Dashboard
      </Link>
      <Link
        href="/verify"
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'verifier'
            ? 'bg-linear-to-r from-orange-500 to-amber-400 text-[#2b1208]'
            : 'text-orange-100/80 hover:bg-orange-500/15 hover:text-orange-50'
        }`}
      >
        Verifier Portal
      </Link>
    </div>
  )
}
