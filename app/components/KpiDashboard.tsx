'use client'
import { useEffect, useState } from 'react'

interface RubricSigma {
  rubric_item_id: string
  sigma: number
  n: number
}

interface ConceptSigma {
  concept_id: string
  sigma: number
  n: number
}

interface StatsResponse {
  interGrader: RubricSigma[]
  crossTest: ConceptSigma[]
}

export interface KpiDashboardProps {
  courseId?: string
  assignmentId?: string
  gradedCount?: number
  totalCount?: number
}

function sigmaColor(sigma: number): string {
  if (sigma <= 0.5) return 'text-success'
  if (sigma <= 1.5) return 'text-warning'
  return 'text-danger'
}

function avgSigma(items: Array<{ sigma: number }>): number {
  if (items.length === 0) return 0
  return items.reduce((s, x) => s + x.sigma, 0) / items.length
}

/** Tiny sparkline bar chart using Tailwind divs */
function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null
  const max = Math.max(...values, 0.01)
  return (
    <div className="flex items-end gap-px h-4">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${sigmaColor(v).replace('text-', 'bg-')}`}
          style={{ height: `${Math.max(2, Math.round((v / max) * 16))}px` }}
        />
      ))}
    </div>
  )
}

export function KpiDashboard({
  courseId = 'c1',
  assignmentId = 'mt1',
  gradedCount,
  totalCount,
}: KpiDashboardProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = `/api/stats?courseId=${encodeURIComponent(courseId)}&assignmentId=${encodeURIComponent(assignmentId)}`
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Stats fetch failed')
        return r.json() as Promise<StatsResponse>
      })
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
  }, [courseId, assignmentId])

  const taAvgSigma = stats ? avgSigma(stats.interGrader) : null
  const conceptAvgSigma = stats ? avgSigma(stats.crossTest) : null

  return (
    <div className="h-9 border-b border-border bg-surface flex items-center px-4 gap-6 overflow-x-auto">
      {error && (
        <span className="text-[11px] text-danger font-mono">{error}</span>
      )}

      {/* Time/sub — placeholder since not in API */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-secondary">time/sub</span>
        <span className="text-[13px] font-semibold text-primary">—</span>
      </div>

      {/* σ(TAs) — inter-grader sigma */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-secondary">σ(TAs)</span>
        {taAvgSigma !== null ? (
          <>
            <span className={`text-[13px] font-semibold ${sigmaColor(taAvgSigma)}`}>
              {taAvgSigma.toFixed(2)}
            </span>
            <Sparkline values={stats!.interGrader.map((x) => x.sigma)} />
          </>
        ) : (
          <span className="text-[13px] font-semibold text-tertiary opacity-50">—</span>
        )}
      </div>

      {/* σ(concept) — cross-test sigma */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-secondary">σ(concept)</span>
        {conceptAvgSigma !== null ? (
          <>
            <span className={`text-[13px] font-semibold ${sigmaColor(conceptAvgSigma)}`}>
              {conceptAvgSigma.toFixed(2)}
            </span>
            <Sparkline values={stats!.crossTest.map((x) => x.sigma)} />
          </>
        ) : (
          <span className="text-[13px] font-semibold text-tertiary opacity-50">—</span>
        )}
      </div>

      {/* Calls saved — placeholder */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-secondary">calls saved</span>
        <span className="text-[13px] font-semibold text-primary">—</span>
      </div>

      {/* X / Y graded */}
      {(gradedCount !== undefined || totalCount !== undefined) && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-secondary">graded</span>
          <span className="text-[13px] font-semibold text-primary">
            {gradedCount ?? '?'} / {totalCount ?? '?'}
          </span>
        </div>
      )}
    </div>
  )
}
