import { useEffect, useRef } from 'react'

export function IssueCredentialSection({
  name,
  type,
  year,
  recipient,
  file,
  loading,
  authenticating,
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
  authenticating: boolean
  onNameChange: (value: string) => void
  onTypeChange: (value: string) => void
  onYearChange: (value: string) => void
  onRecipientChange: (value: string) => void
  onFileChange: (value: File | null) => void
  onExtract: () => void
  onIssue: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [file])

  return (
    <section className="nh-panel rounded-lg p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-orange-50">Issue Credential</h3>
      <p className="mt-1 text-sm nh-text-muted">
        Create a new verifiable credential and anchor it with IPFS + blockchain hash.
      </p>

      <div className="nh-glass mt-5 rounded-lg border border-dashed border-orange-400/35 p-4">
        <p className="text-sm font-semibold text-orange-100">Auto-fill from PDF</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="nh-input mt-3 block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:font-semibold file:text-orange-100 hover:file:bg-orange-500/30"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <button
          className="nh-button-secondary mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onExtract}
          disabled={loading || authenticating || !file}
        >
          {loading ? 'Extracting...' : 'Extract Data from PDF'}
        </button>
      </div>

      <label className="mt-5 block space-y-2 text-sm">
        <span className="font-medium text-orange-100/90">Recipient Address (Optional)</span>
        <input
          className="nh-input w-full rounded-xl px-3 py-2 font-mono text-sm"
          placeholder="0x... (defaults to your wallet)"
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
        />
      </label>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-orange-100/90">Name</span>
          <input
            className="nh-input w-full rounded-xl px-3 py-2"
            placeholder="Alice Doe"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-orange-100/90">Type</span>
          <input
            className="nh-input w-full rounded-xl px-3 py-2"
            placeholder="Refugee ID / Degree / License"
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-orange-100/90">Year</span>
          <input
            className="nh-input w-full rounded-xl px-3 py-2"
            placeholder="2026"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          />
        </label>
      </div>

      <button
        className="nh-button-primary mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onIssue}
        disabled={loading || authenticating}
      >
        {authenticating ? 'Authenticating...' : loading ? 'Processing...' : 'Issue Credential'}
      </button>
    </section>
  )
}
