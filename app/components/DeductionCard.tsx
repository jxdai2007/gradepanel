'use client'
import { useRef } from 'react'
import type { UIDeduction, PrecedentMeta, ModelAgreement } from '@/app/types'

export interface DeductionCardProps {
  deduction: UIDeduction
  precedentMeta?: PrecedentMeta
  modelAgreement?: ModelAgreement
  isActive?: boolean
  onAccept: (id: string) => void
  onEdit: (id: string) => void
  onReject: (id: string) => void
}

export function DeductionCard({
  deduction,
  precedentMeta,
  modelAgreement,
  isActive,
  onAccept,
  onEdit,
  onReject,
}: DeductionCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Short rubric code from rubric_item_id (e.g. "rubric-1" → "R1", "R2a" → "R2a")
  const shortcode = deduction.rubric_item_id.replace(/^rubric[-_]?/i, 'R')

  const borderClass = isActive
    ? 'border-accent'
    : 'border-border'

  return (
    <div
      ref={cardRef}
      className={[
        'border rounded-md bg-surface-raised px-4 py-3 space-y-2 transition-[border-color] duration-300',
        borderClass,
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-secondary shrink-0">{shortcode}</span>
          <span className="text-sm font-semibold text-primary truncate">
            {deduction.rubric_item_id}
          </span>
        </div>
        <span className="text-sm font-mono text-danger shrink-0">
          &minus;{deduction.points_deducted} pt{deduction.points_deducted !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reason */}
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

      {/* Model agreement */}
      {modelAgreement && (
        <div className="flex gap-2">
          {(
            [
              { key: 'gpt', label: 'gpt' },
              { key: 'cld', label: 'cld' },
              { key: 'gem', label: 'gem' },
            ] as const
          ).map(({ key, label }) => (
            <span
              key={key}
              className={[
                'text-[11px] font-mono rounded px-1.5 py-0.5 border',
                modelAgreement[key]
                  ? 'border-success text-success bg-success-subtle'
                  : 'border-danger text-danger bg-danger-subtle',
              ].join(' ')}
            >
              {label} {modelAgreement[key] ? '✓' : '✗'}
            </span>
          ))}
        </div>
      )}

      {/* Precedent row */}
      {precedentMeta && (
        <p className="text-xs text-secondary">
          {precedentMeta.tier1Count + precedentMeta.tier2Count} cases
          {precedentMeta.concept ? ` · ${precedentMeta.concept}` : ''}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAccept(deduction.id)}
          className="text-[13px] text-success hover:underline transition-colors"
        >
          Accept [A]
        </button>
        <button
          onClick={() => onEdit(deduction.id)}
          className="text-[13px] text-secondary hover:text-primary transition-colors"
        >
          Edit [E]
        </button>
        <button
          onClick={() => onReject(deduction.id)}
          className="text-[13px] text-danger hover:underline transition-colors"
        >
          Reject [R]
        </button>
      </div>
    </div>
  )
}
