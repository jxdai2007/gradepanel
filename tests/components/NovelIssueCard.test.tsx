import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NovelIssueCard } from '@/app/components/NovelIssueCard'
import type { UIDeduction } from '@/app/types'

const deduction: UIDeduction = {
  id: 'novel-0',
  rubric_item_id: 'R3',
  points_deducted: 1,
  location: { line_start: 7, line_end: 7, quote: 'convergence not justified' },
  reason: 'Convergence argument is novel — not in rubric',
  isNovel: true,
}

describe('NovelIssueCard', () => {
  it('renders NOVEL ISSUE header', () => {
    render(
      <NovelIssueCard
        deduction={deduction}
        onAddToGraph={vi.fn()}
        onAcceptOnce={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/novel issue/i)).toBeTruthy()
  })

  it('renders reason', () => {
    render(
      <NovelIssueCard
        deduction={deduction}
        onAddToGraph={vi.fn()}
        onAcceptOnce={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/Convergence argument is novel/i)).toBeTruthy()
  })

  it('renders Add to graph, Accept once, Reject buttons', () => {
    render(
      <NovelIssueCard
        deduction={deduction}
        onAddToGraph={vi.fn()}
        onAcceptOnce={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/Add to graph/i)).toBeTruthy()
    expect(screen.getByText(/Accept once/i)).toBeTruthy()
    expect(screen.getByText(/Reject/i)).toBeTruthy()
  })
})
