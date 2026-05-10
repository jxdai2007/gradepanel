'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KpiDashboard } from '@/app/components/KpiDashboard'

function StatsPageInner() {
  const searchParams = useSearchParams()
  const [courseId, setCourseId] = useState(searchParams.get('courseId') ?? 'c1')
  const [assignmentId, setAssignmentId] = useState(searchParams.get('assignmentId') ?? 'mt1')
  const [applied, setApplied] = useState({ courseId, assignmentId })

  return (
    <div className="min-h-screen bg-surface font-sans flex flex-col">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-6 gap-4 shrink-0">
        <Link href="/" className="font-semibold text-[15px] text-primary tracking-tight hover:text-accent transition-colors">
          gradepanel
        </Link>
        <span className="text-tertiary text-[13px]">/</span>
        <span className="text-[13px] text-secondary">stats</span>
        <div className="flex-1" />
      </header>

      {/* KPI bar with live data */}
      <KpiDashboard
        courseId={applied.courseId}
        assignmentId={applied.assignmentId}
      />

      {/* Selectors */}
      <main className="max-w-2xl mx-auto px-6 py-10 w-full">
        <div className="flex gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-[11px] text-tertiary uppercase tracking-widest mb-1">
              Course ID
            </label>
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="c1"
              className="w-full border-b border-border bg-transparent text-[15px] text-primary pb-1 outline-none placeholder:text-tertiary focus:border-accent transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-tertiary uppercase tracking-widest mb-1">
              Assignment ID
            </label>
            <input
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              placeholder="mt1"
              className="w-full border-b border-border bg-transparent text-[15px] text-primary pb-1 outline-none placeholder:text-tertiary focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-end pb-1">
            <button
              onClick={() => setApplied({ courseId, assignmentId })}
              className="px-3 py-1 text-[13px] bg-accent text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
          </div>
        </div>

        <p className="text-[13px] text-secondary">
          Showing inter-grader consistency (σ per rubric item) and cross-test concept sigma for{' '}
          <strong>{applied.courseId}</strong> / <strong>{applied.assignmentId}</strong>.
        </p>
      </main>
    </div>
  )
}

export default function StatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <StatsPageInner />
    </Suspense>
  )
}
