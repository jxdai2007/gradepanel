'use client'
// app/regrade/page.tsx
// Regrade request review page.
// Lists deductions for a submission and lets students (or TAs) submit regrade arguments.
// Usage: /regrade?submissionId=<id>
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Deduction {
  id: string
  rubric_item_id: string
  points_deducted: number
  reason: string
  location_quote?: string | null
}

interface RegradeResult {
  deductionId: string
  response: string
  precedent: { tier1Count: number; tier2Count: number }
  ferpaRedacted: boolean
}

function RegradeContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submissionId') ?? ''

  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track regrade state per deduction
  const [activeId, setActiveId] = useState<string | null>(null)
  const [argument, setArgument] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Record<string, RegradeResult>>({})

  // Load deductions for the submission (async inside effect, not synchronously)
  useEffect(() => {
    if (!submissionId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/deductions?submissionId=${encodeURIComponent(submissionId)}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setDeductions(json.deductions ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [submissionId])

  async function handleSubmitRegrade(deductionId: string) {
    if (!argument.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/regrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductionId, studentArgument: argument.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      const ferpaRedacted = (json.response as string).includes('[redacted: cross-student content]')
      setResults((prev) => ({
        ...prev,
        [deductionId]: {
          deductionId,
          response: json.response,
          precedent: json.precedent,
          ferpaRedacted,
        },
      }))
      setActiveId(null)
      setArgument('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regrade failed')
    } finally {
      setSubmitting(false)
    }
  }

  function openRegrade(id: string) {
    setActiveId(id)
    setArgument('')
  }

  function closeRegrade() {
    setActiveId(null)
    setArgument('')
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Submission context */}
      <div>
        <h1 className="text-[17px] font-semibold text-primary mb-1">Regrade Request</h1>
        {submissionId ? (
          <p className="text-[13px] text-secondary font-mono">submission: {submissionId}</p>
        ) : (
          <p className="text-[13px] text-secondary">
            No submission ID provided. Append <code>?submissionId=&lt;id&gt;</code> to the URL.
          </p>
        )}
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-md px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-[13px] text-secondary font-mono">·· loading deductions</p>
      )}

      {!loading && deductions.length === 0 && submissionId && !error && (
        <p className="text-[13px] text-secondary">
          No deductions found for this submission.{' '}
          <span className="text-tertiary">
            (Deductions are added to the graph after TA approval.)
          </span>
        </p>
      )}

      {/* Deduction list */}
      {deductions.map((d) => {
        const result = results[d.id]
        const isOpen = activeId === d.id

        return (
          <div
            key={d.id}
            className="border border-border rounded-md bg-surface-raised overflow-hidden"
          >
            {/* Deduction header */}
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="font-mono text-[11px] text-tertiary pt-0.5 shrink-0">
                {d.rubric_item_id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-primary">{d.reason}</p>
                {d.location_quote && (
                  <p className="text-[12px] text-secondary font-mono mt-1 truncate">
                    &ldquo;{d.location_quote}&rdquo;
                  </p>
                )}
              </div>
              <span className="font-mono text-[13px] text-red-600 shrink-0">
                &minus;{d.points_deducted}
              </span>
            </div>

            {/* Regrade result (if submitted) */}
            {result && (
              <div className="border-t border-border px-4 py-3 bg-surface space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-success uppercase tracking-widest">
                    Response drafted
                  </span>
                  {result.ferpaRedacted && (
                    <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      FERPA-filtered
                    </span>
                  )}
                  <span className="text-[11px] text-tertiary ml-auto">
                    {result.precedent.tier1Count} tier-1 &middot;{' '}
                    {result.precedent.tier2Count} tier-2 precedents
                  </span>
                </div>
                <p className="text-[13px] text-primary whitespace-pre-wrap">{result.response}</p>
              </div>
            )}

            {/* Regrade form (inline) */}
            {isOpen && (
              <div className="border-t border-border px-4 py-3 bg-surface space-y-3">
                <label className="block text-[12px] text-secondary font-medium">
                  Your argument
                </label>
                <textarea
                  value={argument}
                  onChange={(e) => setArgument(e.target.value)}
                  placeholder="Explain why this deduction should be reconsidered..."
                  rows={4}
                  maxLength={5000}
                  className="w-full text-[13px] text-primary bg-surface border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-tertiary"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={closeRegrade}
                    className="text-[13px] text-secondary hover:text-primary transition-colors px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitRegrade(d.id)}
                    disabled={submitting || !argument.trim()}
                    className="px-4 py-1.5 text-[13px] font-medium bg-accent text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {/* Request regrade button */}
            {!isOpen && !result && (
              <div className="border-t border-border px-4 py-2">
                <button
                  onClick={() => openRegrade(d.id)}
                  className="text-[12px] text-accent hover:underline"
                >
                  Request regrade
                </button>
              </div>
            )}

            {/* Re-request after viewing result */}
            {result && (
              <div className="border-t border-border px-4 py-2">
                <button
                  onClick={() => openRegrade(d.id)}
                  className="text-[12px] text-secondary hover:text-primary transition-colors"
                >
                  Submit another argument
                </button>
              </div>
            )}
          </div>
        )
      })}
    </main>
  )
}

export default function RegradePage() {
  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-6 gap-4">
        <Link
          href="/"
          className="font-semibold text-[15px] text-primary tracking-tight hover:text-accent transition-colors"
        >
          gradepanel
        </Link>
        <span className="text-tertiary text-[13px]">/</span>
        <span className="text-[13px] text-secondary">Regrade Request</span>
      </header>

      <Suspense
        fallback={
          <p className="px-6 py-10 text-[13px] text-secondary font-mono">Loading...</p>
        }
      >
        <RegradeContent />
      </Suspense>
    </div>
  )
}
