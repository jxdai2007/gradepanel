'use client'
import type { UIDeduction } from '@/app/types'

export interface NovelIssueCardProps {
  deduction: UIDeduction
  isActive?: boolean
  onAddToGraph: (id: string) => void
  onAcceptOnce: (id: string) => void
  onReject: (id: string) => void
}

export function NovelIssueCard({
  deduction,
  isActive,
  onAddToGraph,
  onAcceptOnce,
  onReject,
}: NovelIssueCardProps) {
  const borderClass = isActive ? 'border-accent' : 'border-border'

  return (
    <div
      className={[
        'border rounded-md bg-surface-raised px-4 py-3 space-y-2 transition-[border-color] duration-300',
        borderClass,
      ].join(' ')}
    >
      {/* Novel header */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs tracking-widest text-warning uppercase">
          novel issue
        </span>
        <span className="text-sm font-mono text-danger shrink-0">
          &minus;{deduction.points_deducted} pt{deduction.points_deducted !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Rubric item + reason */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-secondary shrink-0">
          {deduction.rubric_item_id.replace(/^rubric[-_]?/i, 'R')}
        </span>
        <span className="text-sm font-semibold text-primary truncate">
          {deduction.rubric_item_id}
        </span>
      </div>
      <p className="text-[13px] text-secondary leading-snug">{deduction.reason}</p>

      {/* Quote block */}
      {deduction.location.quote && (
        <div className="font-mono text-xs bg-surface rounded-sm px-2 py-1 text-secondary border border-border">
          &ldquo;{deduction.location.quote}&rdquo;
          <span className="ml-2 text-tertiary">
            L{deduction.location.line_start}–{deduction.location.line_end}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAddToGraph(deduction.id)}
          className="text-[13px] font-medium bg-accent text-white rounded px-3 py-1 hover:opacity-90 transition-opacity"
        >
          Add to graph
        </button>
        <button
          onClick={() => onAcceptOnce(deduction.id)}
          className="text-[13px] text-secondary hover:text-primary transition-colors"
        >
          Accept once
        </button>
        <button
          onClick={() => onReject(deduction.id)}
          className="text-[13px] text-danger hover:underline transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
