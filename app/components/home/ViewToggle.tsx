import Link from 'next/link'

export function ViewToggle({
  active,
  className = '',
}: {
  active: 'issuer' | 'verifier'
  className?: string
}) {
  return (
    <div className={`inline-flex rounded-2xl border border-slate-300 bg-white/80 p-1 shadow-sm ${className}`}>
      <Link
        href="/"
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'issuer'
            ? 'bg-pink-200/80 text-slate-900'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        Issuer Dashboard
      </Link>
      <Link
        href="/verify"
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          active === 'verifier'
            ? 'bg-pink-200/80 text-slate-900'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        Verifier Portal
      </Link>
    </div>
  )
}
