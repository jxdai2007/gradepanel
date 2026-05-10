'use client'
import { useState } from 'react'

export interface ApprovalRubricItem {
  id: string
  description: string
  max_points: number
  matches: number[]
}

export interface ApprovalGateProps {
  submissionCount: number
  rubricItems: ApprovalRubricItem[]
  conceptsByItem: Record<string, string[]>
  totalConcepts: number
  onConfirm: (
    rubricItems: Array<{ id: string; description: string; max_points: number }>,
    concepts: string[]
  ) => Promise<void>
  onDiscard: () => void
}

export function ApprovalGate({
  submissionCount,
  rubricItems,
  conceptsByItem,
  totalConcepts,
  onConfirm,
  onDiscard,
}: ApprovalGateProps) {
  const [items, setItems] = useState<ApprovalRubricItem[]>(rubricItems)
  const [saving, setSaving] = useState(false)

  function updateDescription(id: string, description: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    )
  }

  async function handleConfirm() {
    setSaving(true)
    const allConcepts = [...new Set(Object.values(conceptsByItem).flat())]
    await onConfirm(
      items.map(({ id, description, max_points }) => ({ id, description, max_points })),
      allConcepts
    )
    setSaving(false)
  }

  // All concepts flat, deduped
  const allConcepts = [...new Set(Object.values(conceptsByItem).flat())]
  const displayConcepts = allConcepts.slice(0, 12)
  const overflow = allConcepts.length - displayConcepts.length

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div>
        <p className="text-[15px] font-semibold text-primary">
          {submissionCount} submission{submissionCount !== 1 ? 's' : ''} parsed
          {' · '}
          {items.length} rubric item{items.length !== 1 ? 's' : ''} inferred
          {' · '}
          {totalConcepts} concept{totalConcepts !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Rubric table */}
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface text-tertiary text-[11px] uppercase tracking-widest">
              <th className="px-3 py-2 text-left font-medium w-8">ID</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium w-20">Max pts</th>
              <th className="px-3 py-2 text-right font-medium w-16">Hits</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const hits = item.matches.length
              const hitsClass =
                hits >= 10
                  ? 'font-bold text-primary'
                  : hits <= 2
                    ? 'text-tertiary'
                    : 'text-secondary'
              const rowBg = idx % 2 === 0 ? 'bg-surface-raised' : 'bg-surface'
              return (
                <tr key={item.id} className={`${rowBg} border-b border-border last:border-0`}>
                  <td className="px-3 py-2 font-mono text-[11px] text-tertiary align-top pt-3">
                    {item.id}
                  </td>
                  <td className="px-3 py-2">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        updateDescription(item.id, e.currentTarget.textContent ?? '')
                      }
                      className="outline-none text-primary min-w-0 focus:text-accent"
                    >
                      {item.description}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-secondary align-top pt-3">
                    {item.max_points}
                  </td>
                  <td className={`px-3 py-2 text-right align-top pt-3 ${hitsClass}`}>
                    {hits}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Concept tags */}
      {allConcepts.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {displayConcepts.map((c) => (
            <span
              key={c}
              className="text-[11px] text-secondary bg-surface-raised border border-border rounded px-2 py-0.5"
            >
              {c}
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-[11px] text-tertiary">+{overflow} more</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="px-4 py-2 text-[13px] font-medium bg-accent text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Confirm and build graph'}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="px-4 py-2 text-[13px] font-medium border border-border text-secondary rounded-md hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
        >
          Discard and re-upload
        </button>
      </div>
    </div>
  )
}
