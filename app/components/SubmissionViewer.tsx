'use client'
import { useEffect, useRef } from 'react'
import type { UIDeduction } from '@/app/types'

export interface SubmissionViewerProps {
  content: string
  deductions: UIDeduction[]
  activeDeductionId?: string
  onSelectDeduction?: (id: string) => void
}

interface Span {
  start: number
  end: number
  deductionId: string
  points: number
}

/**
 * Build character-offset spans from line-based deduction locations.
 * Returns spans sorted by start offset, non-overlapping (first wins).
 */
function buildSpans(lines: string[], deductions: UIDeduction[]): Span[] {
  // Precompute cumulative char offsets per line
  const lineOffsets: number[] = []
  let offset = 0
  for (const line of lines) {
    lineOffsets.push(offset)
    offset += line.length + 1 // +1 for \n
  }

  const spans: Span[] = []
  for (const d of deductions) {
    const startLine = Math.max(0, d.location.line_start - 1)
    const endLine = Math.min(lines.length - 1, d.location.line_end - 1)
    const start = lineOffsets[startLine] ?? 0
    const endLineOffset = lineOffsets[endLine] ?? 0
    const end = endLineOffset + (lines[endLine]?.length ?? 0)
    spans.push({ start, end, deductionId: d.id, points: d.points_deducted })
  }

  // Sort by start; resolve overlaps: earlier span wins
  spans.sort((a, b) => a.start - b.start)
  const merged: Span[] = []
  let cursor = -1
  for (const s of spans) {
    if (s.start > cursor) {
      merged.push(s)
      cursor = s.end
    }
  }
  return merged
}

export function SubmissionViewer({
  content,
  deductions,
  activeDeductionId,
  onSelectDeduction,
}: SubmissionViewerProps) {
  const activeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (activeDeductionId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeDeductionId])

  const lines = content.split('\n')
  const spans = buildSpans(lines, deductions)

  // Render content as array of segments: plain text or highlighted span
  const segments: Array<{ text: string; span?: Span }> = []
  let pos = 0
  for (const span of spans) {
    if (pos < span.start) {
      segments.push({ text: content.slice(pos, span.start) })
    }
    segments.push({ text: content.slice(span.start, span.end), span })
    pos = span.end
  }
  if (pos < content.length) {
    segments.push({ text: content.slice(pos) })
  }

  return (
    <div className="h-full overflow-auto bg-surface-raised border border-border rounded-md">
      <div className="flex">
        {/* Line numbers */}
        <div
          className="select-none text-right text-[13px] font-mono text-tertiary border-r border-border px-2 py-3 leading-6 shrink-0 w-8"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Content */}
        <pre className="flex-1 text-[13px] font-mono text-primary leading-6 px-4 py-3 overflow-x-auto whitespace-pre">
          {segments.map((seg, i) => {
            if (!seg.span) {
              return <span key={i}>{seg.text}</span>
            }
            const { span } = seg
            const isActive = span.deductionId === activeDeductionId
            const bgClass =
              span.points >= 2
                ? 'bg-danger-subtle'
                : 'bg-warning-subtle'
            const borderClass = isActive
              ? 'outline outline-1 outline-accent rounded-sm'
              : ''
            return (
              <mark
                key={i}
                ref={isActive ? (el) => { activeRef.current = el } : undefined}
                className={[
                  bgClass,
                  borderClass,
                  'cursor-pointer rounded-sm',
                ].join(' ')}
                onClick={() => onSelectDeduction?.(span.deductionId)}
              >
                {seg.text}
              </mark>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
