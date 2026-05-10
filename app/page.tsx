'use client'
import { useState } from 'react'
import Link from 'next/link'
import { DragDropZone } from '@/app/components/DragDropZone'
import { BootstrapProgress, type BootstrapStep } from '@/app/components/BootstrapProgress'
import { ApprovalGate } from '@/app/components/ApprovalGate'
import type { BootstrapResult } from '@/app/types'

type AppState = 'idle' | 'extracting' | 'approval' | 'done'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [currentStep, setCurrentStep] = useState<BootstrapStep>('reading')
  const [bootstrap, setBootstrap] = useState<BootstrapResult | null>(null)
  const [assignment, setAssignment] = useState('')
  const [course, setCourse] = useState('')
  const [fileCount, setFileCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: File[]) {
    setError(null)
    setFileCount(files.length)
    setAppState('extracting')
    setCurrentStep('reading')

    let texts: string[]
    try {
      texts = await Promise.all(files.map((f) => f.text()))
    } catch {
      setError('Failed to read files.')
      setAppState('idle')
      return
    }

    setCurrentStep('extracting')

    let result: BootstrapResult
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions: texts }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Extraction failed')
      }
      setCurrentStep('inferring_rubric')
      result = (await res.json()) as BootstrapResult
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed')
      setAppState('idle')
      return
    }

    setCurrentStep('extracting_concepts')
    await new Promise((r) => setTimeout(r, 300))
    setCurrentStep('done')
    setBootstrap(result)
    setAppState('approval')
  }

  function handleDiscard() {
    setBootstrap(null)
    setAppState('idle')
    setCurrentStep('reading')
    setError(null)
  }

  async function handleConfirm(
    rubricItems: Array<{ id: string; description: string; max_points: number }>,
    concepts: string[]
  ) {
    try {
      const res = await fetch('/api/rubric/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course || 'default',
          assignmentId: assignment || 'default',
          rubricItems,
          concepts,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Finalize failed')
      }
      setAppState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rubric')
    }
  }

  const totalConcepts = bootstrap
    ? Object.values(bootstrap.conceptsByItem).flat().length
    : 0

  const submissionCount = bootstrap?.perSubmission.length ?? 0

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-6 gap-4">
        <span className="font-semibold text-[15px] text-primary tracking-tight">
          gradepanel
        </span>
        <div className="flex-1" />
        <button className="text-[13px] text-secondary hover:text-primary transition-colors">
          Help
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Course + Assignment inputs */}
        <div className="flex gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-[11px] text-tertiary uppercase tracking-widest mb-1">
              Course
            </label>
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. MATH 131A"
              className="w-full border-b border-border bg-transparent text-[15px] text-primary pb-1 outline-none placeholder:text-tertiary focus:border-accent transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-tertiary uppercase tracking-widest mb-1">
              Assignment
            </label>
            <input
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
              placeholder="e.g. Midterm 1"
              className="w-full border-b border-border bg-transparent text-[15px] text-primary pb-1 outline-none placeholder:text-tertiary focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-danger-subtle text-danger text-[13px] rounded-md font-mono">
            {error}
          </div>
        )}

        {/* State: idle or extracting */}
        {(appState === 'idle' || appState === 'extracting') && (
          <>
            <DragDropZone
              onFiles={handleFiles}
              state={appState === 'extracting' ? 'extracting' : 'idle'}
            />

            {appState === 'extracting' && (
              <BootstrapProgress
                currentStep={currentStep}
                submissionCount={fileCount}
              />
            )}

            {/* What this does */}
            {appState === 'idle' && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-[13px] text-secondary leading-relaxed">
                  Drop a batch of graded submissions (.txt). The LLM panel extracts
                  deductions, infers a rubric, and maps concepts. You review and confirm
                  once — then gradepanel auto-grades new submissions against that rubric
                  with full provenance.
                </p>
              </div>
            )}
          </>
        )}

        {/* State: approval */}
        {appState === 'approval' && bootstrap && (
          <ApprovalGate
            submissionCount={submissionCount}
            rubricItems={bootstrap.rubric.rubric_items}
            conceptsByItem={bootstrap.conceptsByItem}
            totalConcepts={totalConcepts}
            onConfirm={handleConfirm}
            onDiscard={handleDiscard}
          />
        )}

        {/* State: done */}
        {appState === 'done' && (
          <div className="mt-8 text-center">
            <p className="text-[15px] text-success font-semibold">Rubric saved.</p>
            <p className="text-[13px] text-secondary mt-1">
              Go to{' '}
              <Link
                href={`/grade?courseId=${encodeURIComponent(course || 'default')}&assignmentId=${encodeURIComponent(assignment || 'default')}`}
                className="text-accent underline"
              >
                grade view
              </Link>{' '}
              to start grading submissions.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
