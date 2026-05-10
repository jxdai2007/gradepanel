'use client'
import { Suspense, useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KpiDashboard } from '@/app/components/KpiDashboard'
import { DragDropZone } from '@/app/components/DragDropZone'
import { SubmissionViewer } from '@/app/components/SubmissionViewer'
import { DeductionCard } from '@/app/components/DeductionCard'
import { NovelIssueCard } from '@/app/components/NovelIssueCard'
import type { UIDeduction } from '@/app/types'

interface GradeResult {
  deductions: Array<{
    rubric_item_id: string
    points_deducted: number
    location: { line_start: number; line_end: number; quote: string }
    reason: string
  }>
}

function GradePage() {
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId') ?? 'c1'
  const assignmentId = searchParams.get('assignmentId') ?? 'mt1'

  const [submissions, setSubmissions] = useState<Array<{
    id: string
    content: string
    deductions: UIDeduction[]
    state: 'pending' | 'grading' | 'done' | 'error'
    error?: string
  }>>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [activeDeductionId, setActiveDeductionId] = useState<string | undefined>()
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [grading, setGrading] = useState(false)

  const handleFiles = useCallback(
    async (files: File[]) => {
      setGrading(true)
      const newSubs = await Promise.all(
        files.map(async (f, i) => ({
          id: `sub-${Date.now()}-${i}`,
          content: await f.text(),
          deductions: [] as UIDeduction[],
          state: 'pending' as const,
        }))
      )
      const withGrades = await Promise.all(
        newSubs.map(async (sub) => {
          try {
            const res = await fetch('/api/grade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId: sub.id,
                submission: sub.content,
                assignmentId,
              }),
            })
            if (!res.ok) {
              return { ...sub, state: 'error' as const, error: 'Grading failed' }
            }
            const result = (await res.json()) as GradeResult
            const deductions: UIDeduction[] = result.deductions.map((d, idx) => ({
              ...d,
              id: `${d.rubric_item_id}-${idx}`,
            }))
            return { ...sub, state: 'done' as const, deductions }
          } catch {
            return { ...sub, state: 'error' as const, error: 'Network error' }
          }
        })
      )
      setSubmissions((prev) => [...prev, ...withGrades])
      setGrading(false)
    },
    [assignmentId]
  )

  const current = submissions[currentIdx]
  const gradedCount = submissions.filter((s) => s.state === 'done').length
  const totalCount = submissions.length

  function handleSelectDeduction(id: string) {
    setActiveDeductionId(id)
    const el = cardRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  async function handleAccept(id: string) {
    if (!current) return
    const d = current.deductions.find((x) => x.id === id)
    if (!d) return
    await fetch('/api/deduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'accept_add',
        submissionId: current.id,
        rubricItemId: d.rubric_item_id,
        pointsDeducted: d.points_deducted,
        reason: d.reason,
        locationLineStart: d.location.line_start,
        locationLineEnd: d.location.line_end,
        locationQuote: d.location.quote,
      }),
    })
  }

  async function handleReject(id: string) {
    if (!current) return
    const d = current.deductions.find((x) => x.id === id)
    if (!d) return
    await fetch('/api/deduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject',
        submissionId: current.id,
        rubricItemId: d.rubric_item_id,
        pointsDeducted: d.points_deducted,
        reason: d.reason,
      }),
    })
  }

  function handleEdit(id: string) {
    // Placeholder: focus the deduction card for manual editing
    setActiveDeductionId(id)
  }

  async function handleAddToGraph(id: string) {
    if (!current) return
    const d = current.deductions.find((x) => x.id === id)
    if (!d) return
    await fetch('/api/deduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'accept_add',
        submissionId: current.id,
        rubricItemId: d.rubric_item_id,
        pointsDeducted: d.points_deducted,
        reason: d.reason,
        locationLineStart: d.location.line_start,
        locationLineEnd: d.location.line_end,
        locationQuote: d.location.quote,
      }),
    })
  }

  async function handleAcceptOnce(id: string) {
    if (!current) return
    const d = current.deductions.find((x) => x.id === id)
    if (!d) return
    await fetch('/api/deduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'accept_once',
        submissionId: current.id,
        rubricItemId: d.rubric_item_id,
        pointsDeducted: d.points_deducted,
        reason: d.reason,
      }),
    })
  }

  return (
    <div className="min-h-screen bg-surface font-sans flex flex-col">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-6 gap-4 shrink-0">
        <Link href="/" className="font-semibold text-[15px] text-primary tracking-tight hover:text-accent transition-colors">
          gradepanel
        </Link>
        <span className="text-tertiary text-[13px]">/</span>
        <span className="text-[13px] text-secondary">{assignmentId}</span>
        <div className="flex-1" />
      </header>

      {/* KPI bar */}
      <KpiDashboard
        courseId={courseId}
        assignmentId={assignmentId}
        gradedCount={gradedCount}
        totalCount={totalCount || undefined}
      />

      {/* Upload zone (no submissions yet) */}
      {submissions.length === 0 && (
        <div className="max-w-xl mx-auto w-full px-6 py-12">
          <p className="text-[13px] text-secondary mb-4">
            Drop submissions (.txt) to grade against the <strong>{assignmentId}</strong> rubric.
          </p>
          <DragDropZone
            onFiles={handleFiles}
            state={grading ? 'extracting' : 'idle'}
          />
          {grading && (
            <p className="mt-3 text-[13px] font-mono text-secondary opacity-70">
              ·· grading
            </p>
          )}
        </div>
      )}

      {/* Two-column grade view */}
      {submissions.length > 0 && current && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: SubmissionViewer (55%) */}
          <div className="w-[55%] border-r border-border flex flex-col overflow-hidden">
            <SubmissionViewer
              content={current.content}
              deductions={current.deductions}
              activeDeductionId={activeDeductionId}
              onSelectDeduction={handleSelectDeduction}
            />
          </div>

          {/* Right: Deduction cards (45%) */}
          <div className="w-[45%] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {current.deductions.length === 0 && (
                <p className="text-[13px] text-tertiary">No deductions found.</p>
              )}
              {current.deductions.map((d) =>
                d.isNovel ? (
                  <div
                    key={d.id}
                    ref={(el) => { cardRefs.current[d.id] = el }}
                  >
                    <NovelIssueCard
                      deduction={d}
                      isActive={d.id === activeDeductionId}
                      onAddToGraph={handleAddToGraph}
                      onAcceptOnce={handleAcceptOnce}
                      onReject={handleReject}
                    />
                  </div>
                ) : (
                  <div
                    key={d.id}
                    ref={(el) => { cardRefs.current[d.id] = el }}
                  >
                    <DeductionCard
                      deduction={d}
                      isActive={d.id === activeDeductionId}
                      onAccept={handleAccept}
                      onEdit={handleEdit}
                      onReject={handleReject}
                    />
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="h-11 border-t border-border flex items-center px-4 gap-4 shrink-0">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="text-[13px] text-secondary disabled:text-tertiary hover:text-primary transition-colors"
              >
                &#8592; Prev
              </button>
              <span className="text-[13px] text-secondary flex-1 text-center">
                s-{currentIdx + 1} of {submissions.length}
              </span>
              <button
                onClick={() => {
                  current.deductions.forEach((d) => handleAccept(d.id))
                }}
                className="text-[13px] text-secondary hover:text-primary transition-colors"
              >
                Accept all <span className="text-tertiary">[A]</span>
              </button>
              <button
                disabled={currentIdx >= submissions.length - 1}
                onClick={() => setCurrentIdx((i) => Math.min(submissions.length - 1, i + 1))}
                className="text-[13px] text-secondary disabled:text-tertiary hover:text-primary transition-colors"
              >
                Next &#8594; <span className="text-tertiary">[&#8594;]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GradePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <GradePage />
    </Suspense>
  )
}
