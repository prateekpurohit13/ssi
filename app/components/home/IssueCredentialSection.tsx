export function IssueCredentialSection({
  name,
  type,
  year,
  loading,
  onNameChange,
  onTypeChange,
  onYearChange,
  onIssue,
}: {
  name: string
  type: string
  year: string
  loading: boolean
  onNameChange: (value: string) => void
  onTypeChange: (value: string) => void
  onYearChange: (value: string) => void
  onIssue: () => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Issue Credential</h3>
      <p className="mt-1 text-sm text-slate-500">
        Create a new verifiable credential and anchor it with IPFS + blockchain hash.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Name</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
            placeholder="Alice Doe"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Type</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
            placeholder="Refugee ID / Degree / License"
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Year</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
            placeholder="2026"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          />
        </label>
      </div>

      <button
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onIssue}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Issue Credential'}
      </button>
    </section>
  )
}
