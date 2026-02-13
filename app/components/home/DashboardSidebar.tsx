import Link from 'next/link'

export function DashboardSidebar() {
  return (
    <aside className="paper-grid hidden w-64 flex-col rounded-3xl border border-slate-300/80 bg-white p-5 shadow-sm lg:flex">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
          NeuralHash
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">SSI Console</h1>
        <p className="mt-2 text-sm text-slate-600">
          Issue and manage verifiable credentials on-chain.
        </p>
      </div>

      <nav className="mt-8 space-y-2 text-sm font-medium">
        <span className="flex items-center rounded-2xl border border-slate-300 bg-pink-200/80 px-4 py-2 text-slate-900">
          Issuer Dashboard
        </span>
        <Link
          href="/verify"
          className="flex items-center rounded-2xl border border-transparent px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          Verifier Portal
        </Link>
      </nav>
    </aside>
  )
}
