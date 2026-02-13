export function IssueCredentialSection({
  name,
  type,
  year,
  recipient,
  file,
  loading,
  onNameChange,
  onTypeChange,
  onYearChange,
  onRecipientChange,
  onFileChange,
  onExtract,
  onIssue,
}: {
  name: string
  type: string
  year: string
  recipient: string
  file: File | null
  loading: boolean
  onNameChange: (value: string) => void
  onTypeChange: (value: string) => void
  onYearChange: (value: string) => void
  onRecipientChange: (value: string) => void
  onFileChange: (value: File | null) => void
  onExtract: () => void
  onIssue: () => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Issue Credential</h3>
      <p className="mt-1 text-sm text-slate-500">
        Create a new verifiable credential and anchor it with IPFS + blockchain hash.
      </p>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Auto-fill from PDF</p>
        <input
          type="file"
          accept="application/pdf"
          className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <button
          className="mt-3 w-full rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onExtract}
          disabled={loading || !file}
        >
          {loading ? 'Extracting...' : 'Extract Data from PDF'}
        </button>
      </div>

      <label className="mt-5 block space-y-2 text-sm">
        <span className="font-medium text-slate-700">Recipient Address (Optional)</span>
        <input
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
          placeholder="0x... (defaults to your wallet)"
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
        />
      </label>

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
